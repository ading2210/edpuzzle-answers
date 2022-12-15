var popup = null;
var base_url;
if (typeof document.dev_env != "undefined") {
  base_url = document.dev_env;
}
else {
  //get resources off of github to not inflate the jsdelivr stats
  base_url = "https://raw.githubusercontent.com/ading2210/edpuzzle-answers/main";
}

function http_get(url, callback) {
  var request = new XMLHttpRequest();
  request.addEventListener("load", callback);
  request.open("GET", url, true);
  request.send();
}

function init() {
  if (!(/https{0,1}:\/\/edpuzzle.com\/assignments\/[a-f0-9]{1,30}\/watch/).test(window.location.href
  )) {
    alert("Please run this script on an Edpuzzle assignment. For reference, the URL should look like this:\nhttps://edpuzzle.com/assignments/{ASSIGNMENT_ID}/watch")
    return;
  }
  
  getAssignment();
}

function getAssignment(callback) {
  var assignment_id = window.location.href.split("/")[4];
  if (typeof assignment_id == "undefined") {
    alert("Error: Could not infer the assignment ID. Are you on the correct URL?");
    return;
  }
  var url1 = "https://edpuzzle.com/api/v3/assignments/"+assignment_id;

  http_get(url1, function(){
    var assignment = JSON.parse(this.responseText);
    if ((""+this.status)[0] == "2") {
      openPopup(assignment);
    }
    else {
      alert(`Error: Status code ${this.status} recieved when attempting to fetch the assignment data.`)
    }
  });
}

function openPopup(assignment) {
  var media = assignment.medias[0];
  var teacher_assignment = assignment.teacherAssignments[0];
  var assigned_date = new Date(teacher_assignment.preferences.startDate);
  var date = new Date(media.createdAt);
  thumbnail = media.thumbnailURL;
  if (thumbnail.startsWith("/")) {
    thumbnail = "https://"+window.location.hostname+thumbnail;
  }
  
  var deadline_text;
  if (teacher_assignment.preferences.dueDate == "") {
    deadline_text = "no due date"
  }
  else {
    deadline_text = "due on "+(new Date(teacher_assignment.preferences.dueDate)).toDateString();
  }
  
  var base_html = `
  <head>
    <style>
      * {font-family: Arial}
    </style>
    <script>
      var base_url = "${base_url}";
      function http_get(url, callback) {
        var request = new XMLHttpRequest();
        request.addEventListener("load", callback);
        request.open("GET", url, true);
        request.send();
      }
      function get_tag(tag, url) {
        console.log("Loading "+url);
        http_get(url, function(){
          if ((""+this.status)[0] == "2") {
            var element = document.createElement(tag);
            element.innerHTML = this.responseText;
            document.getElementsByTagName("head")[0].appendChild(element);
          }
          else {
            console.error("Could not fetch "+url);
          }
        });
      }
      get_tag("style", base_url+"/popup.css");
      get_tag("script", base_url+"/popup.js");
      get_tag("script", base_url+"/videooptions.js");
    </script>
    <title>Answers for: ${media.title}</title>
  <div id="header_div">
    <div>
      <img src="${thumbnail}" height="108px">
    </div>
    <div id="title_div">
      <p style="font-size: 16px"><b>${media.title}</b></h2>
      <p style="font-size: 12px">Uploaded by ${media.user.name} on ${date.toDateString()}</p>
      <p style="font-size: 12px">Assigned on ${assigned_date.toDateString()}, ${deadline_text}</p>
      <p style="font-size: 12px">Correct choices are <u>underlined</u>.</p>
      <input id="skipper" type="button" value="Skip Video" onclick="skip_video();" disabled/>
      <input id="answers_button" type="button" value="Answer Questions" onclick="answer_questions();" disabled/>
      <div id="speed_container" hidden>
        <label style="font-size: 12px" for="speed_dropdown">Video speed:</label>
        <select name="speed_dropdown" id="speed_dropdown" onchange="video_speed()">
          <option value="0.25">0.25</option>
          <option value="0.5">0.5</option>
          <option value="0.75">0.75</option>
          <option value="1" selected>Normal</option>
          <option value="1.25">1.25</option>
          <option value="1.5">1.5</option>
          <option value="1.75">1.75</option>
          <option value="2">2</option>
          <option value="-1">Custom</option>
        </select>
        <label id="custom_speed_label" style="font-size: 12px" for="custom_speed"></label>
        <input type="range" id="custom_speed" name="custom_speed" value="1" min="0.1" max="16" step="0.1" oninput="video_speed()" hidden>
      </div>
      <div id="options_container">
        <label for="pause_on_focus" style="font-size: 12px">Don't pause on unfocus: </label>
        <input type="checkbox" id="pause_on_focus" name="pause_on_focus" onchange="toggle_unfocus();">
      </div>
    </div>
  </div>
  <hr>
  <div id="content"> 
    <p style="font-size: 12px" id="loading_text"></p>
  </div>
  <hr>
  <p style="font-size: 12px">Made by: <a target="_blank" href="https://github.com/ading2210">ading2210</a> on Github | Website: <a target="_blank" href="https://edpuzzle.hs.vc">edpuzzle.hs.vc</a> | Source code: <a target="_blank" href="https://github.com/ading2210/edpuzzle-answers">ading2210/edpuzzle-answers</a>`;
  popup = window.open("about:blank", "", "width=600, height=400");
  popup.document.write(base_html);

  popup.document.assignment = assignment;
  popup.document.dev_env = document.dev_env;

  getMedia(assignment);
}

function getMedia(assignment, needle="", request_count=1) {
  var text = popup.document.getElementById("loading_text");
  text.innerHTML = `Fetching assignments (page ${request_count})...`;
  
  var media_id = assignment.teacherAssignments[0].contentId;
  var classroom_id = assignment.teacherAssignments[0].classroom.id;
  var url2 = "https://edpuzzle.com/api/v3/assignments/classrooms/"+classroom_id+"/students/?needle="+needle;

  http_get(url2, function() {
    if ((""+this.status)[0] == "2") {
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
    }
    else {
      var text = popup.document.getElementById("loading_text");
      var content = popup.document.getElementById("content");
      popup.document.questions = questions;
      text.remove();
      content.innerHTML += `Error: Status code ${this.status} recieved when attempting to fetch the answers.`;
    }
  });
}

function parseQuestions(questions) {
  var text = popup.document.getElementById("loading_text");
  var content = popup.document.getElementById("content");
  popup.document.questions = questions;
  text.remove();

  if (questions == null) {
    content.innerHTML += `<p style="font-size: 12px">Error: Could not get the media for this assignment. </p>`;
    return;
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
  popup.document.getElementById("skipper").disabled = false;
  if (counter == 0) {
    content.innerHTML += `<p style="font-size: 12px">No valid multiple choice questions were found.</p>`;
  }
  else {
    popup.document.getElementById("answers_button").disabled = false;
  }
  popup.questions = questions;
}

init()