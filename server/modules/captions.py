from youtube_transcript_api import YouTubeTranscriptApi

ytt_api = YouTubeTranscriptApi()
print(ytt_api.fetch("dQw4w9WgXcQ").snippets)