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

def get_generator(service_cls, *args, **kwargs):
  service = None
  try:
    cls_args = []
    
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
  max_length = 3000
  models = ["llama-3-8b-instruct", "mistral-7b-instruct", "llama-2-7b-chat-int8"]

  def generate_text(self, prompt:str, model:str="llama-2-7b-chat-int8"):
    cf_config = config["cloudflare"]
    models_dict = {
      "llama-3-8b-instruct": "@cf/meta/llama-3-8b-instruct",
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
    
class Vercel:
  streaming_supported = True
  max_length = 3000
  models = ["gpt-3.5-turbo"]

  def __init__(self):
    self.client = vercel_ai.Client()

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
  max_length = 3000
  models = ["gpt-3.5-turbo"]
  
  def __init__(self):
    self.user_agent = "".join(random.choices(string.ascii_lowercase, k=30))
    self.api_key = self.get_api_key()
  
  def md5(self, text):
    return hashlib.md5(text.encode()).hexdigest()[::-1]

  def get_api_key(self):
    part1 = str(random.randint(0, 10**11))
    part2 = self.md5(self.user_agent+self.md5(self.user_agent+self.md5(self.user_agent+part1+"x")))
    return f"tryit-{part1}-{part2}"

  def generate_text(self, prompt:str, stream:bool=True, model="gpt-3.5-turbo"):
    headers = {
      "api-key": self.api_key,
      "User-Agent": self.user_agent
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

    r = requests.post(self.api_url, headers=headers, files=files, stream=stream)
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
  "Vercel": Vercel
}
disabled_services = []
