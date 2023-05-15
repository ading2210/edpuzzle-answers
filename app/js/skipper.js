//Copyright (C) 2023 ading2210
//see README.md for more information

class video_skipper {

static {
  skipper_loaded = true;
  skipper_button.disabled = !content_loaded; 
}

static async skip_video(csrf=null, attempt=null, update_button=true) {
  if (update_button) {
    skipper_button.value = "Skipping video...";
    skipper_button.disabled = true;
  }

  if (!csrf) csrf = await get_csrf();
  if (!attempt) attempt = await get_attempt(csrf);
  await this.post_watchtime(csrf, attempt);

  if (update_button) {
    skipper_button.value = "Video skipped successfully.";
    opener.location.reload();
  }
}

static async post_watchtime(csrf, attempt) {
  let id = attempt._id;
  let teacher_assignment_id = attempt.teacherAssignmentId;
  let referrer = "https://edpuzzle.com/assignments/"+ teacher_assignment_id +"/watch";;
  let watch_url = "https://edpuzzle.com/api/v4/media_attempts/" + id + "/watch";

  let content = {"timeIntervalNumber": 10};
  let headers = {
    "accept": "application/json, text/plain, */*",
    "accept_language": "en-US,en;q=0.9",
    "content-type": "application/json",
    "x-csrf-token": csrf,
    "x-edpuzzle-referrer": referrer,
    "x-edpuzzle-web-version": edpuzzle_data.version
  }
  await fetch(watch_url, {
    method: "POST",
    headers: headers,
    body: JSON.stringify(content)
  });
}

}