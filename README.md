### Edpuzzle Answer Fetcher Script
![jsdelivr badge](https://data.jsdelivr.com/v1/package/gh/ading2210/edpuzzle-answers/badge)

This bookmarklet can fetch the answers for multiple choice questions on any edpuzzle assignment. It can also skip the entire video, but you will still have to manually answer the qustions.

To use it, copy-paste the following code into the url of a new bookmark, and click it when on an Edpuzzle assignment:
```js
javascript: if (window.location.hostname == "edpuzzle.com") {var script = document.body.appendChild(document.createElement("script")); script.src="https://cdn.jsdelivr.net/gh/ading2210/edpuzzle-answers@latest/script.js"; script.remove();} else {alert("Please run this on https://edpuzzle.com/assignments/[assignment_id]/watch")}
```

<img src="https://raw.githubusercontent.com/ading2210/edpuzzle-answers/main/images/screenshot1.png" alt="A screenshot of the generated webpage" width="400"/>

The code for the video skipper based off of [here](https://github.com/ASmallYawn/EdpuzzleSkipper), with permission from the original author and some major refactoring.