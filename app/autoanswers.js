var button = document.getElementById("answers_button");
var progressBar;

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
  var progressBarElement = document.getElementById("progress-bar");
  if (progressBarElement) {
    // Initialize progressBar with default values
    progressBar = new ProgressBar(progressBarElement, 1, "#4CAF50");
  } else {
    console.error("Progress bar element not found");
  }
  getCSRF();
}

function getCSRF() {
  var csrfURL = "https://edpuzzle.com/api/v3/csrf";
  httpGet(csrfURL, function(){
    var data = JSON.parse(this.responseText);
    var csrf = data.CSRFToken;
    button.value = "Getting attempt...";
    getAttempt(csrf, document.assignment);
  });
}

function getAttempt(csrf, assignment) {
  var id = assignment.teacherAssignments[0]._id;
  var attemptURL = "https://edpuzzle.com/api/v3/assignments/"+id+"/attempt";
  httpGet(attemptURL, function(){
    var data = JSON.parse(this.responseText);
    button.value = "Skipping video...";
    if (progressBar) progressBar.updateStep(2);
    skipVideo(csrf, data);
  });
}

function skipVideo(csrf, attempt) {
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
  
  httpGet(url2, function(){
    var attemptId = attempt._id;
    var filteredQuestions = [];
    
    for (let i=0; i<document.questions.length; i++) {
      let question = document.questions[i];
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
      // Set total steps for the progress bar
      if (progressBar) {
        progressBar.totalSteps = total;
        progressBar.render();
      }
      postAnswers(csrf, document.assignment, filteredQuestions, attemptId, total);
    }
  }, headers, "POST", JSON.stringify(content));
}

function postAnswers(csrf, assignment, remainingQuestions, attemptId, total) {
  var id = assignment.teacherAssignments[0]._id;
  var referrer = "https://edpuzzle.com/assignments/"+id+"/watch";
  var answersURL = "https://edpuzzle.com/api/v3/attempts/"+attemptId+"/answers";

  var content = {answers: []};
  var questionsPart = remainingQuestions.shift();
  for (let i=0; i<questionsPart.length; i++) {
    let question = questionsPart[i];
    let correctChoices = [];
    for (let j=0; j<question.choices.length; j++) {
      let choice = question.choices[j];
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
  console.log(remainingQuestions.length)
  
  var headers = [
    ['accept', 'application/json, text/plain, */*'],
    ['accept_language', 'en-US,en;q=0.9'],
    ['content-type', 'application/json'],
    ['x-csrf-token', csrf],
    ['x-edpuzzle-referrer', referrer],
    ['x-edpuzzle-web-version', opener.__EDPUZZLE_DATA__.version]
  ];
  httpGet(answersURL, function() {
    if (remainingQuestions.length == 0) {
      button.value = "Answers submitted successfully.";
      if (progressBar) {
        progressBar.updateStep(total);
        progressBar.setSolved(true);
      }
      opener.location.reload();
    }
    else {
      var progress = total - remainingQuestions.length;
      button.value = `Posting answers... (${progress}/${total})`;
      // Update progress bar
      if (progressBar) progressBar.updateStep(progress);
      postAnswers(csrf, assignment, remainingQuestions, attemptId, total);
    }
  }, headers, "POST", JSON.stringify(content));
}

init();

class ProgressBar {
  constructor(element, totalSteps, solvedColor, currentStep = 0) {
    this.element = element;
    this.totalSteps = totalSteps;
    this.currentStep = currentStep;
    this.solvedColor = solvedColor;
    this.isSolved = false;
    this.render();
  }

  updateStep(step) {
    this.currentStep = Math.min(step, this.totalSteps);
    if (this.currentStep === this.totalSteps) {
      this.setSolved(true);
    }
    this.render();
  }

  setSolved(solved) {
    this.isSolved = solved;
    this.render();
  }

  reset() {
    this.currentStep = 0;
    this.isSolved = false;
    this.render();
  }

  render() {
    const progress = (this.currentStep / this.totalSteps) * 100;
    this.element.style.width = `${progress}%`;
    this.element.style.backgroundColor = this.isSolved ? this.solvedColor : '';
  }
}
