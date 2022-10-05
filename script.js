var popup = null;

function httpGet(url, callback) {
  var request = new XMLHttpRequest();
  request.addEventListener("load", callback);
  request.open("GET", url, true);
  request.send();
}

function init() {
  getAssignment();
}

function getAssignment(callback) {
  var assignment_id = window.location.href.split("/")[4];
  var url1 = "https://edpuzzle.com/api/v3/assignments/"+assignment_id;

  httpGet(url1, function(){
    var assignment = JSON.parse(this.responseText);
    openPopup(assignment.medias[0]);
    getMedia(assignment);
  });
}

function openPopup(media) {
  var date = new Date(media.createdAt);
  thumbnail = media.thumbnailURL;
  if (thumbnail.startsWith("/")) {
    thumbnail = "https://"+window.location.hostname+thumbnail;
  }
  var base_html = `
  <head>
    <script>
      function skip_video() {
        var request = new XMLHttpRequest();
        request.open("GET", "https://cdn.jsdelivr.net/gh/ading2210/edpuzzle-answers@latest/skipper.js", false);
        request.send();
        eval(request.responseText);
      }
    </script>
    <style>
      * {
        font-family: Arial;
        line-height: 100%;
      }
      li {
        font-size: 12px;
      }
      .no_vertical_margin > * {
        margin-top: 0px;
        margin-bottom: 0px;
      }
      .question > * {
        margin-top: 0px;
        margin-bottom: 0px;
        font-weight: bold;
      }
      .question {
        font-size: 14px;
        width: auto;
      }
      .timestamp_div {
        width: 36px;
        font-size: 13px;
        vertical-align: top;
      }
      .choice > * {
        margin-top: 0px;
        magrin-bottom: 0px;
      }
      .choice-correct > * {
        text-decoration-line: underline;
      }
      .title_div > * {
        margin-top: 0px;
        margin-bottom: 6px;
      }
    </style>
    <title>Answers for: ${media.title}</title>
  <table>
    <tr>
      <td>
        <img src="${thumbnail}" height="108px">
      </td>
      <td style="vertical-align:top" class="title_div">
        <p style="font-size: 16px"><b>${media.title}</b></h2>
        <p style="font-size: 12px">Uploaded by ${media.user.name} on ${date.toDateString()}</p>
        <p style="font-size: 12px">Correct choices are <u>underlined</u>.</p>
        <input id="skipper" type="button" value="Skip Video" onclick="skip_video();"/>
      </td>
    </tr>
  </table>
  <hr>
  <div id="content"> 
    <p style="font-size: 12px" id="loading_text"></p>
  </div>
  <hr>
  <p style="font-size: 12px">Source code: <a target="_blank" href="https://github.com/ading2210/edpuzzle-answers">ading2210/edpuzzle-answers</a> | Skipper based on: <a target="_blank" href="https://github.com/ASmallYawn/EdpuzzleSkipper">ASmallYawn/EdpuzzleSkipper</a></p>`;
  popup = window.open("about:blank", "", "width=600, height=400");
  popup.document.write(base_html);
}

function getMedia(assignment, needle="", request_count=1) {
  var text = popup.document.getElementById("loading_text");
  text.innerHTML = `Fetching assignments (page ${request_count})...`;
  
  var media_id = assignment.teacherAssignments[0].contentId;
  var classroom_id = assignment.teacherAssignments[0].classroom.id;
  var url2 = "https://edpuzzle.com/api/v3/assignments/classrooms/"+classroom_id+"/students/?needle="+needle;

  httpGet(url2, function() {
    var classroom = JSON.parse(this.responseText);
    if (classroom.medias.length == 0) {
      parseQuestions(null);
      return;
    }
    var media;
    for (let i=0; i<classroom.medias.length; i++) {
      media = classroom.medias[i];
      if (media._id == media_id) {
        parseQuestions(media.questions);
        return;
      }
    }
    getMedia(assignment, classroom.teacherAssignments[classroom.teacherAssignments.length-1]._id, request_count+1);
  });
}

function parseQuestions(questions) {
  var text = popup.document.getElementById("loading_text");
  var content = popup.document.getElementById("content");
  text.remove();

  if (questions == null) {
    content.innerHTML += `<p style="font-size: 12px">Error: Could not get the media for this assignment. </p>`;
  }
  
  var question;
  var counter = 0;
  var counter2 = 0;
  for (let i=0; i<questions.length; i++) {
    for (let j=0; j<questions.length-i-1; j++) {
      if (questions[j].time > questions[j+1].time){
       let question_old = questions[j];
       questions[j] = questions[j + 1];
       questions[j+1] = question_old;
     }
    }
  }
  
  for (let i=0; i<questions.length; i++) {
    question = questions[i];
    let choices_lines = [];
    
    if (typeof question.choices != "undefined") {
      let min = Math.floor(question.time/60).toString();
      let secs = Math.floor(question.time%60).toString();
      if (secs.length == 1) {
        secs = "0"+secs;
      }
      let timestamp = min+":"+secs;
      let question_content;
      if (question.body[0].text != "") {
        question_content = `<p>${question.body[0].text}</p>`;
      }
      else {
        question_content = question.body[0].html;
      }
      for (let j=0; j<question.choices.length; j++) {
        let choice = question.choices[j];
        if (typeof choice.body != "undefined") {
          counter++;
          let item_html;
          if (choice.body[0].text != "") {
            item_html = `<p>${choice.body[0].text}</p>`;
          }
          else {
            item_html = `${choice.body[0].html}`;
          }
          if (choice.isCorrect == true) {
            choices_lines.push(`<li class="choice choice-correct">${item_html}</li>`);
          }
          else {
            choices_lines.push(`<li class="choice">${item_html}</li>`);
          }
        }
      }
      
      let choices_html = choices_lines.join("\n");
      let table = ``
      if (counter2 != 0) {
        table += `<hr>`;
      }
      table += `
      <table>
        <tr class="header no_vertical_margin">
          <td class="timestamp_div no_vertical_margin">
            <p>[${timestamp}]</p>
          </td>
          <td class="question">
            ${question_content}
          </td>
        </tr>
        <tr>
          <td></td>
          <td>
            <ul style="margin-top: 6px; margin-bottom: 0px; padding-left: 18px;">
              ${choices_html}
            </ul>
          </td>
        </tr>
      </table>
      `;
      
      content.innerHTML += table;
      counter2++;
    }
  }
  if (counter == 0) {
    content.innerHTML += `<p style="font-size: 12px">No valid multiple choice questions were found.</p>`;
  }
}

init()