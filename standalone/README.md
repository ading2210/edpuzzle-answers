# Edpuzzle Answers Standalone by NorthernChicken
Refactored combination of the files in app/ into one single bookmarklet that can be copy+pasted into the console.

# Why?
In feb 2026 Edpuzzle changed their content security policy (csp) to block sites like jsdelivr and edpuzzle.hs.vc which this program uses to inject the js and get api data. The new csp is a whitelist, so simply creating a new mirror would not work. The only way to use the script now is to copy+paste the entire thing into the browser console...

## How
1. The bookmarklet opens a popup using a blob: URL. This works as the blob does not inherit the edpuzzle's csp. 
2. To access the assignment token, the popup uses `window.opener.postMessage` to ask the main Edpuzzle window to fetch data on its behalf
3. Finding the auth token was difficult when behind a blob url. There are multiple fallback methods: `window.__EDPUZZLE_DATA__`, localStorage, cookies, or the internal webpack store

## Building
You don't need to build, I incluided a pre-built script in standalone/dist. For development,

```node standalone/build.js```

this builds from standalone/entry.js and the original html/css

for testing on your own server, change ```BASE_URL```  in entry.js to point to localhost instead of a mirror.

# Known issues

- The GUI js console is not styled. I couldn't figure this out.
- Open ended questions answering doesn't work, I don't have an API key to test it.