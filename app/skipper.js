//Copyright (C) 2023 ading2210
//see README.md for more information

import { fetch_with_auth, content_loaded, construct_headers, get_attempt, assignment_mode } from "./main.js";

skipper_button.disabled = !content_loaded; 

export async function skip_video(attempt=null, update_button=true) {
  if (update_button) {
    skipper_button.value = "Skipping video...";
    skipper_button.disabled = true;
  }

  if (!attempt) attempt = await get_attempt();
  await post_watchtime(attempt);

  if (update_button) {
    skipper_button.value = "Video skipped successfully.";
    opener.location.reload();
  }
}

async function post_watchtime(attempt) {
  let id = attempt._id || attempt.id;
  
  let watch_url = `https://edpuzzle.com/api/v4/media_attempts/${id}/watch`;
  if (assignment_mode === "new") {
    watch_url = `https://edpuzzle.com/api/v3/learning/time_intervals/submission/${id}/watch`;
  }

  let content = {"timeIntervalNumber": 10};
  await fetch_with_auth(watch_url, {
    method: "POST",
    headers: await construct_headers(),
    body: JSON.stringify(content)
  });
}
