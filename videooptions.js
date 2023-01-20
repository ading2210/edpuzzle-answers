var unfocus_checkbox = document.getElementById("pause_on_focus");
if (typeof opener.document.visability_change != "undefined") {
  unfocus_checkbox.checked = opener.document.visability_change
}

var js_text = `
window.addEventListener("visibilitychange", function(event) {
  console.log(document.visability_change)
  if (document.visability_change) {
    event.stopImmediatePropagation();
  }
}, true);
`;

function toggle_unfocus() {
  if (typeof opener.document.visability_change == "undefined") {
    opener.document.visability_change = unfocus_checkbox.checked;
    var script = opener.document.createElement("script");
    script.innerHTML = js_text;
    opener.document.body.appendChild(script);
  }
  opener.document.visability_change = unfocus_checkbox.checked;
}