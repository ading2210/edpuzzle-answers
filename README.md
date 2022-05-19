### Edpuzzle Answer Fetcher Script

This bookmarklet can fetch the answers for multiple choice questions on any edpuzzle assignment:

To use it, copy-paste the following code into the url of a new bookmark, and click it when on an Edpuzzle assignment:
```js
javascript: var script = document.body.appendChild(document.createElement("script")); script.src="https://edpuzzle.hs.vc/script.js"; script.remove();
```