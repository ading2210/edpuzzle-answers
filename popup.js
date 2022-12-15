var video_script = null;

if (typeof base_url == "undefined") {
  var base_url = "https://raw.githubusercontent.com/ading2210/edpuzzle-answers/main";
}

function http_exec(url) {
  http_get(url, function(){
    eval(this.responseText);
  });
}
function skip_video() {
  var button = document.getElementById("skipper");
  button.disabled = true; 
  button.value = "Downloading script...";

  http_exec(base_url+"/skipper.js");
}
function answer_questions() {
  var skipper = document.getElementById("skipper");
  var button = document.getElementById("answers_button");
  skipper.disabled = true;
  button.disabled = true; 
  button.value = "Downloading script...";

  http_exec(base_url+"/autoanswers.js");
}
function video_speed() {
  if (video_script == null) {
    http_get(base_url+"/videospeed.js", function(){
      video_script = this.responseText;
      eval(video_script);
    });
  }
  else {
    eval(video_script);
  }
}