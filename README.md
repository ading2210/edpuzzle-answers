# Edpuzzle Answers Script
![jsdelivr monthly badge](https://data.jsdelivr.com/v1/package/gh/ading2210/edpuzzle-answers/badge/month)
![jsdelivr weekly badge](https://data.jsdelivr.com/v1/package/gh/ading2210/edpuzzle-answers/badge/week)
![jsdelivr daily badge](https://data.jsdelivr.com/v1/package/gh/ading2210/edpuzzle-answers/badge/day)

<img src="https://raw.githubusercontent.com/ading2210/edpuzzle-answers/main/static/images/screenshot4.png" alt="A screenshot of the generated webpage" width="500"/>

This bookmarklet can fetch the answers for the multiple choice questions on any Edpuzzle assignment. It can also skip the entire video, as well as automatically answer the questions and change the video speed.

Discord server: [edpuzzle.hs.vc/discord.html](https://edpuzzle.hs.vc/discord.html)

## Contents:
  - [Demo](#demo)
  - [Features](#features)
  - [Limitations](#limitations)
  - [Copyright Notice](#copyright-notice)
  - [Creating the Bookmarklet](#creating-the-bookmarklet)
  - [Using the Bookmarklet](#using-the-bookmarklet)
  - [Running the Server](#running-the-server)
  - [Credits](#credits)

## Demo: 
https://user-images.githubusercontent.com/71154407/199671842-c3016f8c-8c7f-4526-b274-5bdd48f3a131.mp4

Note: This video was recorded with an older version of the script, so the GUI shown is missing some features.

## Features:
 - Can fetch and display the multiple-choice answers for any Edpuzzle assignment
 - Can automatically answer all the multiple-choice questions in an assignment
 - Includes a video skipper which allows for arbitrary navigation within an assignment
 - Has a tool to change the video speed
 - Has an option to prevent auto-pausing the video when the tab is hidden
 - Shows various stats about the assignment
 - Has a decent looking GUI
 - No login or extension required
 - Uses about:blank so it doesn't go into your browser history
 - Works on private Edpuzzle videos
 - Supports Edpuzzles embedded in Canvas and Schoology
 - Licensed under the GNU AGPL v3 license

## Limitations:
 - This isn't able to answer open-ended questions or audio responses. Though in the future, I might use something like ChatGPT to complete those automatically. 
 - This doesn't currently work for most Edpuzzles that are embedded in a third party site. However, the script does work for Edpuzzles embeded in Canvas and Schoology.

## Copyright Notice:
```
ading2210/edpuzzle-answers: a Javascript bookmarklet that provides many useful utilities for Edpuzzle
Copyright (C) 2023 ading2210

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.
```

This project is licenced under the [GNU AGPL v3](https://github.com/ading2210/edpuzzle-answers/blob/main/LICENSE). Thus, you are not allowed to:
 - Reupload any part of the source code without crediting this repository.
 - Fork this repository, then change or remove the license.
 - Fork this project without linking to your modified source code. 

Forking or redistributing code from this repository is fine, as long as you abide by the terms of the GPL. However, if you don't, then I have every right to submit a DMCA takedown. Also, please don't try to take credit for work that is not yours by changing or removing the credits. Editing a couple of lines to remove my name and reuploading it doesn't make you look cool. Finally, if you decide to host a fork of this, you must also make the source code publicly available.

## Creating the bookmarklet:
A video tutorial for Chromium/Firefox can be found [here](https://www.youtube.com/watch?v=zxZzB2KXCkw). Safari is untested but it should still work. 

Mobile browsers should work but the process is a bit different. A tutorial can be found [here](https://cdn.discordapp.com/attachments/1075436295461027861/1076637252182081587/Edpuzzle.mp4) (video made by [Tuocan](https://github.com/tuocan)).

### Method 1:
 1. Navigate to [https://edpuzzle.hs.vc](https://edpuzzle.hs.vc).
 2. If you're on any Chromium-based browser (Chrome, Edge, Opera, Brave, etc), drag the button at the bottom of the page into your bookmarks bar.
 3. If you're on Firefox, right click on the button and then click "bookmark link."

### Method 2:
 1. Copy the following code into your clipboard:
 ```js
javascript: fetch("https://cdn.jsdelivr.net/gh/ading2210/edpuzzle-answers@latest/script.js").then(r => r.text()).then(r => eval(r))
 ```
 2. Right click on your bookmarks bar and click "add page."
 3. Set the name of the bookmark to whatever you want.
 4. Paste in the code into the box for the url and save the bookmark.

## Using the Bookmarklet: 
### On Regular Edpuzzles:
 1. Navigate to any Edpuzzle assignment.
 2. Make sure the url follows this format: `https://edpuzzle.com/assignments/{id}/watch`
 3. Click on the bookmarklet to run the script.
 4. If it doesn't work, make sure you allow popups from edpuzzle.com, then try again.

### Usage on Canvas/Schoology:
 1. Navigate to the assignment on Canvas/Schoology. For Canvas, the link should look similar to this: ```https://k12.instructure.com/courses/{id}/assignments/{id}```
 2. Click on the bookmarklet. The script should open the Edpuzzle assignment in a new tab.
 3. Re-run the bookmarklet to launch the full script.
 4. If this doesn't work, make sure you allow popups on both Edpuzzle and Canvas.

## Running the Server:
It is possible to simply host a static copy of this repository, however open-ended question answering will not be available. 

If you want to run the backend for yourself, follow these steps:
1. Clone this repository and cd into it.
2. Install Python (and optionally MongoDB) for your chosen Linux distro. Hosting on Windows should work but it is not supported.
3. Create a virtual environment by running `python3 -m venv .venv`, and activate it using `.venv/bin/activate`.
4. Install the needed dependencies by doing `pip3 install --upgrade -r requirements.txt`. 
5. Copy `config/default.json` to `config/config.json`, and fill out the relevant options.
6. Run the server using `python3 main.py`.

Make sure your web server has a domain and HTTPS support. The easiest way to do this is to use Nginx as a reverse proxy and Certbot for HTTPS.

### Server Configuration:
 - `discord` - The Discord invite ID visitors will be redirected to when navigating to `/discord`. 
 - `dev_mode` - Put Flask in debug mode, which will restart the server whenever a file is modified.
 - `include_traceback` - Enables stack traces in error response. This will expose the path of wherever the server's files are located.
 - `behind_proxy` - Tell Flask it is behind a reverse proxy such as Nginx. This allows IP rate limits to be enforced. 
 - `gzip_responses` - Compress response with gzip compression. 
 - `profanity_filter` - Whether or not to filter the text generation input for profanity.
 - `server_port` - The port that the web server will listen on.
 - `limiter_storage_uri` - The URI for the storage backend of the rate limiter. If you do not wish to use a database, you can set this to `memory://`. See the [Flask-Limiter documentation](https://flask-limiter.readthedocs.io/en/stable/#configuring-a-storage-backend) for more information.
 - `proxy_checker_threads` - The thread count for the proxy checker. On lower-end servers you should decrease this value.
 - `cloudflare.enabled` - Enable the Cloudflare Workers AI service.
 - `cloudflare.account_id` - The account ID for your Cloudflare account.
 - `cloudflare.token` - Your Cloudflare Workers AI token.
 - `rate_limits` - Sets the rate limit for each generator service. The format for each value is listed on the [Flask-Limiter documentation](https://flask-limiter.readthedocs.io/en/stable/configuration.html#rate-limit-string-notation).

## Credits:
The code for the video skipper is based off of [this](https://github.com/ASmallYawn/EdpuzzleSkipper), with permission from the original author and some major refactoring.

All other code has been written solely by me, [ading2210](https://github.com/ading2210).

This project contains icons from the the [Iconoir](https://iconoir.com/) icon library. 

This project is licensed under the GNU Affero General Public License v3.0.

![gnu agpl v3 logo](https://github.com/ading2210/edpuzzle-answers/raw/main/static/images/agpl_logo.png)

### Server-side Libraries:
| **Library**                                                                      | **License**                                                                          |
|----------------------------------------------------------------------------------|--------------------------------------------------------------------------------------|
| [Flask](https://flask.palletsprojects.com/en/2.2.x/)                             | [BSD-3-Clause](https://flask.palletsprojects.com/en/2.2.x/license/)                  |
| [Flask-Compress](https://github.com/colour-science/flask-compress)               | [MIT](https://github.com/colour-science/flask-compress/blob/master/LICENSE.txt)      |
| [Flask-Limiter](https://github.com/alisaifee/flask-limiter)                      | [MIT](https://github.com/alisaifee/flask-limiter/blob/master/LICENSE.txt)            |
| [Flask-CORS](https://github.com/corydolphin/flask-cors/)                         | [MIT](https://github.com/corydolphin/flask-cors/blob/master/LICENSE)                 |
| [lxml](https://lxml.de/)                                                         | [Multiple Licenses](https://github.com/lxml/lxml/blob/master/LICENSES.txt)           |
| [vercel-llm-api](https://github.com/ading2210/vercel-llm-api)                    | [GNU GPL v3](https://github.com/ading2210/vercel-llm-api/blob/main/LICENSE)          |
| [PyMongo](https://github.com/mongodb/mongo-python-driver)                        | [Apache-2.0](https://github.com/mongodb/mongo-python-driver/blob/master/LICENSE)     |
| [pytailwindcss](https://github.com/timonweb/pytailwindcss)                       | [MIT](https://github.com/timonweb/pytailwindcss/blob/main/LICENSE)                   |
| [alt-profanity-check](https://github.com/dimitrismistriotis/alt-profanity-check) | [MIT](https://github.com/dimitrismistriotis/alt-profanity-check/blob/master/LICENSE) |