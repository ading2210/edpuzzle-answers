import requests
import json

max_length = float("inf")
config = {}

current_provider = "openrouter"

def get_available_models():
  # logic for service switcher will go here eventually
  return {"models": {model["name"]: model["model"] for model in config[current_provider]["models"]}}

def generate(data):
  question = data["prompt"]

  if current_provider == "openrouter":
    url = "https://openrouter.ai/api/v1/chat/completions"
    headers = {
      "Authorization": f"Bearer {config['openrouter']['key']}",
      "Content-Type": "application/json",
    }

    payload = {
      "model": data["model"],
      "messages": [{"role": "user", "content": question}],
      "stream": True,
    }
    buffer = ""

    yield {"status": "generating"}
    with requests.post(url, headers=headers, json=payload, stream=True) as r:
      for chunk in r.iter_content(chunk_size=1024, decode_unicode=True):
        buffer += chunk
        while True:
          # Find the next complete SSE line
          line_end = buffer.find("\n")
          if line_end == -1:
            break
          line = buffer[:line_end].strip()
          buffer = buffer[line_end + 1 :]
          if line.startswith("data: "):
            data = line[6:]
            if data == "[DONE]":
              break
            try:
              data_obj = json.loads(data)
              content = data_obj["choices"][0]["delta"].get("content")
              if content:
                yield {"text": content}
            except json.JSONDecodeError:
              pass

    yield {"status": "done"}