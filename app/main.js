//Copyright (C) 2025 ading2210
//see README.md for more information
import * as video_skipper from "./skipper.js";
import * as auto_answers from "./autoanswers.js";
import * as video_options from "./videooptions.js";
import * as open_ended from "./openended.js";

window.real_location = JSON.parse(JSON.stringify(opener.real_location));

const gpl_text = document.gpl_text;
export const base_url = document.base_url;
const edpuzzle_data = document.edpuzzle_data;
const lti_edpuzzle = window.real_location.pathname.includes("/lms/lti");
const csrf_cache = {
  latest: null,
  updated: 0
}

const open_notice_button = document.getElementById("open-notice");
const open_console_button = document.getElementById("open-console");

const skipper_button = document.getElementById("skipper_button");
const answers_button = document.getElementById("answers_button");
const unfocus_checkbox = document.getElementById("unfocus_checkbox"); 
const speed_button = document.getElementById("speed_button");
const speed_dropdown = document.getElementById("speed_dropdown");
const custom_speed_container = document.getElementById("custom_speed_container");
const custom_speed = document.getElementById("custom_speed");
const custom_speed_label = document.getElementById("custom_speed_label");
const custom_speed_value = document.getElementById("custom_speed_value");
const status_text = document.getElementById("status_text");

const questions_div = document.getElementById("questions_div");
const open_ended_div = document.getElementById("open_ended_div");
const content_div = document.getElementById("content_div");
const console_log = [];

export var media = null;
export var questions = null;
var console_html = null;
var console_popup = null;
export var assignment = null;
export var content_loaded = false;
export var assignment_mode = null;
var attachment_id = null;

export function fetch_with_auth(url, options={}) {
  if (edpuzzle_data && edpuzzle_data.token && (new URL(url).hostname) == "edpuzzle.com") {
    if (!options.headers) {options.headers = {}}
    options.headers["authorization"] = edpuzzle_data.token;
  }
  if (window.opener) {
    return opener.fetch(url, options);
  }
  return fetch(url, options);
}

