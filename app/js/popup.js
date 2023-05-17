//Copyright (C) 2023 ading2210
//see README.md for more information

const gpl_text = document.gpl_text;
const base_url = document.base_url;
const edpuzzle_data = document.edpuzzle_data;
const lti_edpuzzle = !!edpuzzle_data.token;

const skipper_button = from_id("skipper_button");
const answers_button = from_id("answers_button");
const unfocus_checkbox = from_id("unfocus_checkbox"); 
const speed_button = from_id("speed_button");
const speed_dropdown = from_id("speed_dropdown");
const custom_speed_container = from_id("custom_speed_container");
const custom_speed = from_id("custom_speed");
const custom_speed_label = from_id("custom_speed_label");
const custom_speed_value = from_id("custom_speed_value");
const status_text = from_id("status_text");

const questions_div = from_id("questions_div");
const open_ended_div = from_id("open_ended_div");
const content_div = from_id("content_div");
const console_log = [];

var assignment = null;
var questions = null;
var content_loaded = false;
var skipper_loaded = false;
var answerer_loaded = false;
var console_html = null;
var console_popup = null;

function fetch_wrapper(url, options={}) {
  if (edpuzzle_data && edpuzzle_data.token && (new URL(url).hostname) == "edpuzzle.com") {
    if (!options.headers) {options.headers = {}}
    options.headers["authorization"] = edpuzzle_data.token;
  }

  return fetch_(url, options);
}

function http_get(url, callback, headers=[], method="GET", content=null) {
  let real_callback = function(){
    callback(this);
  };

  var request = new XMLHttpRequest();
  request.addEventListener("load", real_callback);
  request.open(method, url, true);

  if (edpuzzle_data && edpuzzle_data.token && (new URL(url).hostname) == "edpuzzle.com") {
    headers.push(["authorization", edpuzzle_data.token]);
  }
  for (const header of headers) {
    request.setRequestHeader(header[0], header[1]);
  }
  
  request.send(content);
}

function deindent(str) {
  return str.replace(/^\s+/gm, "");
}

function strip_html(str) {
  let temp = document.createElement("div");
  temp.innerHTML = str; //potential xss here but idc
  return (temp.textContent || temp.innerText);
}

