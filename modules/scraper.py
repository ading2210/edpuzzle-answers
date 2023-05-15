#Copyright (C) 2023 ading2210
#see README.md for more information

import requests, re, random, time, string, hashlib, json, queue, threading, inspect, types, poe
from revChatGPT import V1 as chatgpt_api
from modules import exceptions, utils

proxy_cache = {
  "updated": 0,
  "proxies": []
}
config = {}

#note that the default service is always the first one
services = ["ChatGPT", "Poe", "DeepAI", "Hubble", "InferKit", "TextSynth"]
disabled_services = []

def inspect_func(func):
  argspec = inspect.getfullargspec(func)
  args = []
  args_str = []
  
  for arg in argspec.args:
    if arg == "self": continue
    args.append({"name": arg})
    args_str.append(arg)
  
  if argspec.defaults != None:
    for i in range(len(argspec.defaults)):
      default = argspec.defaults[::-1][i]
      args[::-1][i]["default"] = default
    
  for key in argspec.annotations:
    index = args_str.index(key)
    args[index]["annotation"] = argspec.annotations[key].__name__
  
  return args

def resolve_service(service_name):
  service = globals()[service_name]
  arg_specs = inspect_func(service.generate_text)
  
  service_dict = {
    "args": arg_specs,
    "streaming": service.streaming_supported,
    "models": False,
    "proxy": service.proxy_requests,
    "max_length": service.max_length,
    "name": service_name,
    "disabled": service_name in disabled_services
  }
  if hasattr(service, "models"):
    service_dict["models"] = service.models
    
  return service_dict

def resolve_services():
  services_list = []
  for service_name in services:
    services_list.append(resolve_service(service_name))
    
  return services_list

def scrape_proxies():
  proxies_url = "https://raw.githubusercontent.com/mertguvencli/http-proxy-list/main/proxy-list/data.txt"
  r = requests.get(proxies_url)
  lines = r.text.split("\n")
  proxy_cache["proxies"] = lines
  proxy_cache["updated"] = time.time()
  return lines

def get_proxies():
  current_time = time.time()
  if current_time-proxy_cache["updated"] >= 300:
    return scrape_proxies()
  return proxy_cache["proxies"]

def construct_proxy(proxy):
  if proxy:
    return {
      "https": f"http://{proxy}",
      "http": f"http://{proxy}"
    }
  return None

def test_proxy(proxy, finish_queue, counter):
  proxies = construct_proxy(proxy)
  ignored_exceptions = (
    requests.exceptions.SSLError,
    requests.exceptions.ConnectTimeout,
    requests.exceptions.ProxyError
  )
  try:
    r = requests.get("https://ifconfig.me/ip", proxies=proxies, timeout=4)
  except requests.exceptions.ReadTimeout:
    pass
  except ignored_exceptions as e:
    return
  finish_queue.put((counter, proxy))

def select_proxy(sample=10):
  proxies = get_proxies()
  finish_queue = queue.Queue()
  counter = 0
  for proxy in random.sample(proxies, k=10):
    #todo: use multiprocessing so that we don't have threads left over
    thread = threading.Thread(
      target=test_proxy, 
      args=(proxy, finish_queue, counter),
      daemon=True
    )
    thread.start()
    counter += 1
  
  try:
    return finish_queue.get(block=True, timeout=10)[1]
  except queue.Empty:
    return random.choice(proxies)

def get_generator(service_name, *args, **kwargs):
  service = None
  try:
    service_cls = globals()[service_name]
    cls_args = []
    if service_cls.proxy_requests:
      yield {"status": "proxy"}
      cls_args.append(select_proxy())
    
    yield {"status": "init"}
    service = service_cls(*cls_args)

    yield {"status": "waiting"}
    result = service.generate_text(*args, **kwargs)
    
    for i, chunk in enumerate(result):
      if i == 0: yield {"status": "generating"}
      yield {"text": chunk}
    
    if service and hasattr(service, "clean_up") and callable(service.clean_up):
      service.clean_up()

    yield {"status": "done"}

  except GeneratorExit:
    if service and hasattr(service, "clean_up") and callable(service.clean_up):
      print("Connection closed!")
      service.clean_up()

class Poe:
  streaming_supported = True
  proxy_requests = False
  max_length = 3000
  client = None

  def __init__(self):
    self.api_key = config["poe"]["token"]

    if not self.client: 
      self.client = poe.Client(self.api_key)
      self.__class__.client = self.client

  def generate_text(self, prompt:str, stream:bool=False, model="capybara"):
    for chunk in self.client.send_message(model, prompt, send_chat_break=True):
      if stream:
        yield chunk["text_new"]
    
    if not stream:
      yield chunk["text"]
    
    self.client.purge_conversation(model)


class ChatGPT:
  streaming_supported = True
  proxy_requests = False
  max_length = 3000

  def __init__(self):
    self.api_key = config["chatgpt"]["token"]
    self.chatbot = chatgpt_api.Chatbot({"access_token": self.api_key})
    self.conversation_name = config["chatgpt"]["conversation_name"]

  def generate_text(self, prompt:str, stream:bool=False):
    if stream:
      old_message = ""
      for response in self.chatbot.ask(prompt):
        new_text = response["message"][len(old_message):]
        old_message = response["message"]
        if old_message == prompt:
          continue

        yield new_text #only yield newest text

    else:
      for response in self.chatbot.ask(prompt):
        pass
      yield response["message"]
    
    self.chatbot.change_title(response["conversation_id"], self.conversation_name)

    for conversation in self.chatbot.get_conversations():
      if conversation["title"] == self.conversation_name:
        self.chatbot.delete_conversation(conversation["id"])

