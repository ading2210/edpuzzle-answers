# Copyright (C) 2023 ading2210
# see README.md for more information

from flask import Flask, redirect, request, Response, render_template, jsonify
from flask_compress import Compress
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from werkzeug.middleware.proxy_fix import ProxyFix
import profanity_check
from curl_cffi import requests
import random

from modules import exceptions, utils, captions, ai
import threading, time, json, os, hashlib, re
import pathlib

# ===== setup flask =====
print("Reading config...")
base_dir = pathlib.Path(__file__).resolve().parent
config_path = base_dir / "config" / "config.json"
cache_path = base_dir / "cache" / "cache.json"

config = json.loads(config_path.read_text())
cache = None
if cache_path.exists():
  cache = json.loads(cache_path.read_text())

#read config
utils.include_traceback = config["include_traceback"]
ai.config = config

# handle compression and rate limits
print("Preparing flask instance...")
app = Flask(__name__, static_folder="../dist", static_url_path="/")
limiter = Limiter(
  get_remote_address,
  app=app,
  storage_uri=config["limiter_storage_uri"],
  strategy="moving-window",
)

if config["gzip_responses"]:
  print("Response compression enabled.")
  app.config["COMPRESS_ALGORITHM"] = "gzip"
  app.config["COMPRESS_LEVEL"] = 9
  Compress(app)
else:
  print("Response compression disabled.")
CORS(app)

# flask proxy fix
if config["behind_proxy"]:
  app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_prefix=1)

# ===== tokens =====

current_tokens = {}

#process cache
if cache:
  current_tokens = cache["tokens"]
  for email, token in list(current_tokens.items()):
    for creds in config["teacher_creds"]:
      if creds["username"] == email:
        break
    else:
      del current_tokens[email]

def write_cache():
  global cache
  cache = {
    "tokens": current_tokens
  }
  cache_path.write_text(json.dumps(cache, indent=2))

def create_session():
  session = requests.Session(impersonate="chrome131")
  session.headers.update({
    "Content-Type": "application/json",
    "sec-ch-ua-platform": '"macOS"',
    "Referer": "https://edpuzzle.com/",
    "sec-ch-ua": '"Google Chrome";v="131", "Not-A.Brand";v="8", "Chromium";v="131"',
    "sec-ch-ua-mobile": "?0",
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "x-edpuzzle-preferred-language": "en",
    "x-edpuzzle-referrer": "https://edpuzzle.com/",
    "x-chrome-version": "131",
  })
  impersonate = "chrome131"
  return session

def account_login(creds):
  session = create_session()
  username = creds["username"]

  # check if our current token is ok
  current_token = current_tokens.get(username)
  if current_token:
    res = session.get(
      "https://edpuzzle.com/api/v3/users/me",
      cookies={
        "token": current_token,
      },
    )

    if res.ok:
      return current_token
    print(f"token probably expired for {username}")

  # Anti-cheat stuff
  home_res = session.get("https://edpuzzle.com/")  # get csrf cookie and later anti-bot test
  creds["role"] = "teacher"

  # CSRF
  csrf_res = session.get("https://edpuzzle.com/api/v3/csrf")
  csrf_token = csrf_res.json()["CSRFToken"]
  session.headers["x-csrf-token"] = csrf_token

  # Web version anti-bot
  # Credits to https://github.com/VillainsRule/Narwhal/blob/master/narwhal/narwhal.ts
  # Explanation: this seems to generate a hash from the main edpuzzle.com page which is disguised as the version
  md5 = hashlib.md5()
  md5.update(json.dumps(creds, separators=(",", ":")).encode())
  md5 = md5.hexdigest()[:4]

  decoded = home_res.content.decode().replace(" ", "")
  part = re.search(r'version:"(.*?)",', decoded).group(1)
  multiplier = int(part.split(".")[2]) + 10

  anti_cheat_token = int(time.time()) * multiplier
  session.headers["x-edpuzzle-web-version"] = f"{part}.{md5}{anti_cheat_token}"

  login_res = session.post(
    "https://edpuzzle.com/api/v3/users/login",
    data=json.dumps(creds, separators=(",", ":")),
    headers={
      "Content-Type": "application/json"
    }
  )
  if not login_res.ok:
    print(f"warning: auth failed for {username}")
    if username in current_tokens:
      del current_tokens[username]
    return

  print(f"login success for {username}")
  current_tokens[username] = login_res.cookies.get("token")
  write_cache()

