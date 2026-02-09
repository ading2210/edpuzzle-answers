//Copyright (C) 2023 ading2210
//see README.md for more information
import {fetch_with_auth, get_template, base_url, get_attempt, construct_headers, media, assignment_mode, sanitize_html} from "./main.js";

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

let models = null;
let captions = null;

async function get_captions() {
  if (Array.isArray(captions))
    return;
  
  if (media.source != "youtube") {
    console.log("Captions not available for this type of video.")
    captions = false;
    return;
  }

  let video_id = media.thumbnailURL.split("/")[4];
  let request;
  try {
    request = await fetch_with_auth(base_url+"/api/captions/"+video_id);
  }
  catch(error) {
    console.warn(error);
    captions = false;
    return;
  }
  if (!request.ok) {
    console.warn("Failed to fetch captions. Response from server: ", await r.text());
    captions = false;
    return;
  }

  let data = await request.json();
  if (data.captions.length == 0) {
    captions = false;
    console.log("Video supported, but no English captions available.");
    return;
  }
  captions = data.captions;
}

async function submit_open_ended(content, question_id) {
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

  await fetch_with_auth(answer_url, {
    method: "POST",
    headers: await construct_headers(),
    body: JSON.stringify(body)
  })
}

export async function submit_button_callback(content, question) {
  if (!content) {
    alert("You cannot submit an empty response.");
    return false;
  }
  let confirm_message = `Are you sure you want to submit the following response to Edpuzzle?\n\n${content}`;
  if (!confirm(confirm_message)) return false;
  
  await submit_open_ended(content, question._id);
  return true;
}

export class OpenEndedMenu {
  constructor(question, question_div) {
    this.question_div = question_div;
    this.question = question;
    this.active_request = null;

    this.question_div.scroll_old = content_div.scrollTop;
    content_div.scrollTop = 0;
  }

  open_menu() {
    //show menu
    hide_element(questions_div);
    show_element(open_ended_div, true);

    //populate menu template
    while (open_ended_div.firstChild) {
      open_ended_div.firstChild.remove();
    }
    this.menu_div = get_template("open_ended_menu_template", true);
    this.menu_div.placeholder("title").innerHTML = this.question.title;
    this.menu_div.placeholder("cancel_button").onclick = this.close_menu.bind(this);
    this.display_prompt(this.question);
    this.populate_services();
    this.menu_div.placeholder("generate_button").onclick = this.generate_button_callback.bind(this);
    this.menu_div.placeholder("save_button").onclick = this.save_button_callback.bind(this);

    open_ended_div.append(this.menu_div);
  }

  async generate_button_callback() {
    if (captions === null) {
      alert("Error: Please wait until the prompt has been loaded.");
    }

    this.menu_div.placeholder("generate_button").disabled = true;
    this.menu_div.placeholder("save_button").disabled = true;
    let prompt = await this.format_prompt();
    this.generate(prompt);
  }

  save_button_callback() {
    let question_textarea = this.question_div.placeholder("question_textarea");
    let generated_textarea = this.menu_div.placeholder("generated_textarea");
    question_textarea.value = generated_textarea.value;
    this.close_menu();
  }

  close_menu() {
    if (this.active_request instanceof XMLHttpRequest) {
      this.active_request.abort();
    }

    show_element(questions_div, true);
    hide_element(open_ended_div);
    content_div.scrollTop = this.question_div.scroll_old;
  }

  get_prompt_template() {
    let title_clean = strip_html(this.question.title);
    if (this.menu_div && this.menu_div.placeholder("prompt_textarea").value) {
      return this.menu_div.placeholder("prompt_textarea").value;
    }

    if (media.source == "youtube" && captions) {
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


  async format_captions(max_length=null) {
    if (!captions) {
      await get_captions();
      if (!captions) {
        return "";
      }
    }

    let captions_trimmed = [];
    for (let i=0; i<captions.length; i++) {
      let caption = captions[i];
      if (this.question.time > caption.timestamp) {
        captions_trimmed = captions.slice(0, i+1);
      }
    }

    let formatted = "";
    for (let line of captions_trimmed.reverse()) {
      if (max_length && (line.text+" "+formatted).length > max_length) {
        break;
      }
      formatted = line.text+" "+formatted;
    }
    return formatted.replaceAll("\n", " ");
  }

  async format_prompt(max_length=null) {
    await get_captions();
    let prompt_template = this.get_prompt_template(this.question);
    if (max_length != null) {
      max_length = max_length - prompt_template.length;
    }
    if (captions) {
      let captions_formatted = await this.format_captions(max_length);
      return prompt_template.replace("{captions}", captions_formatted)
    }
    return prompt_template;
  }

  async display_prompt() {
    await get_captions();
    let prompt_textarea = this.menu_div.placeholder("prompt_textarea");
    prompt_textarea.value = this.get_prompt_template();
    prompt_textarea.disabled = false;
  }

  async populate_services() {
    if (models == null) {
      let res = await fetch_with_auth(base_url + "/api/models")
      models = (await res.json())["models"]
    }
    
    let model_dropdown = this.menu_div.placeholder("model_dropdown");
    let model_label = this.menu_div.placeholder("model_label");
    hide_element([model_dropdown, model_label]);
    
    while (model_dropdown.firstChild) {
      model_dropdown.firstChild.remove();
    }

    for (let model in models) {
      let option = document.createElement("option");
      option.text = option.value = model;
      model_dropdown.append(option);
    }
    show_element([model_dropdown, model_label]);
  }

  handle_generate_event(last_status, event) {
    let generated_textarea = this.menu_div.placeholder("generated_textarea");
    if (event.status) {
      last_status.status = event.status;
      if (event.status == "pending") {
        generated_textarea.disabled = true;
        generated_textarea.value = "Waiting for backend response...";
      }
      else if (event.status == "generating") {
        generated_textarea.value = "";
      }
      else if (event.status == "done") {
        generated_textarea.disabled = false;
        generated_textarea.value = generated_textarea.value.trim();
      }
      else if (event.status == "error") {
        generated_textarea.disabled = true;
        generated_textarea.value = deindent(`
          **An unexpected error has occured. This is not part of any generated text.**
          Error: ${event.error}
          Status: ${event.status_code}
          Message: ${event.message}
          Traceback:
        `)
        generated_textarea.value += event.traceback || "";
      }
      return;
    }
    
    if (last_status.status == "generating") {
      generated_textarea.value += event.text;
    }
  }

  async generate(prompt) {
    if (this.active_request instanceof XMLHttpRequest) {
      this.active_request.abort();
    }

    let body = {
      prompt: prompt,
      model: models[this.menu_div.placeholder("model_dropdown").value]
    };

    let generate_button = this.menu_div.placeholder("generate_button");
    let save_button = this.menu_div.placeholder("save_button");
    
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

}