function sanitize_html(str) {
  return str.replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function hide_element(element) {
  if (typeof element == "string") {
    element = from_id(element);
  }
  else if (Array.isArray(element)) {
    for (let item of element) {
      hide_element(item);
    }
    return;
  }

  element.classList.add("hidden");
}

function show_element(element, flex=false) {
  if (typeof element == "string") {
    element = from_id(element);
  }
  else if (Array.isArray(element)) {
    for (let item of element) {
      show_element(item);
    }
    return;
  }

  element.classList.remove("hidden");
  if (flex) {
    element.classList.add("flex")
  }
}

function get_template(id, flex=false) {
  let element = from_id(id).cloneNode(true);
  element.removeAttribute("id");
  element.classList.remove("hidden");
  if (flex) {
    element.classList.add("flex");
  }

  element.placeholder = function(name) {
    return element.querySelector(`*[key="${name}"]`)
  }
  return element;
}

function fixed_length_int(int, length) {
  return ("0".repeat(length) + int).slice(-length);
}

function load_module(url) {
  console.log("Loading "+url);
  http_get(url, function(r){
    if ((""+r.status)[0] == "2") {
      var element = document.createElement("script");
      element.innerHTML = r.responseText;
      document.getElementsByTagName("head")[0].appendChild(element);
    }
    else {
      console.error("Could not fetch "+url);
    }
  });
}

function get_assignment_id() {
  if (assignment) {
    return assignment.teacherAssignments[0]._id;
  }
  else {
    return window.location.href.split("/")[4];
  }
}

async function get_csrf() {
  let csrf_url = "https://edpuzzle.com/api/v3/csrf";
  let request = await fetch(csrf_url);
  let data = await request.json();
  return data.CSRFToken;
}

async function get_attempt() {
  let assignment_id = get_assignment_id();
  let attempt_url = `https://edpuzzle.com/api/v3/assignments/${assignment_id}/attempt`;
  let request = await fetch(attempt_url);
  let data = await request.json();
  return data;
}

async function get_assignment() {
  let assignment_id = window.location.href.split("/")[4];
  if (typeof assignment_id == "undefined") {
    throw new Error("Could not infer the assignment ID. Are you on the correct URL?");
  }
  let assignment_url = `https://edpuzzle.com/api/v3/assignments/${assignment_id}`;
  let response = await fetch(assignment_url);
  if (!response.ok) {
    throw new Error(`Status code ${response.status} received when attempting to fetch the assignment.`);
  }
  return await response.json();
}

function format_popup() {
  let media = assignment.medias[0];
  let teacher_assignment = assignment.teacherAssignments[0];
  let thumbnail = media.thumbnailURL;
  if (thumbnail.startsWith("/")) {
    thumbnail = "https://"+window.location.hostname+thumbnail;
  }
  
  let deadline_text;
  if (teacher_assignment.preferences.dueDate == "") {
    deadline_text = "No due date"
  }
  else {
    deadline_text = "Due on "+(new Date(teacher_assignment.preferences.dueDate)).toDateString();
  }

  from_id("title").innerHTML = `Answers for: ${media.title}`;
  from_id("assignment_title").innerHTML = media.title;
  from_id("assignment_author").innerHTML = media.user.name;
  from_id("assignment_end").innerHTML = deadline_text;
  from_id("thumbnail_img").src = thumbnail;
}

async function get_media(needle="", request_count=1) {
  let data = await get_media_attempt();
  while (data !== false) {
    //received new needle
    if (typeof data == "string") {
      data = await get_media_attempt(data);
      continue;
    }
    return data;
  }
  throw new Error("Media not found.");
}

async function get_media_attempt(needle="") {
  let classroom_id = assignment.teacherAssignments[0].classroom.id;
  let media_id = assignment.teacherAssignments[0].contentId;
  let media_url = `https://edpuzzle.com/api/v3/assignments/classrooms/${classroom_id}/students/?needle=${needle}`;

  let response = await fetch(media_url);

  if (!response.ok) {
    throw new Error(`Status code ${response.status} received when attempting to fetch the answers.`)
  }

  let classroom = await response.json();
  if (classroom.medias.length == 0) {
    return false;
  }

  for (let media of classroom.medias) {
    if (media._id == media_id) {
      questions = media.questions;
      return questions;
    }
  }

  return classroom.teacherAssignments.slice(-1)[0]._id;
}

function parse_questions() {
  if (questions == null) {
    throw new Error("Failed to fetch the questions for this assignment.")
  }
  
  //bubble sort the questions by time
  for (let i=0; i<questions.length; i++) {
    for (let j=0; j<questions.length-i-1; j++) {
      if (questions[j].time > questions[j+1].time){
       let question_old = questions[j];
       questions[j] = questions[j + 1];
       questions[j+1] = question_old;
     }
    }
  }

  for (let question of questions) {
    let min = fixed_length_int(Math.floor(question.time/60), 2);
    let secs = fixed_length_int(Math.floor(question.time%60), 2);
    let timestamp = `[${min}:${secs}]`;

    if (question.body[0].text != "") {
      question.title = `<p>${question.body[0].text}</p>`;
    }
    else {
      question.title = question.body[0].html;
    }

    let table = get_template("question_template");
    table.placeholder("timestamp").innerHTML = timestamp;
    table.placeholder("title").innerHTML = question.title;

    if (question.type == "multiple-choice") {
      let choices_list = get_template("multiple_choice_template");
      let choice_template = choices_list.placeholder("question_choice");
      
      for (let choice of question.choices) {
        let list_item = choice_template.cloneNode(true);
        if (choice.isCorrect) {
          list_item.classList.add("underline");
        }
        if (choice.body[0].text != "") {
          list_item.innerHTML = `<p>${choice.body[0].text}</p>`;
        }
        else {
          list_item.innerHTML = `${choice.body[0].html}`;
        }
        choices_list.append(list_item);
      }
      choice_template.remove();
      table.placeholder("question_content").append(choices_list);
    }
    else if (question.type == "open-ended") {
      let question_div = get_template("open_ended_template", true);
      let generate_button = question_div.placeholder("generator_button");
      generate_button.onclick = function(){open_ended.open_menu(question, question_div)};

      table.placeholder("question_content").append(question_div);
    }

    questions_div.append(table);
  }

  content_loaded = true;

  skipper_button.disabled = !skipper_loaded;
  if (questions.length == 0) {
    status_text.innerHTML = "No valid multiple choice questions were found.";
  }
  else {
    status_text.classList.add("hidden");
    answers_button.disabled = !answerer_loaded;
  }
}

function open_copyright_notice() {
  let gpl_popup = window.open("about:blank", "", "width=600, height=300");
  let text = gpl_text.replaceAll("<", "<&zwj;");
  gpl_popup.document.head.innerHTML = `<title>edpuzzle-answers: Copyright Notice</title>`;
  gpl_popup.document.body.innerHTML = `
    <pre style="font-size: 12px; white-space: pre-wrap">${text}</pre>
  `;
}

function textarea_initialize(textarea) {
  textarea_update_height(textarea);
  textarea.addEventListener("input", function(){textarea_update_height(textarea)});
  let old_width;
  new ResizeObserver(function(changes){
    for (let change of changes) {
      if (change.contentRect.width === old_width) {return}
      old_width = change.contentRect.width
      textarea_update_height(textarea);
    }
  }).observe(textarea);
}

function textarea_update_height(textarea) {
  textarea.style.marginBottom = textarea.style.height;
  textarea.style.height = 0;
  textarea.style.height = textarea.scrollHeight+"px";
  textarea.style.marginBottom = 0;
}

function mutation_observer_callback(mutations_list, observer) {
  for (let mutation of mutations_list) {
    if (mutation.type == "childList") {
      for (let added_node of mutation.addedNodes) {
        if (added_node instanceof Text && added_node.parentNode && added_node.parentNode.tagName == "TEXTAREA") {
          textarea_update_height(added_node.parentNode);
        }
        else if (added_node instanceof HTMLElement) {
          for (let textarea of added_node.getElementsByTagName("textarea")) {
            textarea_initialize(textarea);
          }
        }
      }
    }
  }
}

function intercept_console() {
  let function_names = ["log", "debug", "info", "warn", "error"];
  for (let key of function_names) {
    console[key+"_"] = console[key].bind(console);
    console[key] = function() {
      let log_entry = {
        message: arguments[0] || "",
        type: key
      }
      if (arguments.length > 0) {
        console_log.push(log_entry);
      }
      if (console_popup) {
        display_console_message(log_entry);
      }

      return console[key+"_"](...arguments);
    }
  }
}

async function load_console_html() {
  let url = base_url+"/app/html/console.html";
  console.log(`Loading ${url}`);
  let request = await fetch(url);

  if (!request.ok) {
    console.error("Failed to load JS console.");
    return;
  }
  console_html = await request.text();
}

function open_console() {
  if (console_popup) {
    console_popup.close();
  }

  console_popup = window.open("about:blank", "", "width=500, height=500");
  console_popup.document.write(console_html);
  for (let element of document.getElementsByTagName("style")) {
    console_popup.document.head.append(element.cloneNode(true));
  }
  
  let js_textarea = console_popup.document.getElementById("js_input");
  js_textarea.onkeydown = function(event) {
    if (event.code == "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (js_textarea.value === ""){
        return;
      }  
      let command = js_textarea.value;
      js_textarea.value = "";
      let message = {
        message: eval(command),
        type: "eval"
      }
      add_console_message(message);
    }
  }

  console_popup.onbeforeunload = function(){
    setTimeout(function(){
      console_popup.close();
    }, 200)
  }
  
  for (let log_entry of console_log) {
    display_console_message(log_entry);
  }
}

