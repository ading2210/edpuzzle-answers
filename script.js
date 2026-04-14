//Copyright (C) 2026 ading2210
//Copyright (C) 2026 ading2210
//see README.md for more information

//this script mainly just serves to load the rest of the program

let mirrors = [
  "https://edpuzzle.hs.vc", //down rn
  "https://edpuzzle.librecheats.net", //2nd mirror
  "https://ed.thesupersupersigma.com" // Backup mirror
];

async function try_mirror(mirror) {
  let r = await fetch(mirror + "/open.js", {cache: "no-cache"});
  let script = await r.text();
  window.base_url = mirror;
  eval(script);
}

async function init() {
  // Use ading2210's hostname mapping to detect instruction pages automatically
  let mirror_hostnames = mirrors.map(url => new URL(url).hostname);
  if (mirror_hostnames.includes(window.location.hostname)) {
    alert("To use this, drag this button into your bookmarks bar. Then, run it when you're on an Edpuzzle assignment.");
    return;
  }

  if (document.dev_env) {
    return try_mirror(document.dev_env);
  }

  // 1. Create a selection prompt for the user
  let message = "Select a mirror to use:\n";
  mirrors.forEach((m, i) => message += `${i + 1}: ${m}\n`);
  message += `${mirrors.length + 1}: Enter Custom URL`;

  let choice = prompt(message, "1");

  // 2. Handle Custom URL option
  if (choice == (mirrors.length + 1).toString()) {
    let custom = prompt("Enter the full URL of the custom mirror (e.g. http://localhost:8080):");
    if (custom) {
      try {
        await try_mirror(custom);
        return;
      } catch (e) {
        alert("Custom mirror failed.");
      }
    }
  } 
  
  // 3. Handle specific mirror selection
  let index = parseInt(choice) - 1;
  if (mirrors[index]) {
    try {
      await try_mirror(mirrors[index]);
      return;
    } catch (e) {
      alert("Selected mirror is down. Trying others...");
    }
  }

  // 4. Default Fallback (Automatic cycle if selection fails)
  for (let mirror of mirrors) {
    try {
      await try_mirror(mirror);
      return;
    } catch {}
  }

  alert("Error: Could not connect to any of the mirrors. Check that they're not blocked or down.");
}

init();