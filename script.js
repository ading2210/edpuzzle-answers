var popup = null;
var base_url;
if (typeof document.dev_env != "undefined") {
  base_url = document.dev_env;
}
else {
  //get resources off of github to not inflate the jsdelivr stats
  base_url = "https://raw.githubusercontent.com/ading2210/edpuzzle-answers/main";
}

function http_get(url, callback, headers=[], method="GET", content=null) {
  var request = new XMLHttpRequest();
  request.addEventListener("load", callback);
  request.open(method, url, true);

  if (window.__EDPUZZLE_DATA__ && window.__EDPUZZLE_DATA__.token) {
    headers.push(["authorization", window.__EDPUZZLE_DATA__.token]);
  }
  for (const header of headers) {
    request.setRequestHeader(header[0], header[1]);
  }
  
  request.send(content);
}

function init() {
  if (window.location.hostname == "edpuzzle.hs.vc") {
    alert("To use this, drag this button into your bookmarks bar. Then, run it when you're on an Edpuzzle assignment.");
  }
  else if ((/https{0,1}:\/\/edpuzzle.com\/assignments\/[a-f0-9]{1,30}\/watch/).test(window.location.href)) {
    getAssignment();
  }
  else if (window.canvasReadyState) {
    handleCanvasURL();
  }
  else if (window.schoologyMoreLess) {
    handleSchoologyURL();
  }
  else {
    alert("Please run this script on an Edpuzzle assignment. For reference, the URL should look like this:\nhttps://edpuzzle.com/assignments/{ASSIGNMENT_ID}/watch");
  }
}

function handleCanvasURL() {
  let location_split = window.location.href.split("/");
  let url = `/api/v1/courses/${location_split[4]}/assignments/${location_split[6]}`;
  http_get(url, function(){
    let data = JSON.parse(this.responseText);
    let url2 = data.url;

    http_get(url2, function() {
      let data = JSON.parse(this.responseText);
      let url3 = data.url;

      alert(`Please re-run this script in the newly opened tab. If nothing happens, then allow popups on Canvas and try again.`);
      open(url3);
    });
  });
}

