### Edpuzzle Answer Fetcher Script

This bookmarklet can fetch the answers for multiple choice questions on any edpuzzle assignment:

To use it, copy-paste the following code into the url of a new bookmark, and click it when on an Edpuzzle assignment:
```js
javascript: if (window.location.hostname == "edpuzzle.com") {var script = document.body.appendChild(document.createElement("script")); script.src="https://cdn.jsdelivr.net/gh/ading2210/edpuzzle-answers/script.js"; script.remove();} else {alert("Please run this on https://edpuzzle.com/assignments/[assignment_id]/watch")}
```