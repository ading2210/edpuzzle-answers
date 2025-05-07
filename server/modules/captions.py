import yt_dlp
import requests


class NoLogging:
    def debug(self, msg):
        if msg.startswith("[debug] "):
            pass
        else:
            self.info(msg)

    def info(self, msg):
        pass

    def warning(self, msg):
        pass

    def error(self, msg):
        print(msg)


ydl_opts = {
    "logger": NoLogging(),
    "writeautomaticsub": True,
    "subtitlesformat": "srt",
    "skip_download": True,
    # "outtmpl": "tmp.srt"
}


def get_captions(id):
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        data = ydl.extract_info(f"https://youtube.com/watch?v={id}", download=False)
    captions_json = data["automatic_captions"]["en"][0]

    captions = requests.get(captions_json["url"])
    if captions_json.get('protocol') == "m3u8_native":
        url = [line for line in captions.text.split("\n") if line.startswith("https://")][0]
        url = url.replace("fmt=vtt", "fmt=json3")
        print(url)
        captions = requests.get(url).json()

    else:
        captions = captions.json()

    captions_formatted = []

    for event in captions["events"]:
        if not event.get("segs"):
            continue

        text = "".join([seg["utf8"] for seg in event["segs"]])

        captions_formatted.append({
            "time": event["tStartMs"],
            "text": text
        })

    return {"captions": captions_formatted}