function handleSchoologyURL() {
  let assignment_id = window.location.href.split("/")[4];
  let url = `/external_tool/${assignment_id}/launch/iframe`;
  http_get(url, function() {
    alert(`Please re-run this script in the newly opened tab. If nothing happens, then allow popups on Schoology and try again.`);

    //strip js tags from response and add to dom
    let html = this.responseText.replace(/<script[\s\S]+?<\/script>/, ""); 
    let div = document.createElement("div");
    div.innerHTML = html;
    let form = div.querySelector("form");
    
    let input = document.createElement("input")
    input.setAttribute("type", "hidden");
    input.setAttribute("name", "ext_submit");
    input.setAttribute("value", "Submit");
    form.append(input);
    document.body.append(div);

    //submit form in new tab
    form.setAttribute("target", "_blank");
    form.submit();
    div.remove();
  });
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
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * {font-family: 'Poppins', Arial, sans-serif;}
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
    
    get_tag("style", base_url+"/app/popup.css");
    get_tag("script", base_url+"/app/popup.js");
    get_tag("script", base_url+"/app/videooptions.js");
    get_tag("script", base_url+"/app/videospeed.js");
  </script>
  <title>Answers for: ${media.title}</title>
</head>
<body>
  <div class="container">
    <header>
      <div class="header-content">
        <img src="${thumbnail}" alt="Video Thumbnail" class="thumbnail">
        <div class="video-info">
          <h1>${media.title}</h1>
          <p>Uploaded by ${media.user.name} on ${date.toDateString()}</p>
          <p>Assigned on ${assigned_date.toDateString()}, ${deadline_text}</p>
        </div>
      </div>
      <div class="controls">
        <button id="skipper" onclick="skip_video();" disabled>Skip Video</button>
        <button id="answers_button" onclick="answer_questions();" disabled>Answer Questions</button>
        <div class="speed-control">
          <label for="speed_dropdown">Video speed:</label>
          <select name="speed_dropdown" id="speed_dropdown" onchange="video_speed()">
            <option value="0.25">0.25x</option>
            <option value="0.5">0.5x</option>
            <option value="0.75">0.75x</option>
            <option value="1" selected>Normal</option>
            <option value="1.25">1.25x</option>
            <option value="1.5">1.5x</option>
            <option value="1.75">1.75x</option>
            <option value="2">2x</option>
            <option value="-1">Custom</option>
          </select>
        </div>
        <div class="custom-speed">
          <label id="custom_speed_label" for="custom_speed"></label>
          <input type="range" id="custom_speed" name="custom_speed" value="1" min="0.1" max="16" step="0.1" oninput="video_speed()" hidden>
        </div>
        <div class="pause-control">
          <label for="pause_on_focus">Don't pause on unfocus:</label>
          <input type="checkbox" id="pause_on_focus" name="pause_on_focus" onchange="toggle_unfocus();">
        </div>
      </div>
    </header>
    <main>
      <p class="info">Correct choices are highlighted in green.</p>
      <div id="content" class="questions">
        <p id="loading_text"></p>
      </div>
    </main>
    <footer>
      <!-- if you want to fork this project, please don't remove the credits here. -->
      <!-- not only do you have to keep the credits and copyright notice, you also have to make sure your fork is also open source under the same license -->
      <p>Made by: <a href="https://github.com/ading2210" target="_blank">ading2210</a> on Github | Website: <a href="https://edpuzzle.hs.vc" target="_blank">edpuzzle.hs.vc</a> | Source code: <a href="https://github.com/ading2210/edpuzzle-answers" target="_blank">ading2210/edpuzzle-answers</a></p>
      <p>Licenced under the <a href="https://github.com/ading2210/edpuzzle-answers/blob/main/LICENSE" target="_blank">GNU GPL v3</a>. Do not reupload or redistribute without abiding by those terms.</p>
      <p>Available now from our <a href="https://edpuzzle.hs.vc/discord.html" target="_blank">Discord server</a>: <i>An open beta of a completely overhauled GUI, with proper mobile support, ChatGPT integration for open-ended questions, and more.</i></p>
    </footer>
  </div>
</body>
</html>`;

  popup = window.open("about:blank", "", "width=600, height=400");
  popup.document.write(base_html);
  popup.document.close();

  popup.document.assignment = assignment;
  popup.document.dev_env = document.dev_env;
  popup.document.edpuzzle_data = window.__EDPUZZLE_DATA__;
  popup.window.onload = () => {getMedia(assignment)};
}

function getMedia(assignment) {
  var text = popup.document.getElementById("loading_text");
  var content = popup.document.getElementById("content");

  text.innerHTML = `Fetching assignments...`;
  
  var media_id = assignment.teacherAssignments[0].contentId;
  var url2 = `https://edpuzzle.com/api/v3/media/${media_id}`;

  function handle_error(msg) {
    text.remove();
    content.innerHTML += `<p style="font-size: 12px">${msg}</p>`;
    popup.document.getElementById("skipper").disabled = false;
  }

  fetch(url2, {credentials: "omit"})
    .then(response => {
      if (!response.ok) {
        handle_error(`Error: Status code ${response.status} received when attempting to fetch the answers.`);
      }
      else return response.json();
    })
    .then(media => {
      if (!media) return;
      parseQuestions(media.questions);
    })
    .catch((error) => {
      handle_error(`Error when trying to fetch the answers: ${error}`);
    })
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

      let answer_exists = false;
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
            answer_exists = true;
          }
          else {
            choices_lines.push(`<li class="choice">${item_html}</li>`);
          }
        }
      }
      if (!answer_exists) continue;
      
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
  if (counter == 0 || counter2 == 0) {
    content.innerHTML += `<p style="font-size: 12px">No valid multiple choice questions were found.</p>`;
  }
  else {
    popup.document.getElementById("answers_button").disabled = false;
  }
  popup.questions = questions;
}

init();
