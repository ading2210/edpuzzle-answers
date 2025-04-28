#Copyright (C) 2023 ading2210
#see README.md for more information
from modules import exceptions, utils


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

class OpenAI:
  streaming_supported = False
  max_length = 3000
  models = ["gpt-4o-mini"]

  def __init__(self):
    # google_ai.configure(api_key=config["gemini"]["token"])
    pass

  def generate_text(self, prompt:str, token, model:str="gpt-4o-mini"):
    print(prompt)

    yield "whats up"

#note that the default service is always the first one
services = {
  "OpenAI": OpenAI,
}
disabled_services = []