def token_refresher():
  write_cache()
  while True:
    for creds in config["teacher_creds"]:
      account_login(creds)
      time.sleep(30) #30s between login attempts
    time.sleep(60*60) # 1 hr

# ===== utility functions =====

# handle 429
@app.errorhandler(429)
def handle_rate_limit(e):
  return utils.handle_exception(e, status_code=429)

# ===== api routes =====
@app.route("/api/captions/<id>")
@app.route("/api/captions/<id>/<language>")
@limiter.limit(config["rate_limit"]["captions"])
def get_captions(id, language="en"):
  try:
    timestamp = request.args.get("timestamp")
    count = request.args.get("count")

    c = captions.get_captions(id)
    return c

  except Exception as e:
    return utils.handle_exception(e)

@app.route("/api/models", methods=["GET"])
def get_models():
  return jsonify(ai.get_available_models())

@app.route("/api/generate", methods=["POST"])
@limiter.limit(config["rate_limit"]["generate"])
def generate():
  try:
    data = request.json
    if (
      "prompt" in data
      and config["profanity_filter"]
      and profanity_check.predict([data["prompt"]])[0]
    ):
      raise exceptions.BadRequestError(
        "This request may contain offensive language. As a result, it has been denied."
      )

    if not "prompt" in data:
      raise exceptions.BadRequestError("Missing required parameter 'prompt'.")

    for arg in data:
      if not arg in ["prompt", "model"]:
        raise exceptions.BadRequestError(f"Unknown parameter '{arg}'.")

    if len(data["prompt"]) > ai.max_length:
      raise exceptions.BadRequestError("Prompt too long.")
    
    if not "model" in data:
      raise exceptions.BadRequestError("Missing required parameter 'model'.")

    def generator():
      try:
        for chunk in ai.generate(data):
          if chunk == data["prompt"]:
            continue
          yield json.dumps(chunk) + "\n"
      except Exception as e:
        exception = utils.handle_exception(e)[0]
        exception["status_code"] = exception["status"]
        exception["status"] = "error"
        yield json.dumps(exception)

    return Response(
      generator(),
      content_type="text/event-stream",
      headers={"X-Accel-Buffering": "no"},
    )

  except Exception as e:
    return utils.handle_exception(e)

@app.route("/api/media/<media_id>")
@limiter.limit(config["rate_limit"]["media"])
def media_proxy(media_id):
  try:
    session = create_session()

    current_token = random.choice(list(current_tokens.values()))
    csrf_token = session.get("https://edpuzzle.com/api/v3/csrf").json()
    cookies = {
      "token": current_token,
      "edpuzzleCSRF": csrf_token["CSRFToken"],
    }

    res = session.get(f"https://edpuzzle.com/api/v3/media/{media_id}", cookies=cookies)

    if res.status_code != 200:
      raise exceptions.BadGatewayError(f"Got status code {res.status_code} from Edpuzzle")

    data = res.json()
    if data.get("error"):
      raise exceptions.BadGatewayError(f"Edpuzzle error: " + data["error"])

    return jsonify(data)

  except Exception as e:
    return utils.handle_exception(e)


@app.route("/")
def homepage():
  return render_template("index.html", dev_mode=config["dev_mode"], script_js=config["script.js"])

@app.route("/discord")
@app.route("/discord.html")
def discord():
  invite_url = f"https://discord.com/invite/{config['discord']}"
  return redirect(invite_url)


# run the server
if __name__ == "__main__":
  t = threading.Thread(target=token_refresher, daemon=True)
  t.start()

  print("Starting flask...")
  app.run(
    host="0.0.0.0",
    port=config["server_port"],
    threaded=True,
    debug=config["dev_mode"],
  )
