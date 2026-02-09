//Copyright (C) 2023 ading2210
//see README.md for more information
import { media } from "./main.js";

if (typeof opener.document.visability_change != "undefined") {
  unfocus_checkbox.checked = opener.document.visability_change;
}
if (opener.document.video_speed) {
  speed_dropdown.value = opener.document.video_speed;
}
unfocus_checkbox.disabled = false;  
speed_dropdown.disabled = false;


export function toggle_unfocus() {
  let js_text = `
  window.addEventListener("visibilitychange", function(event) {
    console.log(document.visability_change)
    if (document.visability_change) {
      event.stopImmediatePropagation();
    }
  }, true);
  `;

  if (typeof opener.document.visability_change == "undefined") {
    opener.document.visability_change = unfocus_checkbox.checked;
    let script = opener.document.createElement("script");
    script.innerHTML = js_text;
    opener.document.body.appendChild(script);
  }
  opener.document.visability_change = unfocus_checkbox.checked;
}

export function update_slider(media_source, speed) {
  if (speed == -1) {
    custom_speed_container.classList.remove("hidden");
    custom_speed_container.classList.add("flex");
    speed = parseFloat(custom_speed.value);

    if (media_source == "edpuzzle") {
      custom_speed.min = 0.1;
      custom_speed.max = 9.9;
      custom_speed.step = 0.1;
      custom_speed_value.innerHTML = speed.toFixed(1);
    }
    else if (media_source == "youtube" || media_source == "vimeo") {
      custom_speed.min = 0.25;
      custom_speed.max = 2;
      custom_speed.step = 0.05;
      custom_speed_value.innerHTML = speed.toFixed(2);
    }
  }
  else {
    custom_speed_container.classList.remove("flex");
    custom_speed_container.classList.add("hidden");
  }
  return speed;
}

export function video_speed() {
  let media_source = media.source;
  let speed = parseFloat(speed_dropdown.value);
  opener.document.video_speed = speed;
  speed = this.update_slider(media_source, speed);

  //force changing the video speed
  if (media_source == "edpuzzle") {
    let video = opener.document.querySelector("video");
    Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, "playbackRate").set.call(video, speed);
    try {
      Object.defineProperty(video, "playbackRate", {
        set() {},
        get() {return 1} 
      });
    }
    catch (e) {}
  }
  
  else if (media_source == "youtube") {
    let iframe = opener.document.querySelector("iframe");
    
    if (iframe.id == null) {
      alert("Error: Could not find the Youtube iframe.");
      return;
    }
  
    let player = opener.YT.get(iframe.id);
    let events;
    //search for attribute that stores yt event listeners
    for (let key in player) {
      let item = player[key];
      if (item +"" != "[object Object]") continue;
      for (let key_2 in item) {
        let item_2 = item[key_2];
        
        if (Array.isArray(item_2) && typeof item_2[1] == "string" && item_2[1].startsWith("on")) {
          events = item[key_2];
          break;
        }
      }
      if (events) break;
    }
    
    for (let i=1; i<events.length; i+=3) {
      let event = events[i];
      if (event == "onPlaybackRateChange") {
        //overwrite event listener with a blank function
        events[i+1] = function(){};
      }
    }
    player.setPlaybackRate(speed);
  }

  else if (media_source == "vimeo") {
    let iframe = opener.document.querySelector("iframe");
    let player = new opener.Vimeo.Player(iframe); 
    player.off("playbackratechange");
    player.setPlaybackRate(speed);
  }
  
  else {
    alert("Error: Unrecognized video source.");
  }
}  