class Hubble:
  api_url = "https://www.hubble.ai/api/creator/executeSchema"
  streaming_supported = False
  proxy_requests = True
  max_length = 3000

  def __init__(self, proxy=None):
    self.proxy = proxy
  
  def generate_text(self, prompt:str, details:str=""):
    payload = {
      "optional_variables": {},
      "required_variables": {
        "Essay-Details": details,
        "Essay-Prompt": prompt
      },
      "schema_id": 109
    }
    
    r = requests.post(self.api_url, json=payload)
    if r.status_code != 200:
      raise exceptions.BadGatewayError("Sevice returned an error: "+r.json()["error"])
    result = r.json()["node_outputs"][0]["output_data"].strip()

    yield result

class InferKit:
  api_url = "https://api.inferkit.com/v1/models/standard/generate?useDemoCredits=true"
  streaming_supported = True
  proxy_requests = True
  max_length = 3000
  
  def __init__(self, proxy=None):
    self.proxy = proxy
  
  def generate_text_stream(self, *args, **kwargs):
    r = requests.post(*args, **kwargs, stream=True)
    r.raise_for_status()  
      
    for chunk in r.iter_content(chunk_size=None):
      text = chunk.decode()
      text_split = text.split("\n")
      for string in text_split:
        if len(string.strip()) == 0:
          continue
        data = json.loads(string)["data"]
        if not data["isFinalChunk"]:
          yield data["text"]
  
  def generate_text(self, prompt, max_chars:int=400, stream:bool=False):
    proxies = construct_proxy(self.proxy)
    prompt = prompt[::-1][:3000][::-1] #truncate text to 3000 characters
    payload = {
      "length": min(max_chars, 400), #dont generate more than 400 chars so we don't run out too quickly
      "prompt": {
        "text": prompt
      },
      "streamResponse": stream
    }
    
    if stream:
      for chunk in self.generate_text_stream(self.api_url, json=payload, proxies=proxies):
        yield chunk
    else:
      r = requests.post(self.api_url, json=payload, proxies=proxies)
      r.raise_for_status()
      yield r.json()["data"]["text"]

class TextSynth:
  api_url = "https://api.textsynth.com/v1/engines/{model}/completions"
  key_url = "https://textsynth.com/playground.html"
  streaming_supported = True
  proxy_requests = True
  models = ["gptj_6B", "fairseq_gpt_13B", "gptneox_20B"]
  max_length = 3000
  
  def __init__(self, proxy=None):
    self.proxy = proxy
    self.api_key = self.get_api_key() 
  
  def get_api_key(self):
    proxies = construct_proxy(self.proxy)
    r = requests.get(self.key_url, proxies=proxies)
    regex = r'<script>var textsynth_api_key = "([0-9a-f]+?)"</script>'
    return re.findall(regex, r.text)[0]
  
  def generate_text_stream(self, *args, **kwargs):
    r = requests.post(*args, **kwargs, stream=True)
    r.raise_for_status()  
      
    for chunk in r.iter_content(chunk_size=None):
      text = chunk.decode()
      text_split = text.split("\n")
      for string in text_split:
        if len(string.strip()) == 0:
          continue
        data = json.loads(string)
        if not data["reached_end"]:
          yield data["text"]
  
  def generate_text(self, prompt, max_tokens:int=100, stream:bool=False, model:str="gptneox_20B"):
    if not model in self.models:
      raise KeyError("Model not valid.")
    url = self.api_url.format(model=model)
      
    headers = {
      "authorization": f"Bearer {self.api_key}",
    }
    payload = {
      "prompt": prompt,
      "stream": stream,
      "max_tokens": max_tokens
    }
    proxies = construct_proxy(self.proxy)
    
    if stream:
      for text in self.generate_text_stream(url, headers=headers, json=payload, proxies=proxies):
        yield text
    else:
      r = requests.post(url, headers=headers, json=payload, proxies=proxies)
      r.raise_for_status()
      text = r.json()["text"]
      yield text

class DeepAI:
  api_url = "https://api.deepai.org/chat_response"
  streaming_supported = True
  proxy_requests = True
  max_length = 3000
  
  def __init__(self, proxy=None):
    self.proxy = proxy
    self.user_agent = "".join(random.choices(string.ascii_lowercase, k=30))
    self.api_key = self.get_api_key()
  
  def md5(self, text):
    return hashlib.md5(text.encode()).hexdigest()[::-1]

  def get_api_key(self):
    part1 = str(random.randint(0, 10**11))
    part2 = self.md5(self.user_agent+self.md5(self.user_agent+self.md5(self.user_agent+part1)))
    return f"tryit-{part1}-{part2}"

  def generate_text(self, prompt:str, stream:bool=True):
    headers = {
      "api-key": self.api_key,
      "user-agent": self.user_agent
    }
    chat_history = [
      {
        "role": "user", 
        "content": prompt
      }
    ]
    files = {
      "chat_style": (None, "chat"),
      "chatHistory": (None, json.dumps(chat_history))
    }
    payload = {
      "chat_style": "chat",
      "chatHistory": [
        {
          "role": "user", 
          "content": prompt
        }
      ]
    }

    proxies = construct_proxy(self.proxy)
    r = requests.post(self.api_url, headers=headers, files=files, proxies=proxies, stream=stream)
    r.raise_for_status()
    
    if stream:
      for chunk in r.iter_content(chunk_size=None):
        r.raise_for_status()
        yield chunk.decode()
    else:
      yield r.text

services_full = resolve_services();

if __name__ == "__main__":
  chatbot = ChatGPT.create_from_config()
  for chunk in chatbot.generate_text("summarize the GNU GPL v3."):
    print(chunk)