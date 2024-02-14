var button = document.getElementById("answers_button");

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

  button.value = "Skipping video..."

  skipVideo(csrf, data);
}

async function skipVideo(csrf, attempt) {
  var id = attempt._id;
  var teacher_assignment_id = attempt.teacherAssignmentId;
  var referrer = "https://edpuzzle.com/assignments/"+teacher_assignment_id+"/watch";;
  var url2 = "https://edpuzzle.com/api/v4/media_attempts/"+id+"/watch";

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

  var attemptId = attempt._id;
  var filteredQuestions = [];

  for(const question of document.questions) {
    if (question.type != "multiple-choice") {continue;}

    if (filteredQuestions.length == 0) {
      filteredQuestions.push([question]);
    }
    else if (filteredQuestions[filteredQuestions.length-1][0].time == question.time) {
      filteredQuestions[filteredQuestions.length-1].push(question);
    }
    else {
      filteredQuestions.push([question]);
    }
  }

  if (filteredQuestions.length > 0) {
    var total = filteredQuestions.length;
    button.value = "Posting answers...";
    await postAnswers(csrf, document.assignment, filteredQuestions, attemptId, total);
  }
}

async function postAnswers(csrf, assignment, remainingQuestions, attemptId, total) {
  var id = assignment.teacherAssignments[0]._id;
  var referrer = "https://edpuzzle.com/assignments/"+id+"/watch";
  var answersURL = "https://edpuzzle.com/api/v3/attempts/"+attemptId+"/answers";

  var content = {answers: []};
  var now = new Date().toISOString();
  var questionsPart = remainingQuestions.shift();
  for (const question of questionsPart) {
    let correctChoices = [];
    for (const choice of question.choices) {
      if (choice.isCorrect) {
        correctChoices.push(choice._id)
      }
    }
    content.answers.push({
      "questionId": question._id,
      "choices": correctChoices,
      "type": "multiple-choice",
    });
  }

  var headers = [
    ['accept', 'application/json, text/plain, */*'],
    ['accept_language', 'en-US,en;q=0.9'],
    ['content-type', 'application/json'],
    ['x-csrf-token', csrf],
    ['x-edpuzzle-referrer', referrer],
    ['x-edpuzzle-web-version', opener.__EDPUZZLE_DATA__.version]
  ];

  await httpGet(answersURL, headers, "POST", JSON.stringify(content));
  if (remainingQuestions.length == 0) {
    button.value = "Answers submitted successfully.";
    opener.location.reload();
  }
  else {
    button.value = `Posting answers... (${total-remainingQuestions.length+1}/${total})`;
    await postAnswers(csrf, assignment, remainingQuestions, attemptId, total);
  }
}

init();
