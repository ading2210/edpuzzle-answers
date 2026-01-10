# Troubleshooting Guide

## **⚠️ CRITICAL ISSUE: Content Security Policy (CSP) Blocking**

**As of January 2026, Edpuzzle has updated their Content Security Policy to block the bookmarklet.**

The bookmark is being blocked by Edpuzzle's CSP, which prevents connections to:
- `cdn.jsdelivr.net` (the CDN hosting the script)
- `edpuzzle.hs.vc` (the mirror server)

**Error in browser console:**
```
Refused to connect because it violates the document's Content Security Policy
```

### **Working Solutions:**

#### **Solution 1: Use Userscript Manager (RECOMMENDED - Most Reliable)**
Browser extensions can bypass CSP restrictions.

**Install Tampermonkey or Violentmonkey:**
- **Chrome/Edge/Brave**: [Install Tampermonkey](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)
- **Firefox**: [Install Tampermonkey](https://addons.mozilla.org/en-US/firefox/addon/tampermonkey/) or [Violentmonkey](https://addons.mozilla.org/en-US/firefox/addon/violentmonkey/)

**Then install the userscript:**
1. Click here: [userscript.js](https://raw.githubusercontent.com/ading2210/edpuzzle-answers/main/userscript.js)
2. Tampermonkey/Violentmonkey will prompt you to install
3. Click "Install"
4. Navigate to any Edpuzzle assignment - the script will load automatically
5. Click the bookmark or run it manually to open the interface

#### **Solution 2: Use Browser Developer Tools (Manual)**
The console has higher privileges and can bypass some CSP restrictions:
1. Press F12 to open Developer Tools
2. Go to Console tab
3. Paste and run this code:
```javascript
// Create and inject script element (bypasses fetch CSP)
var s = document.createElement('script');
s.src = 'https://cdn.jsdelivr.net/gh/ading2210/edpuzzle-answers@latest/script.js';
s.onerror = function() {
  console.error('Failed to load from CDN');
  // Try alternative CDN
  var s2 = document.createElement('script');
  s2.src = 'https://unpkg.com/edpuzzle-answers@latest/script.js';
  s2.onerror = function() {
    alert('All CDNs failed. Check network restrictions.');
  };
  document.head.appendChild(s2);
};
document.head.appendChild(s);
```

#### **Solution 3: Disable CSP (Chrome/Edge Only)**
**Warning: This reduces browser security. Use only for this specific purpose.**

1. Install the "Disable Content-Security-Policy" extension
2. Enable it only when using Edpuzzle
3. Disable it after you're done

#### **Solution 4: Self-Host the Script**
If you can run a local web server:
1. Clone the repository
2. Run the server locally (see README)
3. Modify the bookmarklet to point to localhost

---

## Bookmark Does Nothing When Clicked (Legacy Issues)

If you're not seeing CSP errors, follow these steps:

### Step 1: Check Popup Blocker
The bookmark requires popup permissions to work.

**Chrome/Edge/Brave:**
1. Look for a popup blocked icon in the address bar (usually on the right)
2. Click it and select "Always allow popups from edpuzzle.com"
3. Try the bookmark again

**Firefox:**
1. Look for the popup blocked notification in the address bar
2. Click "Preferences" and allow popups for edpuzzle.com
3. Try the bookmark again

### Step 2: Check Browser Console for Errors
1. Press F12 to open Developer Tools
2. Click the "Console" tab
3. Click the bookmark
4. Look for red error messages

**Common errors and solutions:**
- `Blocked by CSP` → Try the manual method below
- `Failed to fetch` → CDN or mirror is blocked by your network
- `Popup blocked` → See Step 1
- `undefined is not an object` → Page not fully loaded, refresh and try again

### Step 3: Run Diagnostic Script
Paste this into the browser console (F12 → Console tab) to diagnose the issue:

```javascript
(async function diagnose() {
  console.log("=== Edpuzzle Bookmark Diagnostic ===");

  // Test 1: Check URL
  console.log("1. Current URL:", window.location.href);
  const urlPattern = /https?:\/\/edpuzzle.com\/(lms\/lti\/)?assignments\/[a-f0-9]{1,30}\/(watch|view)/;
  const urlMatch = urlPattern.test(window.location.href);
  console.log("   URL matches pattern:", urlMatch ? "✓ YES" : "✗ NO");
  if (!urlMatch) {
    console.warn("   ⚠ You must be on an Edpuzzle assignment page!");
  }

  // Test 2: Check __EDPUZZLE_DATA__
  const hasData = typeof window.__EDPUZZLE_DATA__ !== 'undefined';
  console.log("2. __EDPUZZLE_DATA__ exists:", hasData ? "✓ YES" : "✗ NO");
  if (!hasData) {
    console.warn("   ⚠ Edpuzzle data not loaded. Try refreshing the page.");
  }

  // Test 3: Test CDN connectivity
  console.log("3. Testing CDN connection...");
  try {
    const r = await fetch("https://cdn.jsdelivr.net/gh/ading2210/edpuzzle-answers@latest/script.js", {
      method: 'HEAD',
      mode: 'no-cors'
    });
    console.log("   CDN reachable: ✓ Request sent");
  } catch (e) {
    console.error("   CDN ERROR: ✗", e.message);
    console.warn("   ⚠ CDN may be blocked by your network or firewall");
  }

  // Test 4: Test mirror connectivity
  console.log("4. Testing mirror connection...");
  try {
    const r = await fetch("https://edpuzzle.hs.vc/open.js", {
      method: 'HEAD',
      mode: 'no-cors'
    });
    console.log("   Mirror reachable: ✓ Request sent");
  } catch (e) {
    console.error("   Mirror ERROR: ✗", e.message);
    console.warn("   ⚠ Mirror may be blocked by your network or firewall");
  }

  // Test 5: Test popup permissions
  console.log("5. Testing popup permissions...");
  const popup = window.open("about:blank", "test", "width=100,height=100");
  if (popup) {
    console.log("   Popups: ✓ ALLOWED");
    popup.close();
  } else {
    console.error("   Popups: ✗ BLOCKED");
    console.warn("   ⚠ Enable popups for edpuzzle.com in your browser settings!");
  }

  console.log("\n=== Diagnostic Complete ===");
  console.log("Check for ✗ marks above to identify issues.");
})();
```

### Step 4: Manual Method (If bookmark still doesn't work)
If the bookmark continues to fail, you can manually run the script:

1. Navigate to an Edpuzzle assignment
2. Press F12 to open Developer Tools
3. Click the "Console" tab
4. Paste this code and press Enter:
```javascript
fetch("https://cdn.jsdelivr.net/gh/ading2210/edpuzzle-answers@latest/script.js")
  .then(r => r.text())
  .then(r => eval(r))
  .catch(e => alert("Error loading script: " + e.message));
```

### Step 5: Check Network Restrictions
If you're on a school or work network:
- The CDN (cdn.jsdelivr.net) might be blocked
- The mirror (edpuzzle.hs.vc) might be blocked
- Try using a different network or VPN

### Step 6: Try Alternative CDN
Create a new bookmark with this code that includes fallback:
```javascript
javascript:(async()=>{try{let r=await fetch("https://cdn.jsdelivr.net/gh/ading2210/edpuzzle-answers@latest/script.js");if(!r.ok)throw new Error("CDN failed");eval(await r.text())}catch(e){alert("Bookmark error: "+e.message+". Check console (F12) for details.")}})();
```

## Still Not Working?

1. Make sure you're on the correct URL format: `https://edpuzzle.com/assignments/{ID}/watch`
2. Try a different browser (Chrome, Firefox, Edge)
3. Disable browser extensions that might interfere (ad blockers, script blockers)
4. Clear browser cache and cookies for edpuzzle.com
5. Check GitHub issues: https://github.com/ading2210/edpuzzle-answers/issues

## Common Issues

### "To use this, drag this button into your bookmarks bar"
You're running the bookmark on the wrong page. Navigate to an actual Edpuzzle assignment first.

### "Please run this script on an Edpuzzle assignment"
The URL doesn't match the expected format. Make sure you're on a page like:
`https://edpuzzle.com/assignments/abc123/watch`

### Nothing happens, no errors
1. Popup blocker is active (most common)
2. Bookmark wasn't saved correctly (try recreating it)
3. JavaScript is disabled in browser settings