export function sanitize_html(str) {
  return str.replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

export function get_template(id, flex=false) {
  let element = document.getElementById(id).cloneNode(true);
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

function get_assignment_id() {
  if (assignment) {
    if (assignment_mode == "new") {
      return assignment.assignmentLearner.assignmentId;
    }
    else {
      return assignment.teacherAssignments[0]._id;
    }
  }
  else {
    let corrected_url = window.real_location.href.replace("/lms/lti", "");
    return corrected_url.split("/")[4];
  }
}

async function get_csrf() {
  let now = Date.now()/1000;
  if (!csrf_cache.latest ||  now - csrf_cache.updated > 60) {
    let csrf_url = "https://edpuzzle.com/api/v3/csrf";
    let request = await fetch_with_auth(csrf_url);
    let data = await request.json();
    let csrf = data.CSRFToken;
    csrf_cache.updated = now;
    csrf_cache.latest = csrf;
    return csrf;
  }
  else {
    return csrf_cache.latest
  }
}

export async function construct_headers() {
  let headers = {
    "accept": "application/json, text/plain, */*",
    "accept_language": "en-US,en;q=0.9",
    "content-type": "application/json",
    "x-csrf-token": await get_csrf(),
    "x-edpuzzle-referrer": window.real_location.href,
    "x-edpuzzle-web-version": edpuzzle_data.version,
  }
  if (lti_edpuzzle) {
    let lti_credentials = get_lti_credentials();
    headers["authorization"] = lti_credentials.user_token;
    headers["x-edpuzzle-lti-access-token"] = lti_credentials.lti_token;
  }
  return headers;
}

function get_lti_credentials() {
  let edpuzzle_bundle = opener.webpackChunkedpuzzle_client_web;
  let wp_require = edpuzzle_bundle.push([[Symbol()], {}, r => r]);
  edpuzzle_bundle.pop();

  let store_module = wp_require("./app_react/modules/store.js");
  let store = Object.values(store_module)[0];
  let state = store.getState();
  return {
    lti_token: state.lti_learning2.ltiAccessToken,
    user_token: state.user.authToken
  }
}

export async function get_attempt() {
  let assignment_id = get_assignment_id();
  let attempt_url;
  if (assignment_mode == "new") {
    let filtered = assignment.assignmentLearner.submissions.filter((submission) => {
      return submission.attachmentId == attachment_id
    });
    attempt_url = `https://edpuzzle.com/api/v3/learning/submissions/${filtered[0].id}`;
  }
  else {
    attempt_url = `https://edpuzzle.com/api/v3/assignments/${assignment_id}/attempt`;
  }

  let request = await fetch_with_auth(attempt_url, {headers: await construct_headers()});
  let data = await request.json();

  return data;
}

async function get_assignment() {
  let assignment_id = get_assignment_id();

  if (typeof assignment_id == "undefined") {
    throw new Error("Could not infer the assignment ID. Are you on the correct URL?");
  }

  let assignment_url = `https://edpuzzle.com/api/v3/assignments/${assignment_id}`;
  let response = await fetch_with_auth(assignment_url, {headers: await construct_headers()});
  if (response.ok) {
    assignment_mode = "legacy";
  }
  else {
    assignment_mode = "new";
    let me_url = "https://edpuzzle.com/api/v3/users/me";
    let me_response = await fetch_with_auth(me_url, {headers: await construct_headers()});
    let user_id = (await me_response.json())._id;
    assignment_url = `https://edpuzzle.com/api/v3/learning/assignments/${assignment_id}/users/${user_id}`;

    response = await fetch_with_auth(assignment_url, {headers: await construct_headers()});
    if (!response.ok)
      throw new Error(`Status code ${response.status} received when attempting to fetch the assignment.`);
  }

  return await response.json();
}

function format_popup() {
  let media;
  let teacher_assignment;
  let thumbnail;
  let author_name;

  if (assignment_mode == "new") {
    if (!attachment_id) {
      throw new Error(`You must be open to a video in the Edpuzzle tab.\n\nMake sure the page URL looks like this:\nhttps://edpuzzle.com/assignments/{ASSIGNMENT_ID}/watch?attachmentId={ATTACHMENT_ID}`);
    }
    let filtered = assignment.assignment.attachments.filter((attachment) => {
      return attachment.id == attachment_id;
    });

    media = filtered[0];
    if (media == null) {
      throw new Error(`Could not find the assignment media.\n\nMake sure the page URL looks like this:\nhttps://edpuzzle.com/assignments/{ASSIGNMENT_ID}/watch?attachmentId={ATTACHMENT_ID}`);
    }
    teacher_assignment = assignment.assignmentLearner;
    thumbnail = media.thumbnailUrl;
    author_name = teacher_assignment.enrolledBy.fullName;
  }
  else {
    media = assignment.medias[0];
    teacher_assignment = assignment.teacherAssignments[0].preferences;
    thumbnail = media.thumbnailURL;
    author_name = media.user.name;
  }

  if (thumbnail.startsWith("/")) {
    thumbnail = "https://"+window.real_location.hostname+thumbnail;
  }
  
  let deadline_text;
  if (teacher_assignment.dueDate == "") {
    deadline_text = "No due date"
  }
  else {
    deadline_text = "Due on "+(new Date(teacher_assignment.dueDate)).toDateString();
  }

  document.getElementById("title").innerHTML = `Answers for: ${media.title}`;
  document.getElementById("assignment_title").innerHTML = media.title;
  document.getElementById("assignment_author").innerHTML = author_name;
  document.getElementById("assignment_end").innerHTML = deadline_text;
  document.getElementById("thumbnail_img").src = thumbnail;
}

async function get_media() {
  let media_id;
  if (assignment_mode == "new") {
    let filtered = assignment.assignment.attachments.filter((attachment) => {
      return attachment.id == attachment_id;
    });
    media_id = filtered[0].contentId;
  }
  else {
    media_id = assignment.teacherAssignments[0].contentId;
  }

  let r = await fetch_with_auth(base_url + `/api/media/${media_id}`);
  media = await r.json();

  if (r.status !== 200) {
    let error_msg = `${media.error}:\n${media.message}`;
    throw new Error(error_msg);
  }

  questions = media.questions;
  return questions
}

//associates user responses with their corresponding questions.
async function get_responses(questions) {
  let attempt = await get_attempt();
  for (let question of questions) {
    for (let answer of attempt.answers) {
      if (answer.questionId == question._id) {
        question.response = answer;
        break;
      }
    }
    if (!question.response) {
      question.response = null;
    }
  }
  return questions;
}

//wrapper function for question fetcher - with error handling
async function get_questions() {
  questions = await get_media();
  questions = await get_responses(questions);

  //validate the questions to make sure they all have an answer listed
  for (let question of questions) {
    if (question.type !== "multiple-choice") continue;
    let correct_found = false;
    for (let choice of question.choices) {
      if (choice.isCorrect) {
        correct_found = true;
        break;
      };
    }
    if (!correct_found) {
      throw new Error("Some questions have invalid data. The assignment might be a private one, so the answers cannot be extracted.");
    }
  }
}

//display the questions onto the popup
function parse_questions() {
  if (questions == null) {
    throw new Error("Failed to fetch the questions for this assignment.")
  }
  
  //sort the questions by time
  questions.sort((a, b) => a.time - b.time);

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
      let question_div = get_template("open_ended_question_template", true);
      let generate_button = question_div.placeholder("generator_button");
      let submit_button = question_div.placeholder("submit_button");
      let question_textarea = question_div.placeholder("question_textarea");
      let buttons_div = question_div.placeholder("buttons_div");
      
      if (question.response) {
        question_textarea.innerHTML = question.response.body[0].text;
        question_textarea.disabled = true;
        buttons_div.classList.add("hidden");
      }
      else {
        generate_button.onclick = function(){
          let menu = new open_ended.OpenEndedMenu(question, question_div);
          menu.open_menu();
        };
        submit_button.onclick = async function(){
          let success = await open_ended.submit_button_callback(question_textarea.value.trim(), question)
          if (success) {
            buttons_div.remove();
          }
        }
      }

      table.placeholder("question_content").append(question_div);
    }

    questions_div.append(table);
  }

  content_loaded = true;

  skipper_button.disabled = false;
  if (questions.length == 0) {
    status_text.innerHTML = "No valid multiple choice questions were found.";
  }
  else {
    status_text.classList.add("hidden");
    answers_button.disabled = false;
  }
}

