#Copyright (C) 2023 ading2210
#see README.md for more information

#some functions to interface with the invidious api

import requests
import re
import time
import queue
import threading
import urllib3
from lxml import etree
from modules import exceptions

cache = {"updated": 0, "instances_sorted": []}

def test_instance_thread(instance, finished, counter):
  try:
    captions = get_captions_attempt(instance["uri"], "dQw4w9WgXcQ", language="en", timeout=4)
    if len(captions) == 0:
      raise exceptions.BadGatewayError()
  except:
    return
  finished.append(instance)

def test_instances():
  refresh_cache()
  instances = cache["instances"]

  finished = []
  for i, instance in enumerate(instances):
    #todo: use multiprocessing so that we don't have threads left over
    thread = threading.Thread(
      target=test_instance_thread, 
      args=(instance, finished, i),
      daemon=True
    )
    thread.start()
  
  start_time = time.time()
  while time.time() < start_time + 5:
    if len(finished) == len(instances):
      break
    time.sleep(0.1)
  
  cache["instances_sorted"] = finished
  return finished

def get_instances(api=True):
  url = "https://api.invidious.io/instances.json?pretty=1&sort_by=type,users"
  r = requests.get(url)
  data = r.json()
  
  if api:
    data = list(filter(lambda x: x[1]["api"], data))
  
  output = []
  for item in data:
    output.append(item[1])
  return output

def refresh_cache():
  cache["instances"] = get_instances();
  cache["updated"] = time.time();

def process_timestamp(timestamp_str):
  regex = "(\d{2}):(\d{2}):(\d{2})\.(\d{3})"
  timestamp_split = re.findall(regex, timestamp_str)[0]
  timestamp = int(timestamp_split[0])*3600
  timestamp += int(timestamp_split[1])*60
  timestamp += int(timestamp_split[2])
  timestamp += int(timestamp_split[3])/1000
  
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

def get_captions(id, language=None, timestamp=None, count=None):
  if timestamp != None:
    timestamp = float(timestamp)
  if count != None:
    count = int(count)
  

  return {
    "source": "",
    "captions": [
      {
        "timestamp": "00",
        "duration": "5",
        "text": "test"
      }
    ]
  }

def get_captions_attempt(base_url, id, language=None, timeout=None):
  if language:
    url = f"{base_url}/api/v1/captions/{id}?lang={language}"
  else:
    url = f"{base_url}/api/v1/captions/{id}"
    
  r = requests.get(url, timeout=timeout)
  if r.status_code != 200:
    raise exceptions.BadGatewayError(f"{url} returned status code {r.status_code}")
  elif "<title>Sorry...</title>" in r.text:
    raise exceptions.BadGatewayError(f"{url} was rate limited")
  
  #if r.headers["content-type"].startswith("application/json"):
  #  return r.json()
  
  #parse webvtt
  if r.text.startswith("WEBVTT"):
    captions = []
    captions_split = re.split(r"\d{2}:\d{2}:\d{2}\.\d{3} --> \d{2}:\d{2}:\d{2}\.\d{3}", r.text)
    captions_timestamps = re.findall(r"(\d{2}:\d{2}:\d{2}\.\d{3}) --> (\d{2}:\d{2}:\d{2}\.\d{3})", r.text)
    for i in range(len(captions_timestamps)):
      start = process_timestamp(captions_timestamps[i][0])
      end = process_timestamp(captions_timestamps[i][1])
      duration = round(end - start, 3)
      text = captions_split[i+1].strip()

      caption = {
        "timestamp": start,
        "duration": duration,
        "text": text
      }
      captions.append(caption)
      
    return captions
  
  #parse xml
  else:
    document = etree.fromstring(r.content)
    body = document.find("body")
  
    captions = []
    for child in body.iterchildren():
      caption = {
        "timestamp": float(child.get("t"))/1000,
        "duration": float(child.get("d"))/1000,
        "text": child.text
      }
      
      captions.append(caption)
  
    return captions