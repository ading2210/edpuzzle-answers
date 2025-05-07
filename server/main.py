# Copyright (C) 2023 ading2210
# see README.md for more information

from flask import (
    Flask,
    redirect,
    request,
    Response,
    render_template,
    jsonify,
)
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

# ===== setup flask =====
print("Reading config...")
base_dir = os.path.dirname(os.path.abspath(__file__))
with open(base_dir + "/config/config.json") as f:
    config = json.loads(f.read())
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
current_token = None


def token_refresher():
    global current_token
    while True:
        res = requests.get(
            "https://edpuzzle.com/api/v3/users/me",
            cookies={
                "token": current_token,
            },
        )
        if res.status_code != 200:
            # Not logged in
            sess = requests.Session()

            sess.headers.update(
                {
                    "Content-Type": "application/json",
                    "sec-ch-ua-platform": '"macOS"',
                    "Referer": "https://edpuzzle.com/",
                    "sec-ch-ua": '"Google Chrome";v="131", "Not-A.Brand";v="8", "Chromium";v="131"',
                    "sec-ch-ua-mobile": "?0",
                    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
                    "Accept": "application/json, text/plain, */*",
                    "x-edpuzzle-preferred-language": "en",
                    "Content-Type": "application/json",
                    "x-edpuzzle-referrer": "https://edpuzzle.com/",
                    "x-chrome-version": "131",
                    # "x-csrf-token": csrf_token,
                    # "x-edpuzzle-web-version": f"{part}.{md5}{antiCheatToken}",
                }
            )

            # Anti-cheat stuff
            home_res = sess.get(
                "https://edpuzzle.com/", impersonate="chrome131"
            )  # get csrf cookie and later anti-bot test

            creds = random.choice(config["teacher_creds"])
            creds["role"] = "teacher"

            # CSRF
            csrf_res = sess.get(
                "https://edpuzzle.com/api/v3/csrf", impersonate="chrome131"
            )
            csrf_token = csrf_res.json()["CSRFToken"]
            sess.headers["x-csrf-token"] = csrf_token

            # Web version anti-bot
            # Credits to https://github.com/VillainsRule/Narwhal/blob/master/narwhal/narwhal.ts
            # Explanation: this seems to generate a hash from the main edpuzzle.com page which is disguised as the version
            md5 = hashlib.md5()
            md5.update(json.dumps(creds, separators=(",", ":")).encode())
            md5 = md5.hexdigest()[:4]

            decoded = home_res.content.decode().replace(" ", "")
            part = re.search(r'version:"(.*?)",', decoded).group(1)
            multiplier = int(part.split(".")[2]) + 10

            antiCheatToken = int(time.time()) * multiplier

            sess.headers["x-edpuzzle-web-version"] = f"{part}.{md5}{antiCheatToken}"

            response = sess.post(
                "https://edpuzzle.com/api/v3/users/login",
                data=json.dumps(creds),
                impersonate="chrome131",
            )

            current_token = response.cookies.get("token")

            print("refreshed token")

        time.sleep(60*60)  # 1 hour


# ===== utility functions =====
# rate limit by ip and endpoint
def get_path_limit():
    path_args = request.view_args
    service = path_args.get("service")
    if service in config["rate_limits"]:
        return config["rate_limits"][service]
    return "1/second"  # fallback value, probably too high


# handle 429
@app.errorhandler(429)
def handle_rate_limit(e):
    return utils.handle_exception(e, status_code=429)


# ===== api routes =====
@app.route("/api/captions/<id>")
@app.route("/api/captions/<id>/<language>")
@limiter.limit("60/minute")
def get_captions(id, language="en"):
    try:
        timestamp = request.args.get("timestamp")
        count = request.args.get("count")

        c = captions.get_captions(id)
        return c

    except Exception as e:
        return utils.handle_exception(e)


@app.route("/api/generate", methods=["POST"])
@limiter.limit(get_path_limit)
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
            if not arg in ["prompt"]:
                raise exceptions.BadRequestError(f"Unknown parameter '{arg}'.")

        if len(data["prompt"]) > ai.max_length:
            raise exceptions.BadRequestError("Prompt too long.")

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
def media_proxy(media_id):
    url = f"https://edpuzzle.com/api/v3/media/{media_id}"
    csrf_token = requests.get("https://edpuzzle.com/api/v3/csrf").json()
    cookies = {
        "token": current_token,
        "edpuzzleCSRF": csrf_token["CSRFToken"],
    }

    res = requests.get(url, cookies=cookies, impersonate="chrome")

    if res.status_code != 200:
        return jsonify(
            {
                "success": False,
                "error": f"Got status code {res.status_code} from Edpuzzle",
            }
        )

    data = res.json()
    if data.get("error"):
        return jsonify({"success": False, "error": data["error"]})

    data["success"] = True

    return jsonify(data)


@app.route("/")
def homepage():
    return render_template("index.html", dev_mode=config["dev_mode"], script_js=config["script.js"])


@app.route("/discord")
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
