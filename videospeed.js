var button = document.getElementById("speed_button");
var speed_dropdown = document.getElementById("speed_dropdown");
var custom_speed = document.getElementById("custom_speed");
var custom_speed_label = document.getElementById("custom_speed_label");
var speed = parseFloat(speed_dropdown.value);
var media_source = document.assignment.medias[0].source;

if (speed == -1) {
  custom_speed.hidden = false;
  custom_speed_label.hidden = false;
  speed = parseFloat(custom_speed.value);
  custom_speed_label.innerHTML = "Speed: "+speed.toFixed(1);
}
else {
  custom_speed.hidden = true;
  custom_speed_label.hidden = true;
}

if (media_source == "edpuzzle") {
  let video = opener.document.querySelector("video");
  Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, "playbackRate").set.call(video, speed);
  try {
    Object.defineProperty(video, "playbackRate", {writable: false});
  }
  catch (e) {}
}

else if (media_source == "youtube") {
  let iframe = opener.document.querySelector("iframe");
  
  if (iframe.id == null) {
    alert("Error: Could not find the Youtube iframe.");
  }
  
  else {
    let player = opener.YT.get(iframe.id);
    let events = player.l.h;
    for (let i=1; i<events.length; i+=3) {
      let event = events[i];
      if (event == "onPlaybackRateChange") {
        events[i+1] = function(){};
      }
    }
    player.setPlaybackRate(speed);
  }
}

else {
  alert("Error: Unrecognized video source.");
}
