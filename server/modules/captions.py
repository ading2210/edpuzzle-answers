#Copyright (C) 2025 ading2210
#see README.md for more information

import re
import random
import functools

from curl_cffi import requests

from modules import exceptions

def process_timestamp(timestamp_str):
  regex = "(\d{2}):(\d{2}):(\d{2})"
  timestamp_split = re.findall(regex, timestamp_str)[0]
  timestamp = int(timestamp_split[0])*3600
  timestamp += int(timestamp_split[1])*60
  timestamp += int(timestamp_split[2])
  
  return timestamp
  
def truncate_captions(captions, timestamp=None, count=None):
  if timestamp == None:
    return captions

  for i in range(len(captions)):
    caption = captions[i]
    if timestamp < caption["timestamp"]:
      if count == None:
        return captions[:i+1]
      return captions[max(0, i-count+1):i+1]
  
  return captions

def get_captions(id, timestamp=None, count=None):
  if timestamp != None:
    timestamp = float(timestamp)
  if count != None:
    count = int(count)

  #todo - select captions language in the ui
  captions = get_captions_attempt(id)
  captions = truncate_captions(captions, timestamp, count)
      
  returned = {
    "captions": captions
  }
  return returned

@functools.lru_cache(maxsize=1024)
def get_captions_attempt(id):
  session = requests.Session(impersonate="chrome")
  session.cookies.update({
    "is_first_visit": "true",
    "anonymous_user_id": "".join(random.choices("1234567890abcdef", k=32))
  })
  r1 = session.get("https://notegpt.io/user/v2/userinfo")
  r2 = session.get(f"https://notegpt.io/api/v2/video-transcript?platform=youtube&video_id={id}")
  
  data = r2.json()["data"]
  transcript = list(data["transcripts"].values())[0]
  captions_data = transcript.get("custom") or transcript.get("default") or transcript.get("auto")
  captions = []

  for caption_data in captions_data:
    start = process_timestamp(caption_data["start"])
    end = process_timestamp(caption_data["end"])
    caption = {
      "timestamp": start,
      "duration": end - start,
      "text": caption_data["text"]
    }
    captions.append(caption)
  
  return captions