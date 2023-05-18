//Copyright (C) 2023 ading2210
//see README.md for more information

class open_ended {

static services = null;
static captions = null;
static element = null;
static menu = null;
static question = null;
static active_request = null;

static {
  this.get_services()
    .then(success => {
      if (!success) {
        console.warn("Failed to fetch available generation services.");
      }
    });
}

static async get_captions() {
  if (assignment.medias[0].source != "youtube") {
    console.log("Captions not available for this type of video.")
    this.captions = false;
    return;
  }

  let video_id = assignment.medias[0].thumbnailURL.split("/")[4];
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
    console.warn("Failed to fetch captions.")
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

static async get_services() {
  let request;
  try {
    request = await fetch(base_url+"/api/services");
  }
  catch (e) {
    console.warn("Request for generation services failed.");
    return false;
  }
  if (request.ok) {
    this.services = await request.json();
  }
  return request.ok
}

static async format_captions(max_length=null) {
  if (!this.captions) {
    await this.get_captions();
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
  for (let line of captions_trimmed.reverse()) {
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

  if (assignment.medias[0].source == "youtube" && this.captions) {
    return deindent(
      `{captions}
      Based on the captions above, answer the following question in two sentences or less, at the writing level of a high school student:
      ${title_clean}`
    );
  }
  else {
    return title_clean;
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
  if (this.services === null) {
    let success = await this.get_services();
    if (!success) {
      console.warn("Failed to fetch generatation services from the backend.");
      return;
    }
  }

  let service_dropdown = this.menu.placeholder("service_dropdown");
  for (let service of this.services) {
    let option = document.createElement("option");
    option.text = option.value = service.name;
    option.disabled = service.disabled;
    service_dropdown.append(option);
  }
  service_dropdown.disabled = false;

  this.update_model_dropdown();
}

static update_model_dropdown() {
  let model_dropdown = this.menu.placeholder("model_dropdown");
  let model_label = this.menu.placeholder("model_label");
  hide_element([model_dropdown, model_label]);
  while (model_dropdown.firstChild) {
    model_dropdown.firstChild.remove();
  }

  let service_name = this.menu.placeholder("service_dropdown").value;
  let service;
  for (let item of this.services) {
    if (service_name == item.name) {
      service = item;
      break;
    }
  }
  if (!service.models) {
    return;
  }

  for (let model of service.models) {
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
    else if (event.status == "proxy") {
      generated_textarea.innerHTML = "Waiting for proxy...";
    }
    else if (event.status == "init") {
      generated_textarea.innerHTML = "Loading scraper...";
    }
    else if (event.status == "waiting") {
      generated_textarea.innerHTML = "Waiting for service...";
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

static async generate(service, prompt, model=null) {
  if (this.active_request instanceof XMLHttpRequest) {
    this.active_request.abort();
  }

  let body = {
    prompt: prompt,
    stream: true
  };
  if (model) body.model = model;

  let generate_button = this.menu.placeholder("generate_button");
  let save_button = this.menu.placeholder("save_button");
  
  let request = new XMLHttpRequest();
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

  request.open("POST", base_url+"/api/generate/"+service.name);
  request.setRequestHeader("content-type", "application/json");
  request.send(JSON.stringify(body));

  this.active_request = request;
}

static async submit_open_ended(content, question_id=null) {
  if (!question_id) question_id = this.question._id;
  let attempt = await get_attempt();
  let answer_url = `https://edpuzzle.com/api/v3/attempts/${attempt._id}/answers`;

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

  let service_name = this.menu.placeholder("service_dropdown").value;
  let service;
  for (let item of this.services) {
    if (item.name == service_name) {
      service = item;
      break;
    }
  }

  this.menu.placeholder("generate_button").disabled = true;
  this.menu.placeholder("save_button").disabled = true;
  let model = null;
  if (service.models) {
    model = this.menu.placeholder("model_dropdown").value;
  }
  this.format_prompt(service.max_length).then(prompt => {
    this.generate(service, prompt, model);
  }) 
}

static save_button_callback() {
  let question_textarea = this.element.placeholder("question_textarea");
  let generated_textarea = this.menu.placeholder("generated_textarea");
  question_textarea.value = generated_textarea.value;

  this.close_menu();
}

static async submit_button_callback(content, question) {
  
}

static open_menu(question, element) {
  if (this.services == null) {
    this.get_services();
    alert(deindent(
      `Error: No generation services present. This may happen if the server is blocked of if it is under high load.
      
      Please wait a few seconds and try again.`
    ));
    return;
  }

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
  this.menu.placeholder("service_dropdown").onchange = this.update_model_dropdown.bind(this);
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