function open_copyright_notice() {
  let gpl_popup = window.open("about:blank", "", "width=600, height=300");
  let text = gpl_text.replaceAll("<", "<&zwj;");
  //this fixes a bug that only occurs on firefox for some reason
  setTimeout(() => {
    gpl_popup.document.head.innerHTML = `<title>edpuzzle-answers: Copyright Notice</title>`;
    gpl_popup.document.body.innerHTML = `
      <pre style="font-size: 12px; white-space: pre-wrap">${text}</pre>
    `;  
  }, 500);
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

  let old_descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(textarea), "value");
  Object.defineProperty(textarea, "value", {
    get: old_descriptor.get,
    set: (value) => {
      textarea_update_height(textarea);
      old_descriptor.set.call(textarea, value);
    }
  })
}

function textarea_update_height(textarea) {
  textarea.style.marginBottom = textarea.style.height;
  textarea.style.height = 0;
  textarea.style.height = textarea.scrollHeight+"px";
  textarea.style.marginBottom = 0;
}

function mutation_observer_callback(mutations_list) {
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
  let url = base_url+"/console.html";
  console.log(`Loading ${url}`);
  let request = await fetch_with_auth(url);

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
  let error_text = error?.stack || error_old;
  let message = {
    message: error_text,
    type: "error"
  }
  add_console_message(message)
}

open_notice_button.addEventListener("click", open_copyright_notice);
open_console_button.addEventListener("click", open_console);
unfocus_checkbox.addEventListener("change", () => {video_options.toggle_unfocus()});
speed_dropdown.addEventListener("change", () => {video_options.video_speed()});
skipper_button.addEventListener("click", () => {video_skipper.skip_video()});
answers_button.addEventListener("click", () => {auto_answers.answer_questions()});
custom_speed.addEventListener("input", () => {video_options.video_speed()})

async function init() {
  intercept_console();
  window.onerror = on_error;
  window.onbeforeunload = on_before_unload;
  attachment_id = new URLSearchParams(window.real_location.search).get("attachmentId");

  console.log(gpl_text);
  load_console_html();
  if (lti_edpuzzle) 
    console.log("Detected new type LTI assignment");

  let textarea_list = document.getElementsByTagName("textarea");
  for (let textarea of textarea_list) {
    textarea_initialize(textarea);
  }

  let observer = new MutationObserver(mutation_observer_callback);
  observer.observe(document.getRootNode(), {childList: true, subtree: true});

  try {
    assignment = await get_assignment();
    format_popup();
    await get_questions();
    parse_questions();
  }
  catch (error) {
    console.error(error + "");
    console.error(error.stack);
    status_text.innerText = `An error has occurred. Please check the JS console for more details.\n\n${error+""}`;
  }
}

init();