#Copyright (C) 2025 ading2210
#see README.md for more information

from google import genai
import json

max_length = float("inf")
config = {}

current_provider = "gemini"
client = None

def generate(data):
  global client
  if not client:
    client = genai.Client(api_key=config["gemini"]["key"])

  response = client.models.generate_content_stream(
    model=config["gemini"]["model"],
    contents=data["prompt"]
  )

  yield {"status": "generating"}
  for chunk in response:
    if chunk.text:
      yield {"text": chunk.text}
  yield {"status": "done"}

def get_available_models():
  return {"models": {config["gemini"]["model"]: config["gemini"]["model"]}}