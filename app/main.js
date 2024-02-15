//Copyright (C) 2023 ading2210
//see README.md for more information

//this script launches the popup and contains handlers for canvas/schoology

const gpl_text = `ading2210/edpuzzle-answers: a Javascript bookmarklet that provides many useful utilities for Edpuzzle
Copyright (C) 2023 ading2210

This program is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License along with this program.If not, see <https://www.gnu.org/licenses/>.`;

function http_get(url, headers=[], method="GET", content=null) {
  const fetchHeaders = new Headers(headers);
  if (window.__EDPUZZLE_DATA__ && window.__EDPUZZLE_DATA__.token && (new URL(url).hostname) == "edpuzzle.com") {
    fetchHeaders.append(["authorization", window.__EDPUZZLE_DATA__.token]);
  }

  return fetch(url, {
    method: method,
    body: content,
    headers: fetchHeaders,
  }).then(r => new Promise((resolve, reject) => r.ok ? resolve(r) : reject(r)));
}

function format_text(text, replacements) {
  let formatted = text;
  for (let key of Object.keys(replacements)) {
    while (formatted.includes("{{"+key+"}}")) {
      formatted = formatted.replace("{{"+key+"}}", replacements[key]);
    }
  }
  return formatted;
}

function init() {
  console.info(gpl_text);

  //support running from within ultraviolet
  window.real_location = window.location;
  if (window.__uv) {
    window.real_location = __uv.location;
  }

  if (window.real_location.hostname == "edpuzzle.hs.vc") {
    alert("To use this, drag this button into your bookmarks bar. Then, run it when you're on an Edpuzzle assignment.");
  }
  else if ((/https{0,1}:\/\/edpuzzle.com\/assignments\/[a-f0-9]{1,30}\/watch/).test(window.real_location.href)) {
    http_get(base_url+"/app/html/popup.html").then(r => r.text()).then(open_popup);
  }
  else if (window.canvasReadyState) {
    handle_canvas_url();
  }
  else if (window.schoologyMoreLess) {
    handle_schoology_url();
  }
  else {
    alert("Please run this script on an Edpuzzle assignment. For reference, the URL should look like this:\nhttps://edpuzzle.com/assignments/{ASSIGNMENT_ID}/watch");
  }
}

function open_popup(text) {
  const popup = window.open("about:blank", "", "width=700, height=420");
  //const popup = window.open("about:blank");
  if (popup == null) {
    alert("Error: Could not open the popup. Please enable popups for edpuzzle.com and try again.");
    return;
  }
  write_popup(popup, text);

  async function popup_unload() {
    const text = await http_get(base_url+"/app/html/popup.html").then(r => r.text());
    if (popup.closed) return;
    write_popup(popup, text);
    popup.addEventListener("beforeunload", popup_unload);
  }

  popup.addEventListener("beforeunload", popup_unload);
}

async function write_popup(popup, html) {
  popup.document.base_url = base_url;
  popup.document.edpuzzle_data = window.__EDPUZZLE_DATA__;
  popup.document.gpl_text = gpl_text;
  popup.document.write(html);

  let create_element = function(tag, innerHTML) {
    let element = popup.document.createElement(tag);
    element.innerHTML = innerHTML;
    popup.document.head.append(element);
    return element;
  }

  create_element("script", `const from_id = (id) => document.getElementById(id)`);

  http_get("https://fonts.googleapis.com/css2?family=Poppins:wght@400;600&display=swap")
    .then(r => r.text())
    .then(async text => {
      create_element("style", text);
      await new Promise(resolve => setTimeout(resolve, 200));
      if (popup.textarea_update_height) {
        for (let textarea of popup.document.getElementsByTagName("textarea")) {
          popup.textarea_update_height(textarea);
        }
      }
    });


  http_get(base_url+"/app/css/dist.css")
    .then(r => r.text())
    .then(r => create_element("style", r));

  http_get(base_url+"/app/js/popup.js")
    .then(r => r.text())
    .then(r => create_element("script", r));
}

async function handle_canvas_url() {
  let location_split = window.real_location.href.split("/");
  let url = `/api/v1/courses/${location_split[4]}/assignments/${location_split[6]}`;
  let data = await http_get(url).then(r => r.json());
  let url2 = data.url;
  data = await http_get(url2).then(r => r.json());
  let url3 = data.url;

  alert(`Please re-run this script in the newly opened tab. If nothing happens after pressing "ok", then allow popups on Canvas and try again.`);
  open(url3);
}

async function handle_schoology_url() {
  let assignment_id = window.real_location.href.split("/")[4];
  let url = `/external_tool/${assignment_id}/launch/iframe`;
  const text = await http_get(url).then(r => r.text());

  alert(`Please re-run this script in the newly opened tab. If nothing happens after pressing "ok", then allow popups on Schoology and try again.`);

  //strip js tags from response and add to dom
  let html = text.replace(/<script[\s\S]+?<\/script>/, "");
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
}

init();