function add_console_message(log_entry) {
  if (console_popup) {
    display_console_message(log_entry);
  }
}

function display_console_message(log_entry) {
  let colors = {
    eval: "bg-slate-900",
    debug: "bg-slate-900",
    info: "bg-slate-900",
    log: "bg-slate-900",
    warn: "bg-yellow-700",
    error: "bg-red-800"
  }

  let table_container = console_popup.document.getElementById("table_container");
  let console_table = console_popup.document.getElementById("console_table");
  let message_row = console_popup.document.createElement("tr");
  let type_cell = console_popup.document.createElement("td");
  let text_cell = console_popup.document.createElement("td");

  let message = log_entry.message;
  if (typeof message == "object") {
    message = JSON.stringify(message);
  }
  else if (typeof message != "string") {
    message = message+"";
  }

  type_cell.innerHTML = log_entry.type;
  text_cell.innerHTML = sanitize_html(message).replaceAll("\n", "<br>");
  text_cell.className = type_cell.className = "border border-slate-600 align-top";
  message_row.classList.add(colors[log_entry.type]);
  text_cell.classList.add("w-full");

  message_row.append(type_cell);
  message_row.append(text_cell);
  console_table.append(message_row);
  table_container.scrollTop = table_container.scrollHeight;
}

function on_before_unload() {
  if (console_popup) {
    console_popup.close();
  }
}

function on_error(error_old, url, line, col, error) {
  error_text = error?.stack || error_old;
  let message = {
    message: error_text,
    type: "error"
  }
  add_console_message(message)
}

async function init() {
  fetch_ = fetch;
  fetch = fetch_wrapper;
  intercept_console();
  window.onerror = on_error;
  window.onbeforeunload = on_before_unload;

  console.log(gpl_text);

  load_module(base_url+"/app/js/skipper.js");
  load_module(base_url+"/app/js/autoanswers.js");
  load_module(base_url+"/app/js/videooptions.js");
  load_module(base_url+"/app/js/openended.js");
  load_console_html();

  let textarea_list = document.getElementsByTagName("textarea");
  for (let textarea of textarea_list) {
    textarea_initialize(textarea);
  }

  let observer = new MutationObserver(mutation_observer_callback);
  observer.observe(document.getRootNode(), {childList: true, subtree: true});

  try {
    assignment = await get_assignment();
    format_popup();
    await get_media();
    parse_questions();
  }
  catch (error) {
    console.error(error.stack);
    status_text.innerHTML = `An error has occurred. Please check the JS console for more details.<br><br>${error+""}`;
  }
}

init();