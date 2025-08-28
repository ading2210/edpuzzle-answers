//Copyright (C) 2023 ading2210
//see README.md for more information
import {get_template, base_url, get_attempt, construct_headers, media, assignment_mode, sanitize_html} from "./main.js";

function hide_element(element) {
  if (typeof element == "string") {
    element = document.getElementById(element);
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
    element = document.getElementById(element);
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

function strip_html(str) {
  let temp = document.createElement("div");
  temp.innerHTML = str; //potential xss here but idc
  return (temp.textContent || temp.innerText);
}

function deindent(str) {
  return str.replace(/^\s+/gm, "");
}

export class open_ended {

static models = [];
static captions = null;
static element = null;
static menu = null;
static question = null;
static active_request = null;

static async get_captions() {
  if (media.source != "youtube") {
    console.log("Captions not available for this type of video.")
    this.captions = false;
    return;
  }

  let video_id = media.thumbnailURL.split("/")[4];
  let request;
  try {
    request = await fetch(base_url+"/api/captions/"+video_id);
  }
  catch(error) {
    console.warn(error);
    this.captions = false;
    return;
  }
  if (!request.ok) {
    console.warn("Failed to fetch captions. Response from server: ", await r.text());
    this.captions = false;
    return;
  }

  let data = await request.json();
  if (data.captions.length == 0) {
    this.captions = false;
    console.log("Video supported, but no English captions available.");
    return;
  }
  this.captions = data.captions;
}

static async format_captions(max_length=null) {
  if (!this.captions) {
    await this.get_captions(this.question);
    if (!this.captions) {
      return "";
    }
  }

  let captions_trimmed = [];
  for (let i=0; i<this.captions.length; i++) {
    let caption = this.captions[i];
    if (this.question.time > caption.timestamp) {
      captions_trimmed = this.captions.slice(0, i+1);
    }
  }

  let formatted = "";
  for (let line of this.captions.reverse()) {
    if (max_length && (line.text+" "+formatted).length > max_length) {
      break;
    }
    formatted = line.text+" "+formatted;
  }
  return formatted.replaceAll("\n", " ");
}

static get_prompt_template() {
  let title_clean = strip_html(this.question.title);
  if (this.menu && this.menu.placeholder("prompt_textarea").value) {
    return this.menu.placeholder("prompt_textarea").value;
  }

  if (media.source == "youtube" && this.captions) {
    return deindent(
      `{captions}
      Based on the captions above, answer the following question in two sentences or less, at the writing level of a high school student:
      ${title_clean}`
    );
  }
  else {
    return deindent(
      `Answer the following question in two sentences or less, at the writing level of a high school student:
      ${title_clean}`
    );
  }
}

static async format_prompt(max_length=null) {
  if (this.captions === null) {
    await this.get_captions();
  }
  let prompt_template = this.get_prompt_template(this.question);
  if (max_length != null) {
    max_length = max_length - prompt_template.length;
  }
  if (this.captions) {
    let captions_formatted = await this.format_captions(max_length);
    return prompt_template.replace("{captions}", captions_formatted)
  }
  return prompt_template;
}

static async display_prompt() {
  let callback = () => {
    let prompt_textarea = this.menu.placeholder("prompt_textarea");
    prompt_textarea.innerHTML = this.get_prompt_template();
    prompt_textarea.disabled = false;
  }
  if (this.captions === null) {
    this.get_captions().then(callback);
  }
  else {
    callback();
  }
}

static async populate_services() {
  let res = await fetch(base_url + "/api/models")
  this.models = (await res.json())["models"]

  let model_dropdown = this.menu.placeholder("model_dropdown");
  let model_label = this.menu.placeholder("model_label");
  hide_element([model_dropdown, model_label]);
  
  while (model_dropdown.firstChild) {
    model_dropdown.firstChild.remove();
  }

  for (let model in this.models) {
    let option = document.createElement("option");
    option.text = option.value = model;
    model_dropdown.append(option);
  }
  show_element([model_dropdown, model_label]);
}

static handle_generate_event(last_status, event) {
  let generated_textarea = this.menu.placeholder("generated_textarea");
  if (event.status) {
    last_status.status = event.status;
    if (event.status == "pending") {
      generated_textarea.disabled = true;
      generated_textarea.innerHTML = "Waiting for backend response...";
    }
    else if (event.status == "generating") {
      generated_textarea.innerHTML = "";
    }
    else if (event.status == "done") {
      generated_textarea.disabled = false;
      generated_textarea.innerHTML = generated_textarea.innerHTML.trim();
    }
    else if (event.status == "error") {
      generated_textarea.disabled = true;
      generated_textarea.innerHTML = deindent(`
        **An unexpected error has occured. This is not part of any generated text.**
        Error: ${event.error}
        Status: ${event.status_code}
        Message: ${event.message}
        Traceback:
      `)
      generated_textarea.innerHTML += event.traceback || "";
    }
    return;
  }
  
  if (last_status.status == "generating") {
    generated_textarea.innerHTML += event.text;
  }
}

static async generate(prompt) {
  if (this.active_request instanceof XMLHttpRequest) {
    this.active_request.abort();
  }

  let body = {
    prompt: prompt,
    model: this.models[this.menu.placeholder("model_dropdown").value]
  };

  let generate_button = this.menu.placeholder("generate_button");
  let save_button = this.menu.placeholder("save_button");
  
  let request = new XMLHttpRequest();
  if (window.opener) {
    request = new opener.XMLHttpRequest();
  }
  let last_byte = 0;
  let last_status = {status: "pending"};

  this.handle_generate_event(last_status, last_status);

  request.onprogress = function(){
    let new_text = request.responseText.substring(last_byte);
    last_byte = request.responseText.length;
    for (let line of new_text.split("\n")) {
      if (!line) {continue}
      this.handle_generate_event(last_status, JSON.parse(line));
    }
  }.bind(this);

  request.onabort = function(){
    this.active_request = null;
    generate_button.disabled = save_button.disabled = false;
  }.bind(this);

  request.onerror = function(){
    this.handle_generate_event(last_status, {
      status: "error",
      status_code: 0,
      error: "Unknown client error",
      message: "Please check your browser's console."
    });
    generate_button.disabled = save_button.disabled = false;
  }.bind(this);

  request.onload = function(){
    request.onabort();
    if (request.status == 200) {
      return;
    }

    let error = JSON.parse(request.responseText);
    this.handle_generate_event(last_status, {
      status: "error",
      status_code: request.status,
      error: error.error,
      message: error.message,
      traceback: error.traceback || ""
    });
  }.bind(this)

  request.open("POST", base_url+"/api/generate");
  request.setRequestHeader("content-type", "application/json");
  request.send(JSON.stringify(body));

  this.active_request = request;
}

static async submit_open_ended(content, question_id=null) {
  if (!question_id) question_id = this.question._id;
  let attempt = await get_attempt();
  let attempt_id = attempt._id || attempt.id;
  let answer_url = `https://edpuzzle.com/api/v3/attempts/${attempt_id}/answers`;
  let body = {
    "answers": [{
      "type": "open-ended",
      "questionId": question_id,
      "body": [{
        "text": content,
        "html": ""
      }]
    }]
  }

  if (assignment_mode === "new") {
    answer_url = `https://edpuzzle.com/api/v3/learning/submissions/${attempt_id}/answers`;
    body = {
      answerQuestions: [{
        questionData: {
          blocks: [{
            type: "text",
            value: `<p>${sanitize_html(content)}</p>`,
            valueType: "html"
          }]
        },
        questionId: question_id,
        questionType: "open-ended"
      }],
      answerSaveStatus: "answered"
    }
  }

  await fetch(answer_url, {
    method: "POST",
    headers: await construct_headers(),
    body: JSON.stringify(body)
  })
}

static generate_button_callback() {
  if (this.captions === null) {
    alert("Error: Please wait until the prompt has been loaded.");
  }

  this.menu.placeholder("generate_button").disabled = true;
  this.menu.placeholder("save_button").disabled = true;
  this.format_prompt().then(prompt => { // No max length because users input their own key
    this.generate(prompt);
  }) 
}

static save_button_callback() {
  let question_textarea = this.element.placeholder("question_textarea");
  let generated_textarea = this.menu.placeholder("generated_textarea");
  question_textarea.value = generated_textarea.value;

  this.close_menu();
}

static async submit_button_callback(content, question) {
  if (!content) {
    alert("You cannot submit an empty response.");
    return false;
  }
  let confirm_message = `Are you sure you want to submit the following response to Edpuzzle?\n\n${content}`;
  if (!confirm(confirm_message)) return false;
  
  await this.submit_open_ended(content, question._id);
  return true;
}

static open_menu(question, element) {
  this.element = element;
  this.question = question;
  this.element.scroll_old = content_div.scrollTop;
  content_div.scrollTop = 0;

  //show menu
  hide_element(questions_div);
  show_element(open_ended_div, true);

  //populate menu template
  while (open_ended_div.firstChild) {
    open_ended_div.firstChild.remove();
  }
  this.menu = get_template("open_ended_menu_template", true);
  this.menu.placeholder("title").innerHTML = question.title;
  this.menu.placeholder("cancel_button").onclick = this.close_menu.bind(this);
  this.display_prompt(question);
  this.populate_services();
  this.menu.placeholder("generate_button").onclick = this.generate_button_callback.bind(this);
  this.menu.placeholder("save_button").onclick = this.save_button_callback.bind(this);

  open_ended_div.append(this.menu);
}

static close_menu() {
  if (this.active_request instanceof XMLHttpRequest) {
    this.active_request.abort();
  }

  show_element(questions_div, true);
  hide_element(open_ended_div);
  content_div.scrollTop = this.element.scroll_old;
  this.menu = null;
}

}