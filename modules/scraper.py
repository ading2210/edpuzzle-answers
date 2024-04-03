#Copyright (C) 2023 ading2210
#see README.md for more information

import requests, re, random, time, string, hashlib, json, queue, threading, inspect, types
from modules import exceptions, utils
import vercel_ai
import google.generativeai as google_ai

proxy_cache = {
  "updated": 0,
  "proxies": []
}
config = {}

def scrape_proxies(thread_count=200):
  print("Refreshing proxy cache...")

  proxies_url = "https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/socks5.txt"
  r = requests.get(proxies_url)
  lines = r.text.split("\n")
  
  tested_proxies = []
  def thread_func():
    while lines:
      proxy = lines.pop().strip()
      if not proxy: continue
      ping = test_proxy(proxy)

      if ping == -1: continue
      tested_proxies.append([ping, proxy])
  
  threads = []
  for i in range(thread_count):
    t = threading.Thread(target=thread_func, daemon=True)
    t.start()
    threads.append(t)
  
  for thread in threads:
    thread.join()
  
  proxy_cache["proxies"] = tested_proxies
  proxy_cache["updated"] = time.time()
  return tested_proxies

def get_proxies():
  current_time = time.time()
  if proxy_cache["updated"] == 0:
    while not proxy_cache["updated"]:
      time.sleep(0.1)
  return proxy_cache["proxies"]

def construct_proxy(proxy):
  if not proxy:
    return None
  
  return {
    "https": f"socks5h://{proxy}",
    "http": f"socks5h://{proxy}"
  }


def test_proxy(proxy):
  proxies = construct_proxy(proxy)
  ignored_exceptions = (
    requests.exceptions.SSLError,
    requests.exceptions.ConnectTimeout,
    requests.exceptions.ProxyError,
    requests.exceptions.ConnectionError,
    requests.exceptions.ReadTimeout
  )
  try:
    start = time.time()
    r = requests.get("https://google.com/", proxies=proxies, timeout=1, allow_redirects=False)
    end = time.time()
  except ignored_exceptions as e:
    return -1
  
  return end-start

def select_proxy():
  proxies = get_proxies()
  proxy = random.choice(proxies)
  return proxy[1]

def get_generator(service_cls, *args, **kwargs):
  service = None
  try:
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

class Gemini:
  streaming_supported = False
  proxy_requests = False
  max_length = 3000
  models = ["gemini-1.0-pro"]

  def __init__(self):
    google_ai.configure(api_key=config["gemini"]["token"])

  def generate_text(self, prompt:str, model:str="gemini-1.0-pro"):
    model = google_ai.GenerativeModel(model)
    response = model.generate_content(prompt)

    yield response.text


class Cloudflare:
  streaming_supported = False
  proxy_requests = False
  max_length = 3000
  models = ["mistral-7b-instruct", "llama-2-7b-chat-int8"]

  def __init__(self):
    pass

  def generate_text(self, prompt:str, model:str="llama-2-7b-chat-int8"):
    cf_config = config["cloudflare"]
    models_dict = {
      "llama-2-7b-chat-int8": "@cf/meta/llama-2-7b-chat-int8",
      "mistral-7b-instruct": "@cf/mistral/mistral-7b-instruct-v0.1"
    }
    payload = {
      "messages": [
        {"role": "system", "content": "You are a friendly assistant"},
        {"role": "user", "content": prompt}
      ]
    }
    headers = {
      "Authorization": f'Bearer {cf_config["token"]}'
    }
    
    api_url = f'https://api.cloudflare.com/client/v4/accounts/{cf_config["account_id"]}/ai/run/{models_dict[model]}'
    r = requests.post(api_url, json=payload, headers=headers)
    r.raise_for_status()

    yield r.json()["result"]["response"]

class InferKit:
  api_url = "https://api.inferkit.com/v1/models/standard/generate?useDemoCredits=true"
  streaming_supported = True
  proxy_requests = True
  max_length = 3000
  models = False
  
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

class Vercel:
  streaming_supported = True
  proxy_requests = True
  max_length = 3000
  models = ["gpt-3.5-turbo"]

  def __init__(self, proxy=None):
    self.client = vercel_ai.Client(proxy=proxy)

  def generate_text(self, prompt:str, stream:bool=False, model="openai:gpt-3.5-turbo"):
    text = ""
    for chunk in self.client.generate(model, prompt):
      if stream:
        text += chunk
        yield chunk
    
    if not stream:
      yield text

class DeepAI:
  api_url = "https://api.deepai.org/hacking_is_a_serious_crime"
  streaming_supported = True
  proxy_requests = True
  max_length = 3000
  models = ["gpt-3.5-turbo"]
  
  def __init__(self, proxy=None):
    self.proxy = proxy
    self.user_agent = "".join(random.choices(string.ascii_lowercase, k=30))
    self.api_key = self.get_api_key()
  
  def md5(self, text):
    return hashlib.md5(text.encode()).hexdigest()[::-1]

  def get_api_key(self):
    part1 = str(random.randint(0, 10**11))
    part2 = self.md5(self.user_agent+self.md5(self.user_agent+self.md5(self.user_agent+part1+"x")))
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

    proxies = construct_proxy(self.proxy)
    r = requests.post(self.api_url, headers=headers, files=files, proxies=proxies, stream=stream)
    r.raise_for_status()
    
    if stream:
      for chunk in r.iter_content(chunk_size=None):
        r.raise_for_status()
        yield chunk.decode()
    else:
      yield r.text


#note that the default service is always the first one
services = {
  "Gemini": Gemini,
  "Cloudflare": Cloudflare,
  "DeepAI": DeepAI,
  "Vercel": Vercel,
  "InferKit": InferKit
}
disabled_services = []
