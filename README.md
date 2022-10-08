# Edpuzzle Answers Fetcher Script
![jsdelivr monthly badge](https://data.jsdelivr.com/v1/package/gh/ading2210/edpuzzle-answers/badge/month)
![jsdelivr weekly badge](https://data.jsdelivr.com/v1/package/gh/ading2210/edpuzzle-answers/badge/week)
![jsdelivr daily badge](https://data.jsdelivr.com/v1/package/gh/ading2210/edpuzzle-answers/badge/day)

<img src="https://raw.githubusercontent.com/ading2210/edpuzzle-answers/main/images/screenshot2.png" alt="A screenshot of the generated webpage" width="500"/>

This bookmarklet can fetch the answers for the multiple choice questions on any Edpuzzle assignment. It can also skip the entire video, but you will still have to manually answer the qustions.

## Features:
 - Can fetch and display the multiple-choice answers for any Edpuzzle assignment
 - Includes a video skipper which allows for arbitrary navigation within an assignment
 - Shows various stats about the assignment
 - Has a decent looking GUI
 - No login or extension required
 - Works for private Edpuzzle videos
 - Licensed under the GNU GPL v3 license

## Creating the bookmarklet:
### Method 1:
 1. Navigate to [https://edpuzzle.hs.vc](https://edpuzzle.hs.vc).
 2. Drag the button at the bottom of the page into your bookmarks bar.

### Method 2:
 1. Copy the following code into your clipboard:
 ```js
 javascript: if (window.location.hostname == "edpuzzle.com") {var script = document.body.appendChild(document.createElement("script")); script.src="https://cdn.jsdelivr.net/gh/ading2210/edpuzzle-answers@latest/script.js"; script.remove();} else {alert("Please run this on https://edpuzzle.com/assignments/[assignment_id]/watch")}
 ```
 2. Right click on your bookmarks bar and click "add page."
 3. Set the name of the bookmark to whatever you want.
 4. Paste in the code into the box for the url and save the bookmark.

## Using the bookmarklet: 
 1. Navigate to any Edpuzzle assignment.
 2. Make sure the url follows this format: `https://edpuzzle.com/assignments/{id}/watch`
 3. Click on the bookmarklet to run the script. 

## Credits
The code for the video skipper is based off of [this](https://github.com/ASmallYawn/EdpuzzleSkipper), with permission from the original author and some major refactoring.

All other code has been written solely by me.

This project is licensed under the GNU General Public License v3.0.