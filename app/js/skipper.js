//Copyright (C) 2023 ading2210
//see README.md for more information

class video_skipper {

static {
  skipper_loaded = true;
  skipper_button.disabled = !content_loaded; 
}

static skip_video() {
  skipper_button.value = "Getting CSRF token...";
  skipper_button.disabled = true;

  get_csrf(function(csrf){
    this.get_assignment(csrf);
  }.bind(this));
}

static get_assignment(csrf) {
  skipper_button.value = "Getting assignment data..."

  let assignment_id = assignment.teacherAssignments[0]._id;
  let url1 = "https://edpuzzle.com/api/v3/assignments/" + assignment_id + "/attempt";
  http_get(url1, function(r){
    let attempt = JSON.parse(r.responseText);
    this.post_attempt(csrf, attempt);
  }.bind(this));
}

static post_attempt(csrf, attempt) {
  skipper_button.value = "Posting watchtime data...";

  let id = attempt._id;
  let teacher_assignment_id = attempt.teacherAssignmentId;
  let referrer = "https://edpuzzle.com/assignments/"+ teacher_assignment_id +"/watch";;
  let url2 = "https://edpuzzle.com/api/v4/media_attempts/" + id + "/watch";

  let content = {"timeIntervalNumber": 10};
  let headers = [
    ['accept', 'application/json, text/plain, */*'],
    ['accept_language', 'en-US,en;q=0.9'],
    ['content-type', 'application/json'],
    ['x-csrf-token', csrf],
    ['x-edpuzzle-referrer', referrer],
    ['x-edpuzzle-web-version', edpuzzle_data.version]
  ];
  
  http_get(url2, function(r){
    skipper_button.value = "Video skipped successfully.";
    opener.location.reload();
  }.bind(this), headers, "POST", JSON.stringify(content));
}

}