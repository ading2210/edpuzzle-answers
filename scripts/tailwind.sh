#!/bin/bash

screen -dmS tailwind bash -c '
  tailwindcss -i ./app/css/popup.css -o ./app/css/dist.css -c ./app/tailwind.config.js -w -m
'