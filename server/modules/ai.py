#Copyright (C) 2025 ading2210
#see README.md for more information

import google.generativeai as google_ai
import json

max_length = float("inf")
config = {}

current_provider = "gemini"

def generate(data):
  google_ai.configure(api_key=config["gemini"]["key"])
  model_name = config["gemini"]["model"]
  model = google_ai.GenerativeModel(model_name)

  response = model.generate_content(data["prompt"])
  yield {"status": "generating"}
  yield {"text": response.text}
  yield {"status": "done"}

def get_available_models():
  return {"models": {config["gemini"]["model"]: config["gemini"]["model"]}}