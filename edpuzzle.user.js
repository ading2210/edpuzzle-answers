// ==UserScript==
// @name         edpuzzle-answers script launcher
// @namespace    edpuzzle.hs.vc
// @match        https://edpuzzle.com/*
// @grant        none
// @version      1.1.0
// @author       ading2210
// @description  This userscript provides a convenient way to launch the edpuzzle-answers script with mirror support.
// @downloadURL  https://raw.githubusercontent.com/ading2210/edpuzzle-answers/refs/heads/main/edpuzzle.user.js
// ==/UserScript==

function launch_script() {
  // Pointing to the main branch ensures everyone gets the latest mirror list
  fetch("https://raw.githubusercontent.com/ading2210/edpuzzle-answers/refs/heads/main/script.js")
    .then(r => r.text())
    .then(r => eval(r));
}

function main() {
  const img_url = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAFcUlEQVR4AZxXe0xWZRj/nc9UMLkoqCmJHwJaLFcDnDovwxmXKa5yMLdctdXyEpWKpNOVM7cy76Bmaq3VuuhCQFR0Of6J4UoDGuEayaXFZcWtT3BZxOX0ew7f+TjnfOeDT8+e3/s+t/d5fu/3Hs45OFRA1QH/rrFM20ycIlYT9y16P5kdxtXiMNo2eiB93xJvExFEQVxUwGlVzRxD3S+x9jARkArWBPG5EcD5EvEo8aT60/x9V4/H/tPY2rt+67rv6tXaxUH0jyh2tR0KQIHpskmU5sVMchLL1YqEmRhQr6YtCg6+cDgaH+V3OLe/3/CzeitpIuMPEXOJeEKOixPPWRNN9QxsrGi/gCger1sxkBhPVyERSyznzmdw5jGowZyRuigEhQejkfd1mzNzc3WdouBX+muJSqKLeNNQi+aQ6D01AuLSHaLrcC88TzuOWK5WLpiKwcFr1EMIj6xcEoLzB2ajpPzOIxszpjhWrQiJbix+IufglogW1sjzJLoVYy8PAYkZA2ILWCCds+x8EtSBa1ARCptr9bJQNBTPw8kdkc7LB2IqoyLGH8rJbX3cmmrtYSIgydYE8ZFEI8+8lMc4WWxfmB7uPnIhmSgnYMmsSMixeOBFQBLsSCCxIkxifsGm+aUj0bJ0i (rest of base64...)";
  const img = document.createElement("img");
  img.id = "_" + crypto.randomUUID();
  img.src = img_url;
  img.onclick = launch_script;

  const css = `
    #${img.id} {
      position: absolute;
      bottom: 8px;
      right: 8px;
      opacity: 0.2;
    }

    #${img.id}:hover {
      opacity: 1.0;
    }
  `;
  const style = document.createElement("style");
  style.innerHTML = css;

  document.body.append(style);
  document.body.append(img);
}

main();