//Copyright (C) 2023 ading2210
//see README.md for more information

import { content_loaded, construct_headers, get_attempt, assignment_mode } from "./main.js";

export var skipper_loaded = false;

export class video_skipper {

static {
  skipper_loaded = true;
  skipper_button.disabled = !content_loaded; 
}

static async skip_video(attempt=null, update_button=true) {
  if (update_button) {
    skipper_button.value = "Skipping video...";
    skipper_button.disabled = true;
  }

  if (!attempt) attempt = await get_attempt();
  await this.post_watchtime(attempt);

  if (update_button) {
    skipper_button.value = "Video skipped successfully.";
    opener.location.reload();
  }
}

static async post_watchtime(attempt) {
  let id = attempt._id || attempt.id;
  
  let watch_url = `https://edpuzzle.com/api/v4/media_attempts/${id}/watch`;
  if (assignment_mode === "new") {
    watch_url = `https://edpuzzle.com/api/v3/learning/time_intervals/submission/${id}/watch`;
  }

  let content = {"timeIntervalNumber": 10};
  await fetch(watch_url, {
    method: "POST",
    headers: await construct_headers(),
    body: JSON.stringify(content)
  });
}

}