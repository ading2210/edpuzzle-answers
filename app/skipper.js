var button = document.getElementById("skipper");

function httpGet(url, headers=[], method="GET", content=null) {
  const fetchHeaders = new Headers(headers);
  if (document.edpuzzle_data && document.edpuzzle_data.token) {
    fetchHeaders.append(["authorization", document.edpuzzle_data.token]);
  }

  return fetch(url, {
    method: method,
    body: content,
    headers: fetchHeaders,
  }).then(r => new Promise((resolve, reject) => r.ok ? resolve(r) : reject(r)));
}

async function init() {
  button.value = "Getting CSRF token...";

  var csrfURL = "https://edpuzzle.com/api/v3/csrf";

  var data = await httpGet(csrfURL).then(r => r.json());
  var csrf = data.CSRFToken;

  button.value = "Getting attempt..."

  const assignment = document.assignment;

  var id = assignment.teacherAssignments[0]._id;
  var attemptURL = "https://edpuzzle.com/api/v3/assignments/"+id+"/attempt";
  data = await httpGet(attemptURL).then(r => r.json());

  button.value = "Posting watchtime data..."
  await postAttempt(csrf, data);
}

async function postAttempt(csrf, data) {
  var id = data._id;
  var teacher_assignment_id = data.teacherAssignmentId;
  var referrer = "https://edpuzzle.com/assignments/"+ teacher_assignment_id +"/watch";;
  var url2 = "https://edpuzzle.com/api/v4/media_attempts/" + id + "/watch";

  var content = {"timeIntervalNumber": 10};
  var headers = [
    ['accept', 'application/json, text/plain, */*'],
    ['accept_language', 'en-US,en;q=0.9'],
    ['content-type', 'application/json'],
    ['x-csrf-token', csrf],
    ['x-edpuzzle-referrer', referrer],
    ['x-edpuzzle-web-version', opener.__EDPUZZLE_DATA__.version]
  ];
  await httpGet(url2, headers, "POST", JSON.stringify(content));

  button.value = "Video skipped successfully.";
  opener.location.reload();
}

init();
