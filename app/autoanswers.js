

var button = document.getElementById("answers_button");

class EdpuzzleAutoanswer {
  constructor() {
    this.button = document.getElementById("answers_button");
    this.csrf = null;
    this.assignment = document.assignment;
    this.questions = document.questions;

    // Bind methods to ensure correct 'this' context
    this.getCSRF = this.getCSRF.bind(this);
    this.getAttempt = this.getAttempt.bind(this);
    this.skipVideo = this.skipVideo.bind(this);
    this.postAnswers = this.postAnswers.bind(this);
    this.httpGet = this.httpGet.bind(this);
  }

  init() {
    this.button.value = "Getting CSRF token...";
    this.getCSRF();
  }

  getCSRF() {
    const csrfURL = "https://edpuzzle.com/api/v3/csrf";
    this.httpGet(csrfURL, (response) => {
      this.csrf = JSON.parse(response).CSRFToken;
      this.button.value = "Getting attempt...";
      this.getAttempt();
    });
  }

  getAttempt() {
    const id = this.assignment.teacherAssignments[0]._id;
    const attemptURL = `https://edpuzzle.com/api/v3/assignments/${id}/attempt`;
    this.httpGet(attemptURL, (response) => {
      const data = JSON.parse(response);
      this.button.value = "Skipping video...";
      this.skipVideo(data);
    });
  }

  skipVideo(attempt) {
    var id = attempt._id;
    var teacher_assignment_id = attempt.teacherAssignmentId;
    var referrer = "https://edpuzzle.com/assignments/"+teacher_assignment_id+"/watch";;
    var url2 = "https://edpuzzle.com/api/v4/media_attempts/"+id+"/watch";

    var content = {"timeIntervalNumber": 10};
    var headers = [
      ['accept', 'application/json, text/plain, */*'],
      ['accept_language', 'en-US,en;q=0.9'],
      ['content-type', 'application/json'],
      ['x-csrf-token', this.csrf],
      ['x-edpuzzle-referrer', referrer],
      ['x-edpuzzle-web-version', opener.__EDPUZZLE_DATA__.version]
    ];
    
    this.httpGet(url2, () => {
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
        this.button.value = "Posting answers...";
        // Set total steps for the progress bar
       
        this.postAnswers(filteredQuestions, attemptId, total);
      }
    }, headers, "POST", JSON.stringify(content));
  }

  postAnswers(remainingQuestions, attemptId, total) {
    var id = this.assignment.teacherAssignments[0]._id;
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
      ['x-csrf-token', this.csrf],
      ['x-edpuzzle-referrer', referrer],
      ['x-edpuzzle-web-version', opener.__EDPUZZLE_DATA__.version]
    ];
    this.httpGet(answersURL, () => {
      if (remainingQuestions.length == 0) {
        this.button.value = "Answers submitted successfully.";
        opener.location.reload();
      }
      else {
        var progress = total - remainingQuestions.length;
        this.button.value = `Posting answers... (${progress}/${total})`;
        this.postAnswers(remainingQuestions, attemptId, total);
      }
    }, headers, "POST", JSON.stringify(content));
  }

  httpGet(url, callback, headers = [], method = "GET", content = null) {
    var request = new XMLHttpRequest();
    request.addEventListener("load", () => callback(request.responseText));
    request.open(method, url, true);
    if (document.edpuzzle_data && document.edpuzzle_data.token) {
      headers.push(["authorization", document.edpuzzle_data.token]);
    }
    for (const header of headers) {
      request.setRequestHeader(header[0], header[1]);
    }
    request.send(content);
  }
}

// Initialize and run the autoanswer process
const autoanswer = new EdpuzzleAutoanswer();
autoanswer.init();
