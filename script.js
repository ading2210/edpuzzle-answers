//Copyright (C) 2023 ading2210
//see README.md for more information

//this script mainly just serves to load the rest of the program

var base_url;
if (typeof document.dev_env != "undefined") {
  base_url = document.dev_env;
}
else {
  base_url = "https://edpuzzle.hs.vc";
}

function init() {
  if (window.location.hostname == "edpuzzle.hs.vc") {
    alert("To use this, drag this button into your bookmarks bar. Then, run it when you're on an Edpuzzle assignment.");
  }
  else {
    fetch(base_url+"/app/main.js")
      .then(r => r.text())
      .then(r => eval(r))
  }
}

init();