#Copyright (C) 2023 ading2210
#see README.md for more information

from flask import Flask, redirect, request, Response, render_template, send_from_directory
from flask_compress import Compress
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from werkzeug.middleware.proxy_fix import ProxyFix
import profanity_check

from modules import exceptions, utils, invidious, scraper
import threading, time, json, os

#===== setup flask =====

print("Reading config...")
base_dir = os.path.dirname(os.path.abspath(__file__))
with open(base_dir+"/config/config.json") as f:
  config = json.loads(f.read())
utils.include_traceback = config["include_traceback"]
scraper.config = config
if not config["gemini"]["enabled"]:
  del scraper.services["Gemini"]
if not config["cloudflare"]["enabled"]:
  del scraper.services["Cloudflare"]
 


print("Generating CSS...")
css_path = base_dir+"/app/css"
os.system(f"tailwindcss -i {css_path}/popup.css -o {css_path}/dist.css -c {base_dir}/app/tailwind.config.js -m")

#handle compression and rate limits
print("Preparing flask instance...") 
app = Flask(__name__)
limiter = Limiter(
  get_remote_address, app=app, 
  storage_uri=config["limiter_storage_uri"],
  strategy="moving-window"
)

if config["gzip_responses"]:
  print("Response compression enabled.")
  app.config["COMPRESS_ALGORITHM"] = "gzip"
  app.config["COMPRESS_LEVEL"] = 9
  Compress(app)
else:
  print("Response compression disabled.")
CORS(app)

#flask proxy fix
if config["behind_proxy"]:
  app.wsgi_app = ProxyFix(
    app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_prefix=1
  )

#===== utility functions =====

#rate limit by ip and endpoint
def get_path_limit():
  path_args = request.view_args
  service = path_args.get("service")
  if service and service in scraper.services: 
    if service in config["rate_limits"]:
      return config["rate_limits"][service]
  return "1/second" #fallback value, probably too high

#handle 429
@app.errorhandler(429)
def handle_rate_limit(e):
  return utils.handle_exception(e, status_code=429)

#update invidious cache
def update_invidous_cache():
  while True:
    print("Refreshing invidious cache...")
    invidious.test_instances()
    time.sleep(30*60)

def update_proxy_cache():
  while True:
    print("Refreshing proxy cache...")
    scraper.scrape_proxies(thread_count=config["proxy_checker_threads"])
    time.sleep(30*60)

#===== flask routes =====

@app.route("/api/captions/<id>")
@app.route("/api/captions/<id>/<language>")
@limiter.limit("60/minute")
def get_captions(id, language="en"): 
  try:
    timestamp = request.args.get("timestamp")
    count = request.args.get("count")
    
    captions = invidious.get_captions(id, language, count=count, timestamp=timestamp)
    return captions

  except Exception as e:
    return utils.handle_exception(e)

@app.route("/api/services")
def resolve_services():
  response = []
  for name, service in scraper.services.items():
    response.append({
      "name": name,
      "models": service.models,
      "max_length": service.max_length,
      "streaming": service.streaming_supported
    })
  return response

@app.route("/api/generate/<service_name>", methods=["POST"])
@limiter.limit(get_path_limit)
def generate(service_name):
  print(service_name)
  try:
    if not service_name in scraper.services:
      raise exceptions.BadRequestError("Service does not exist.")
    service = scraper.services[service_name]

    args = []
    kwargs = {}
    data = request.json

    if "prompt" in data and config["profanity_filter"] and profanity_check.predict([data["prompt"]])[0]:
      raise exceptions.BadRequestError("This request may contain offensive language. As a result, it has been denied.")

    if not "prompt" in data:
      raise exceptions.BadRequestError("Missing required parameter 'prompt'.")
    if not "model" in data and service.models:
      raise exceptions.BadRequestError("Missing required parameter 'model'.")
    for arg in data:
      if not arg in ["prompt", "model"]:
        raise exceptions.BadRequestError(f"Unknown parameter '{arg}'.")
    
    if len(data["prompt"]) > service.max_length:
      raise exceptions.BadRequestError("Prompt too long.")

    def generator():
      try:
        for chunk in scraper.get_generator(service, **data):
          if chunk == data["prompt"]:
            continue
          yield json.dumps(chunk)+"\n"
      except Exception as e:
        exception = utils.handle_exception(e)[0]
        exception["status_code"] = exception["status"]
        exception["status"] = "error"
        yield json.dumps(exception)
    
    return Response(generator(), content_type="text/event-stream", headers={"X-Accel-Buffering": "no"})

  except Exception as e:
    return utils.handle_exception(e)

@app.route("/")
def homepage():
  return render_template("index.html", dev_mode=config["dev_mode"])

@app.route("/discord")
@app.route("/discord.html")
def discord():
  invite_url = f"https://discord.com/invite/{config['discord']}"
  return redirect(invite_url)

@app.route("/github")
def github():
  return redirect("https://github.com/ading2210/edpuzzle-answers")

@app.route("/script.js")
def loader_script():
  return send_from_directory("", "script.js")

@app.route("/static/<path:path>")
def serve_static(path):
  return send_from_directory("static", path)

@app.route("/app/<path:path>")
def serve_app(path):
  return send_from_directory("app", path)

#===== main func =====

#run the server
if __name__ == "__main__":
  t = threading.Thread(target=update_invidous_cache, daemon=True)
  t.start()

  t = threading.Thread(target=update_proxy_cache, daemon=True)
  t.start()
  
  print("Starting flask...")
  app.run(host="0.0.0.0", port=config["server_port"], threaded=True, debug=config["dev_mode"])