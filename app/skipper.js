var button = document.getElementById("skipper");

function httpGet(url, callback, headers=[], method="GET", content=null) {
  var request = new XMLHttpRequest();
  request.addEventListener("load", callback);
  request.open(method, url, true);
  if (document.edpuzzle_data && document.edpuzzle_data.token) {
    headers.push(["authorization", document.edpuzzle_data.token]);
  }
  for (const header of headers) {
    request.setRequestHeader(header[0], header[1]);
  }
  request.send(content);
}

function init() {
  button.value = "Getting CSRF token...";
  getCSRF();
}

function getCSRF() {
  var csrfURL = "https://edpuzzle.com/api/v3/csrf";
  httpGet(csrfURL, function(){
    var data = JSON.parse(this.responseText);
    var csrf = data.CSRFToken;
    button.value = "Getting assignment data..."
    getAssignment(csrf);
  });
}

function getAssignment(csrf) {
  var assignment_id = opener.location.href.split("/")[4];
  var url1 = "https://edpuzzle.com/api/v3/assignments/" + assignment_id + "/attempt";
  httpGet(url1, function(){
    var data = JSON.parse(this.responseText);
    button.value = "Posting watchtime data...";
    postAttempt(csrf, data);
  });
}

function postAttempt(csrf, data) {
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
  
  httpGet(url2, function(){
    button.value = "Video skipped successfully.";
    opener.location.reload();
  }, headers, "POST", JSON.stringify(content));
}

init();