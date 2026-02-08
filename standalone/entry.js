// Copyright (C) 2026 ading2210
// Written by NorthernChicken

// Refactored, single script combining all the js in app/.
// Required to bypass Edpuzzle's CSP.
// Opens popup using blob URL, communicates via window.postMessage with the original tab

// html/css handled seperately in build.js

(function () {
    'use strict';

    const GPL_TEXT = `ading2210/edpuzzle-answers: a Javascript bookmarklet that provides many useful utilities for Edpuzzle
Copyright (C) 2025 ading2210

This program is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License along with this program. If not, see <https://www.gnu.org/licenses/>.`;

    const BASE_URL = "edpuzzle.hs.vc";
//    const BASE_URL = "http://127.0.0.1:5000";

    const POPUP_HTML = __POPUP_HTML__;
    const CONSOLE_HTML = __CONSOLE_HTML__;
    const POPUP_CSS = __POPUP_CSS__;

    function validateUrl() {
        if (window.location.hostname === "edpuzzle.hs.vc") {
            alert("To use this, drag this button into your bookmarks bar. Then, run it when you're on an Edpuzzle assignment.");
            return false;
        }

        let realLocation = window.location;
        if (window.__uv) {
            realLocation = window.__uv.location;
        }

        // Canvas
        if (window.canvasReadyState) {
            handleCanvasUrl(realLocation);
            return false;
        }

        // Schoology
        if (window.schoologyMoreLess) {
            handleSchoologyUrl(realLocation);
            return false;
        }

        // Check for Edpuzzle assignment url
        const edpuzzlePattern = /https?:\/\/edpuzzle\.com\/(lms\/lti\/)?assignments\/[a-f0-9]{1,30}\/(watch|view)/;
        if (!edpuzzlePattern.test(realLocation.href)) {
            alert("Please run this script on an Edpuzzle assignment. For reference, the URL should look like this:\nhttps://edpuzzle.com/assignments/{ASSIGNMENT_ID}/watch");
            return false;
        }

        return true;
    }

    // Handle Canvas integration
    function handleCanvasUrl(realLocation) {
        const locationSplit = realLocation.href.split("/");
        const url = `/api/v1/courses/${locationSplit[4]}/assignments/${locationSplit[6]}`;

        const xhr = new XMLHttpRequest();
        xhr.open("GET", url, true);
        xhr.onload = function () {
            const data = JSON.parse(xhr.responseText);
            const url2 = data.url;

            const xhr2 = new XMLHttpRequest();
            xhr2.open("GET", url2, true);
            xhr2.onload = function () {
                const data2 = JSON.parse(xhr2.responseText);
                alert('Please re-run this script in the newly opened tab. If nothing happens after pressing "ok", then allow popups on Canvas and try again.');
                window.open(data2.url);
            };
            xhr2.send();
        };
        xhr.send();
    }

    // Handle Schoology integration
    function handleSchoologyUrl(realLocation) {
        const assignmentId = realLocation.href.split("/")[4];
        const url = `/external_tool/${assignmentId}/launch/iframe`;

        const xhr = new XMLHttpRequest();
        xhr.open("GET", url, true);
        xhr.onload = function () {
            alert('Please re-run this script in the newly opened tab. If nothing happens after pressing "ok", then allow popups on Schoology and try again.');

            const html = xhr.responseText.replace(/<script[\s\S]+?<\/script>/, "");
            const div = document.createElement("div");
            div.innerHTML = html;
            const form = div.querySelector("form");

            const input = document.createElement("input");
            input.setAttribute("type", "hidden");
            input.setAttribute("name", "ext_submit");
            input.setAttribute("value", "Allow");
            form.appendChild(input);

            document.body.appendChild(form);
            form.submit();
        };
        xhr.send();
    }

    function init() {
        if (!validateUrl()) return;
        const edpuzzleData = getStoredData();
        setupMessageListener();
        openPopup(edpuzzleData);
    }

    // overly robust & probably unnecessary  
    function getStoredData() {
        const data = {
            token: null,
            version: "3.0.0",
            source: "none"
        };

        // try window.__EDPUZZLE_DATA__
        if (window.__EDPUZZLE_DATA__) {
            data.token = window.__EDPUZZLE_DATA__.token;
            data.version = window.__EDPUZZLE_DATA__.version || data.version;
            data.source = "window.__EDPUZZLE_DATA__";
        }

        // try localStorage
        if (!data.token) {
            data.token = localStorage.getItem("token") || localStorage.getItem("edpuzzle_token");
            if (data.token) data.source = "localStorage";
        }

        // try cookies (doesnt work?)
        if (!data.token) {
            const tokenCookie = document.cookie.split("; ").find(row => row.startsWith("token="));
            if (tokenCookie) {
                data.token = tokenCookie.split("=")[1];
                data.source = "cookies";
            }
        }

        // Try extract from webpack store
        if (!data.token && window.webpackChunkedpuzzle_client_web) {
            try {
                const edpuzzle_bundle = window.webpackChunkedpuzzle_client_web;
                const wp_require = edpuzzle_bundle.push([[Symbol()], {}, r => r]);
                edpuzzle_bundle.pop();
                const store_module = wp_require("./app_react/modules/store.js");
                const store = Object.values(store_module)[0];
                const state = store.getState();
                data.token = state.user.authToken;
                data.source = "webpack_store";
            } catch (e) {
                console.warn("Failed to extract token from webpack store:", e);
            }
        }

        return data;
    }

    // listener to handle requests from the popup
    function setupMessageListener() {
        window.addEventListener("message", function (event) {
            if (!event.data || !event.data.type) return;

            if (event.data.type === "fetch_request") {
                const { id, url, options } = event.data;
                // fetch in this window for cookies/auth
                if (!options.credentials) {
                    options.credentials = 'include';
                }
                fetch(url, options)
                    .then(async response => {
                        const text = await response.text();
                        // Send response back to popup
                        if (event.source) {
                            event.source.postMessage({
                                type: "fetch_response",
                                id: id,
                                ok: response.ok,
                                status: response.status,
                                statusText: response.statusText,
                                text: text
                            }, "*");
                        }
                    })
                    .catch(error => {
                        if (event.source) {
                            event.source.postMessage({
                                type: "fetch_error",
                                id: id,
                                error: error.message
                            }, "*");
                        }
                    });
            }
            else if (event.data.type === "reload_opener") {
                window.location.reload();
            }
            else if (event.data.type === "manipulate_video") {
                handleVideoCommand(event.data);
            }
        });
    }

    function handleVideoCommand(data) {
        if (data.action === "toggle_unfocus") {
            const shouldUnfocus = data.value;
            if (typeof document.visability_change == "undefined") {
                document.visability_change = shouldUnfocus;
                const script = document.createElement("script");
                script.innerHTML = `
                    window.addEventListener("visibilitychange", function(event) {
                        if (document.visability_change) {
                            event.stopImmediatePropagation();
                        }
                    }, true);
                `;
                document.body.appendChild(script);
            }
            document.visability_change = shouldUnfocus;
        }
        else if (data.action === "set_speed") {
            const speed = data.value;
            const video = document.querySelector("video");
            if (video) {
                Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, "playbackRate").set.call(video, speed);
                try {
                    Object.defineProperty(video, "playbackRate", {
                        set() { },
                        get() { return 1 }
                    });
                } catch (e) { }
            }
        }
        else if (data.action === "set_youtube_speed") {
            const speed = data.value;
            const iframe = document.querySelector("iframe");
            if (iframe && window.YT && window.YT.get) {
                const player = window.YT.get(iframe.id);
                if (player) player.setPlaybackRate(speed);
            }
        }
        else if (data.action === "set_vimeo_speed") {
            const speed = data.value;
            const iframe = document.querySelector("iframe");
            if (iframe && window.Vimeo) {
                const player = new window.Vimeo.Player(iframe);
                player.setPlaybackRate(speed);
            }
        }
    }

    function openPopup(edpuzzleData) {
        // make the popup content
        const html = buildFullHtml(window.location, edpuzzleData);
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank', 'width=800,height=600');
        setTimeout(() => URL.revokeObjectURL(url), 10000);
    }

    function buildFullHtml(realLocation, edpuzzleData) {
        const embeddedData = {
            base_url: BASE_URL,
            edpuzzle_data: edpuzzleData,
            gpl_text: GPL_TEXT,
            console_html: CONSOLE_HTML,
            real_location: realLocation
        };
        return `<!DOCTYPE html>
<html>
<head>
    <title id="title">Loading resources...</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
${POPUP_CSS}
    </style>
</head>
<body class="flex sm:w-screen sm:h-screen max-sm:flex-col text-slate-200 bg-slate-900">
${extractBodyContent(POPUP_HTML)}
<script>
// Embedded data from opener
window.EMBEDDED_DATA = ${JSON.stringify(embeddedData)};

${getMainAppCode()}
</script>
</body>
</html>`;
    }
    function extractBodyContent(html) {
        const match = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
        return match ? match[1] : html;
    }

    // returns the js running inside the popup

    // most of this is refactored from app/

    // Needs heavy testing. It works, but was partially vibe-coded.
    function getMainAppCode() {
        return `

(async function() {

// Restore global variables from embedded data
const embeddedData = window.EMBEDDED_DATA;
const base_url = embeddedData.base_url;
const edpuzzle_data = embeddedData.edpuzzle_data;
const real_location = embeddedData.real_location;
const gpl_text = embeddedData.gpl_text;
const console_html = embeddedData.console_html;

let media = null;
let questions = null;
let assignment = null;
let content_loaded = false;
let assignment_mode = null;
let attachment_id = null;
const console_log = [];

// Parse attachment_id from URL
try {
    const urlParams = new URL(real_location.href).searchParams;
    attachment_id = urlParams.get("attachmentId");
    // If not in URL, try to infer it later from assignment data
} catch (e) {
    console.warn("Could not parse attachment_id", e);
}

// UI Elements
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
const open_notice_button = document.getElementById("open-notice");
const open_console_button = document.getElementById("open-console");

// Debug Data Object
const debugData = {
    tokenSource: edpuzzle_data.source,
    tokenPresent: !!edpuzzle_data.token,
    apiVersion: edpuzzle_data.version,
    backendUrl: base_url,
    mediaId: null,
    fetchErrors: []
};

// Logging helper
function logDebug(message, data = null) {
    const entry = { timestamp: new Date().toISOString(), message, data };
    console.log("[EdpuzzleDebug]", message, data || "");
    console_log.push(entry);
    debugData.fetchErrors.push(entry);
}

// Proxy fetch wrapper to route requests through opener
async function fetch_wrapper(url, options = {}) {
    // If it's an Edpuzzle API call, it needs auth cookies from the opener
    if (url.includes("edpuzzle.com")) {
        // Use postMessage relay
        return new Promise((resolve, reject) => {
            const id = Math.random().toString(36).substring(7);
            
            // Setup one-time listener for response
            const handler = (event) => {
                if (event.data.type === "fetch_response" && event.data.id === id) {
                    window.removeEventListener("message", handler);
                    resolve({
                        ok: event.data.ok,
                        status: event.data.status,
                        statusText: event.data.statusText,
                        text: () => Promise.resolve(event.data.text),
                        json: () => Promise.resolve(JSON.parse(event.data.text))
                    });
                } else if (event.data.type === "fetch_error" && event.data.id === id) {
                    window.removeEventListener("message", handler);
                    reject(new Error(event.data.error));
                }
            };
            window.addEventListener("message", handler);
            
            // Send request to opener
            if (window.opener) {
                window.opener.postMessage({
                    type: "fetch_request",
                    id: id,
                    url: url,
                    options: options
                }, "*");
            } else {
                reject(new Error("Opener window lost"));
            }
        });
    } else {
        // Direct fetch for external calls (e.g., backend) - works because blob: has no CSP
        return fetch(url, options);
    }
}


// logic from app/main.js


function sanitize_html(str) {
  return str.replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function get_template(id, flex=false) {
  let element = document.getElementById(id).cloneNode(true);
  element.removeAttribute("id");
  element.classList.remove("hidden");
  if (flex) {
    element.classList.add("flex");
  }

  element.placeholder = function(name) {
    return element.querySelector(\`*[key="\${name}"]\`)
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
    let corrected_url = real_location.href.replace("/lms/lti", "");
    return corrected_url.split("/")[4];
  }
}

async function get_csrf() {
    // modifications:
    // use opener to handle cookies, no explicit CSRF tokens
    let csrf_url = "https://edpuzzle.com/api/v3/csrf";
    let request = await fetch_wrapper(csrf_url);
    let data = await request.json();
    return data.CSRFToken;
}

async function construct_headers() {
    const headers = {
        "accept": "application/json, text/plain, */*",
        "content_type": "application/json"
    };
    
    // legacy header
    if (edpuzzle_data.token) {
        headers["authorization"] = edpuzzle_data.token;
    }
    
    let csrf = await get_csrf();
    headers["x-csrf-token"] = csrf;
    
    return headers;
}

async function get_attempt() {
  let user_id = assignment.teacherAssignments[0].preferences.teacherId; //placeholder
  // modified
  
  
  let id = get_assignment_id();
  let attempt;
  
  //let attempt_url;
  if (assignment_mode == "new") {
      let student_id = assignment.assignmentLearner.studentId; 
      attempt = assignment.assignmentLearner;

  } else {
       let url = "https://edpuzzle.com/api/v3/assignments/" + id + "/attempt";
       let response = await fetch_wrapper(url);
       attempt = await response.json();
  }
  return attempt;
}

async function init() {
  try {
    // ui init
    if (open_notice_button) {
        open_notice_button.onclick = () => {
             alert(gpl_text);
        };
    }
    if (open_console_button) {
        // The console is kinda broken. Sorry about that 
        open_console_button.onclick = () => {
            const consoleWindow = window.open("", "_blank", "width=600,height=400");
            if (consoleWindow) {

                consoleWindow.document.open();
                consoleWindow.document.write(console_html);
                consoleWindow.document.close();
                
                // I tried different things to get it to style properly
                // but it didn't work so it looks ugly rn
                const style = consoleWindow.document.createElement("style");
                style.textContent = POPUP_CSS;
                consoleWindow.document.head.appendChild(style);
                
                // Inject logs, wait for dom?
                setTimeout(() => {
                    const table = consoleWindow.document.getElementById("console_table");
                    if (table) {
                        console_log.forEach(entry => {
                            const row = consoleWindow.document.createElement("tr");

                            row.innerHTML = \`<td class="p-1 border-r border-slate-600 w-32 shrink-0">\${entry.timestamp}</td><td class="p-1 break-words">\${entry.message} \${entry.data ? JSON.stringify(entry.data) : ""}</td>\`;
                            table.appendChild(row);
                        });
                    }
                }, 100);
            }
        };
    }

    // ----
    // Added copy debug info feature
    // this was really helpful for testing but you can remove it
    // there was a convinent empty space in the bottom right of the footer
    // ----

    const footer = document.getElementById("footer");
    if (footer) {
        const debugLinkDiv = document.createElement("div");
        debugLinkDiv.className = "flex gap-2 items-center w-52";
        debugLinkDiv.innerHTML = \`
           <svg class="footer_icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
           <div>
             <p class="text-xs">Troubleshooting:</p>
             <a class="link" href="#" id="copy_debug_btn">Copy Debug Info</a>
           </div>
        \`;
        footer.appendChild(debugLinkDiv);
        document.getElementById("copy_debug_btn").onclick = copyDebugInfo;
    }


    let assignment_id = get_assignment_id();
    let url = "https://edpuzzle.com/api/v3/assignments/" + assignment_id;
    
    logDebug("Fetching assignment data", { url, token: edpuzzle_data.token ? "Present" : "Missing" });
    
    // add authorization header
    const options = { credentials: 'include', headers: {} };
    if (edpuzzle_data.token) {
        options.headers["Authorization"] = "Bearer " + edpuzzle_data.token;
    }
    
    let response = await fetch_wrapper(url, options);

    if (response.ok) {
        assignment = await response.json();
        assignment_mode = "old"; 
    } else {
        logDebug("Primary assignment fetch failed, trying 'new' mode fallback", response.status);
        
        let user_id;
        try {
             let me_url = "https://edpuzzle.com/api/v3/users/me";
             let me_response = await fetch_wrapper(me_url, options);
             if (!me_response.ok) throw new Error("Could not fetch user info");
             let me_data = await me_response.json();
             user_id = me_data._id;
        } catch(e) {
            throw new Error("Failed to get user ID for new assignment mode: " + e.message);
        }
        
        let new_url = "https://edpuzzle.com/api/v3/learning/assignments/" + assignment_id + "/users/" + user_id;
        logDebug("Fetching new assignment data", { new_url });
        
        response = await fetch_wrapper(new_url, options);
        if (!response.ok) throw new Error("Failed to fetch new assignment data: " + response.status);
        
        assignment = await response.json();
        assignment_mode = "new";
    }
    
    logDebug("Assignment data received", { mode: assignment_mode });

    // update ui
    let title = document.getElementById("title");
    if (title) title.innerText = "Edpuzzle Answers"; 
    
    // populate media global
    await get_questions(); 
    try {
        let assignmentTitle = "Unknown Title";
        let authorName = "Unknown Author";
        let thumbnailSrc = "";
        let dueDateText = "No due date";
        
        if (assignment_mode == "new") {
            if (assignment.assignment) {
                assignmentTitle = assignment.assignment.title;
            }
            if (assignment.teacher) {
                authorName = assignment.teacher.name;
            } else if (assignment.assignmentLearner && assignment.assignmentLearner.enrolledBy) {
                authorName = assignment.assignmentLearner.enrolledBy.fullName;
            }
            
            // thumbnail
            if (media) {
                thumbnailSrc = media.thumbnailUrl || media.thumbnailURL;

                // not needed
            //} else if (assignment.assignment && assignment.assignment.attachments) {
            //     let att = assignment.assignment.attachments.find(a => a.id == attachment_id);
            //     if (att) thumbnailSrc = att.thumbnailUrl;
            }
            
            // due date
            if (assignment.assignmentLearner && assignment.assignmentLearner.dueDate) {
                dueDateText = "Due on " + (new Date(assignment.assignmentLearner.dueDate)).toDateString();
            }

        } else {
             // old assignments
             if (assignment.teacherAssignments && assignment.teacherAssignments[0]) {
                 let ta = assignment.teacherAssignments[0];
                 if (ta.classroom) assignmentTitle = ta.classroom.name;
                 if (ta.preferences && ta.preferences.dueDate) {
                     dueDateText = "Due on " + (new Date(ta.preferences.dueDate)).toDateString();
                 }
                 if (media) thumbnailSrc = media.thumbnailURL || media.thumbnailUrl;
             }
        }
        
        document.getElementById("assignment_title").innerText = assignmentTitle;
        document.getElementById("assignment_author").innerText = authorName;
        document.getElementById("assignment_end").innerText = dueDateText;
        if (thumbnailSrc) {
            if (thumbnailSrc.startsWith("/")) {
                thumbnailSrc = "https://edpuzzle.com" + thumbnailSrc;
            }
            document.getElementById("thumbnail_img").src = thumbnailSrc;
        }
        
    } catch(e) {
        logDebug("Error updating UI", e.message);
    }
    
    content_loaded = true;
    skipper_button.disabled = false;
    answers_button.disabled = false;
    unfocus_checkbox.disabled = false;
    speed_dropdown.disabled = false;

    //or else it just says loading... forever and I'm too lazy to fix it properly
    status_text.innerText = "Loaded successfully.";


    parse_questions();

    skipper_button.onclick = skip_video;
    answers_button.onclick = answer_questions;
    unfocus_checkbox.onchange = toggle_unfocus;
    speed_dropdown.onchange = video_speed;
    custom_speed.oninput = () => {
         custom_speed_value.innerText = custom_speed.value;
         video_speed();
    };

  } catch (error) {
    status_text.innerHTML = "Error: " + error.message;
    console.error(error);
    logDebug("Init Error", error.message);
  }
}


async function get_media() {
    let media_id;
    if (assignment_mode == "new") {
        let filtered = assignment.assignment.attachments.filter((attachment) => {
            return attachment.id == attachment_id;
        });
        media_id = filtered[0].contentId;
        // attachment_id unused in original main.js?

        if (!media_id && assignment.assignment.contentId) media_id = assignment.assignment.contentId;
    } else {
        media_id = assignment.teacherAssignments[0].contentId;
    }
    debugData.mediaId = media_id;
    logDebug("Fetching media from backend", { media_id, base_url });

    // direct fetch because blob url
    const headers = {};
    if (edpuzzle_data.token) {
        // Backend expects standard Bearer
        headers["Authorization"] = "Bearer " + edpuzzle_data.token;
    }
    
    try {
        let r = await fetch(base_url + "/api/media/" + media_id, { headers });
        if (!r.ok) {
             throw new Error("Backend returned status: " + r.status);
        }
        media = await r.json();
        
        if (media.error) {
           throw new Error(media.error);
        }
        
        questions = media.questions;
    } catch(e) {
        logDebug("Backend fetch failed, trying local fallback", e.message);
        
        if (assignment && assignment.teacherAssignments && assignment.teacherAssignments.length > 0) {
        }
        
        if (assignment && assignment.questions) {
            questions = assignment.questions;
            media = assignment; 
            logDebug("Used local fallback questions (Root assignment object)");
        }
        else if (assignment && assignment.assignment && assignment.assignment.questions) {
            questions = assignment.assignment.questions;
            media = assignment.assignment; 
            logDebug("Used local fallback questions (Nested assignment object)");
        } else {
            throw e;
        }
    }
    return questions;
}


// logic from app/skipper.js
// needs more testing


async function skip_video(attempt=null, update_button=true) {
  if (update_button) {
    skipper_button.value = "Skipping video...";
    skipper_button.disabled = true;
  }

  if (!attempt) attempt = await get_attempt();
  await post_watchtime(attempt);

  if (update_button) {
    skipper_button.value = "Video skipped successfully.";
    if (window.opener) window.opener.postMessage({ type: 'reload_opener' }, '*');
  }
}

async function post_watchtime(attempt) {
  let id = attempt._id || attempt.id;
  let watch_url = "https://edpuzzle.com/api/v4/media_attempts/" + id + "/watch";
  if (assignment_mode === "new") {
    watch_url = "https://edpuzzle.com/api/v3/learning/time_intervals/submission/" + id + "/watch";
  }
  let content = { "timeIntervalNumber": 10 };
  await fetch_wrapper(watch_url, {
    method: "POST",
    headers: await construct_headers(),
    body: JSON.stringify(content)
  });
}


// logic from app/autoanswers.js



async function answer_questions() {
  answers_button.value = "Submitting answers...";
  skipper_button.disabled = true;
  answers_button.disabled = true;

  let attempt = await get_attempt();
  await skip_video(attempt, false);

  let filtered_questions = filter_questions(questions);
  await post_answers(attempt, filtered_questions, progress => {
    answers_button.value = "Submitting answers (" + (progress + 1) + "/" + filtered_questions.length + ")...";
  });

  answers_button.value = "Answers submitted successfully.";
  if (window.opener) window.opener.postMessage({ type: 'reload_opener' }, '*');
}

function filter_questions(questions_list) {
  let filtered_questions = [];
  for (let i = 0; i < questions_list.length; i++) {
      let question = questions_list[i];
      if (question.type != "multiple-choice") continue;
      if (filtered_questions.length == 0) {
          filtered_questions.push([question]);
      } else if (filtered_questions[filtered_questions.length - 1][0].time == question.time) {
          filtered_questions[filtered_questions.length - 1].push(question);
      } else {
          filtered_questions.push([question]);
      }
  }
  return filtered_questions;
}

async function post_answers(attempt, filtered_questions, progress_callback = null) {
  let attempt_id = attempt._id || attempt.id;
  for (let i = 0; i < filtered_questions.length; i++) {
      let question_part = filtered_questions[i];
      await post_answer(attempt_id, question_part);
      if (progress_callback) {
          progress_callback(i);
      }
  }
}

async function post_answer(attempt_id, questions_part) {
    let answers_url = "https://edpuzzle.com/api/v3/attempts/" + attempt_id + "/answers";
    let content = { answers: [] };

    if (assignment_mode === "new") {
        answers_url = "https://edpuzzle.com/api/v3/learning/submissions/" + attempt_id + "/answers";
        content = {
            answerQuestions: [],
            answerSaveStatus: "answered"
        };
    }

    for (let i = 0; i < questions_part.length; i++) {
        let question = questions_part[i];
        let correct_choices = [];
        for (let j = 0; j < question.choices.length; j++) {
            let choice = question.choices[j];
            if (choice.isCorrect) {
                correct_choices.push(choice._id);
            }
        }
        if (assignment_mode === "new") {
            content.answerQuestions.push({
                questionData: { choiceIds: correct_choices },
                questionId: question._id,
                questionType: "multiple-choice"
            });
        } else {
            content.answers.push({
                questionId: question._id,
                choices: correct_choices,
                type: "multiple-choice"
            });
        }
    }

    let response = await fetch_wrapper(answers_url, {
        method: "POST",
        headers: await construct_headers(),
        body: JSON.stringify(content)
    });

    if (response.status === 429) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        await post_answer(attempt_id, questions_part);
    }
}



// logic from app/videooptions.js



// Note: video manipulation needs to happen in the opener, not here
// But the controls are here to send commands to opener
function toggle_unfocus() {
    sendVideoCommand('toggle_unfocus', unfocus_checkbox.checked);
}

function video_speed() {
    let media_source = media.source; // media object should be available globally
    let speed = parseFloat(speed_dropdown.value);
    
    // UI update logic from videooptions.js
    if (speed == -1) {
        custom_speed_container.classList.remove("hidden");
        custom_speed_container.classList.add("flex");
        speed = parseFloat(custom_speed.value);

        //force changing the video speed
        if (media_source == "edpuzzle") {
            custom_speed.min = 0.1;
            custom_speed.max = 9.9;
            custom_speed.step = 0.1;
            custom_speed_value.innerHTML = speed.toFixed(1);
        } else if (media_source == "youtube" || media_source == "vimeo") {
            custom_speed.min = 0.25;
            custom_speed.max = 2;
            custom_speed.step = 0.05;
            custom_speed_value.innerHTML = speed.toFixed(2);
        }
    } else {
        custom_speed_container.classList.remove("flex");
        custom_speed_container.classList.add("hidden");
    }

    //send command
    if (media_source == "edpuzzle") {
        sendVideoCommand('set_speed', speed);
    } else if (media_source == "youtube") {
        sendVideoCommand('set_youtube_speed', speed);
    } else if (media_source == "vimeo") {
        sendVideoCommand('set_vimeo_speed', speed);
    }
}

function sendVideoCommand(action, value) {
    if (window.opener) {
        window.opener.postMessage({
            type: 'manipulate_video',
            action: action,
            value: value
        }, '*');
    }
}

// additional modification/helper func

async function get_responses(questions_list) {
    let attempt = await get_attempt();
    // This function matches responses to questions (for UI display of what we answered?)
    // This logic was partly in main.js but we need it here.
    if (!attempt) return questions_list;
    
    // Simplification: just return list for now unless we need the responses logic
    // Actually, let's include it if we want to show what was answered.
    // ... skipping for brevity unless needed ...
    return questions_list;
}

// getting questions. Fallbacks due to some issues I had with different classes

async function get_questions() {
    questions = await get_media(); // Fetch questions from backend
    
    let mc_questions = questions.filter(q => q.type === "multiple-choice");
    if (mc_questions.length > 0) {
        let valid_mc_count = 0;
        
        // Check if answers are in the local assignment object. This is vibe-coded (sorry)
        let assignment_questions = [];
        if (assignment && assignment.assignment && assignment.assignment.questions) {
            assignment_questions = assignment.assignment.questions;
        }

        for (let question of mc_questions) {
            let correct_found = false;
            for (let choice of question.choices) {
                if (choice.isCorrect) {
                    correct_found = true;
                    break;
                }
            }

            // local fallback. As of 2/8/26, the edpuzzle.hs.vc api mirror returns questions without correct answers
            // So here we try to still display them. Should be easy fix unless edpuzzle strengthens anti-bot measures

            if (!correct_found && assignment_questions.length > 0) {
                let local_q = assignment_questions.find(q => q._id === question._id);
                if (local_q && local_q.choices) {
                    local_q.choices.forEach((local_choice, index) => {
                        if (local_choice.isCorrect && question.choices[index]) {
                            question.choices[index].isCorrect = true;
                            correct_found = true;
                        }
                    });
                }
            }

            if (correct_found) {
                valid_mc_count++;
            }
        }

        if (valid_mc_count === 0) {
            status_text.innerHTML = "<span class='text-amber-400'>Warning:</span> No answers found. (Is this assignment locked?)";
        } else if (valid_mc_count < mc_questions.length) {
            status_text.innerHTML = "<span class='text-amber-400'>Partial Success:</span> Found answers for " + valid_mc_count + "/" + mc_questions.length + " questions.";
        }
    }
}


function parse_questions() {
    if (questions == null) return;

    questions.sort((a, b) => a.time - b.time);

    for (let question of questions) {
        let min = fixed_length_int(Math.floor(question.time / 60), 2);
        let secs = fixed_length_int(Math.floor(question.time % 60), 2);
        let timestamp = "[" + min + ":" + secs + "]";

        if (question.body[0].text != "") {
            question.title = "<p>" + question.body[0].text + "</p>";
        } else {
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
                    list_item.innerHTML = "<p>" + choice.body[0].text + "</p>";
                } else {
                    list_item.innerHTML = choice.body[0].html;
                }
                choices_list.append(list_item);
            }
            choice_template.remove();
            table.placeholder("question_content").append(choices_list);
        } 
        
        questions_div.append(table);
    }
}

// debug copy. Again very helpful for testing
function copyDebugInfo() {
    const info = {
        userAgent: navigator.userAgent,
        ...debugData,
        logs: console_log
    };
    navigator.clipboard.writeText(JSON.stringify(info, null, 2)).then(() => {
        alert("Debug info copied to clipboard!");
    });
}

init();

})();
//end popup
        `;
    }

    init();

})();
