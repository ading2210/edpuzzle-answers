//Copyright (C) 2023 ading2210
//see README.md for more information

class auto_answers {
  
static {
  answerer_loaded = true;
  answers_button.disabled = !content_loaded; 
}

static answer_questions() {
  answers_button.value = "Getting CSRF token...";

  skipper_button.disabled = true;
  answers_button.disabled = true; 

  get_csrf(function(csrf){
    this.get_attempt(csrf);
  }.bind(this));
}

static get_attempt(csrf) {
  answers_button.value = "Getting attempt..."

  let assignment_id = assignment.teacherAssignments[0]._id;
  let attemptURL = "https://edpuzzle.com/api/v3/assignments/"+assignment_id+"/attempt";
  http_get(attemptURL, function(r){
    let data = JSON.parse(r.responseText);
    this.skipVideo(csrf, data);
  }.bind(this));
}

static skipVideo(csrf, attempt) {
  answers_button.value = "Skipping video..."

  let id = attempt._id;
  let teacher_assignment_id = attempt.teacherAssignmentId;
  let referrer = "https://edpuzzle.com/assignments/"+teacher_assignment_id+"/watch";;
  let url2 = "https://edpuzzle.com/api/v4/media_attempts/"+id+"/watch";

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
    let attemptId = attempt._id;
    let filteredQuestions = [];
    
    for (let i=0; i<questions.length; i++) {
      let question = questions[i];
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
      let total = filteredQuestions.length;
      answers_button.value = "Posting answers...";
      this.post_answers(csrf, filteredQuestions, attemptId, total);
    }
  }.bind(this), headers, "POST", JSON.stringify(content));
}

static post_answers(csrf, remainingQuestions, attemptId, total) {
  let id = assignment.teacherAssignments[0]._id;
  let referrer = "https://edpuzzle.com/assignments/"+id+"/watch";
  let answersURL = "https://edpuzzle.com/api/v3/attempts/"+attemptId+"/answers";

  let content = {answers: []};
  let now = new Date().toISOString();
  let questionsPart = remainingQuestions.shift();
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
      "type": "multiple-choice"
    });
  }
  
  let headers = [
    ['accept', 'application/json, text/plain, */*'],
    ['accept_language', 'en-US,en;q=0.9'],
    ['content-type', 'application/json'],
    ['x-csrf-token', csrf],
    ['x-edpuzzle-referrer', referrer],
    ['x-edpuzzle-web-version', opener.__EDPUZZLE_DATA__.version]
  ];
  http_get(answersURL, function(r) {
    if (remainingQuestions.length == 0) {
      answers_button.value = "Answers submitted successfully.";
      opener.location.reload();
    }
    else {
      answers_button.value = `Posting answers... (${total-remainingQuestions.length+1}/${total})`;
      this.post_answers(csrf, remainingQuestions, attemptId, total);
    }
  }.bind(this), headers, "POST", JSON.stringify(content));
}

}