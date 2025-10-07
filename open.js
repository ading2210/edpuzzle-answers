//Copyright (C) 2023 ading2210
//see README.md for more information

//this script launches the popup and contains handlers for canvas/schoology

const gpl_text = `ading2210/edpuzzle-answers: a Javascript bookmarklet that provides many useful utilities for Edpuzzle
Copyright (C) 2025 ading2210

This program is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License along with this program.If not, see <https://www.gnu.org/licenses/>.`;

//legacy code - use the fetch api instead
function http_get(url, callback, headers=[], method="GET", content=null) {
  var request = new XMLHttpRequest();
  request.addEventListener("load", callback);
  request.open(method, url, true);

  if (window.__EDPUZZLE_DATA__ && window.__EDPUZZLE_DATA__.token && (new URL(url).hostname) == "edpuzzle.com") {
    headers.push(["authorization", window.__EDPUZZLE_DATA__.token]);
  }
  for (const header of headers) {
    request.setRequestHeader(header[0], header[1]);
  }
  
  request.send(content);
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
  else if ((/https?:\/\/edpuzzle.com\/(lms\/lti\/)?assignments\/[a-f0-9]{1,30}\/(watch|view)/).test(window.real_location.href)) {
    http_get(base_url+"/popup.html", open_popup);
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

function open_popup() {
  const popup = window.open("about:blank", "", "width=760, height=450");
  if (popup == null) {
    alert("Error: Could not open the popup. Please enable popups for edpuzzle.com and try again.");
    return;
  }
  write_popup(popup, this.responseText);
  
  function popup_unload() { 
    http_get(base_url+"/popup.html", function(){
      if (popup.closed) return;
      write_popup(popup, this.responseText);
      popup.addEventListener("beforeunload", popup_unload);
    });
  }

  popup.addEventListener("beforeunload", popup_unload);
}

function write_popup(popup, html) {
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

  http_get(base_url+"/styles/popup.css", function(){
    create_element("style", this.responseText);
  });

  http_get(base_url+"/main.js", function() {
    create_element("script", this.responseText);
  });
}

function handle_canvas_url() {
  let location_split = window.real_location.href.split("/");
  let url = `/api/v1/courses/${location_split[4]}/assignments/${location_split[6]}`;
  http_get(url, function(){
    let data = JSON.parse(this.responseText);
    let url2 = data.url;

    http_get(url2, function() {
      let data = JSON.parse(this.responseText);
      let url3 = data.url;

      alert(`Please re-run this script in the newly opened tab. If nothing happens after pressing "ok", then allow popups on Canvas and try again.`);
      open(url3);
    });
  });
}

function handle_schoology_url() {
  let assignment_id = window.real_location.href.split("/")[4];
  let url = `/external_tool/${assignment_id}/launch/iframe`;
  http_get(url, function() {
    alert(`Please re-run this script in the newly opened tab. If nothing happens after pressing "ok", then allow popups on Schoology and try again.`);

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

init();