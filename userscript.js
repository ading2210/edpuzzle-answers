// ==UserScript==
// @name         Edpuzzle Answers (CSP Bypass)
// @namespace    https://github.com/ading2210/edpuzzle-answers
// @version      2.0
// @description  Loads Edpuzzle Answers script with CSP bypass for Tampermonkey/Violentmonkey
// @author       ading2210
// @match        https://edpuzzle.com/assignments/*/watch
// @match        https://edpuzzle.com/assignments/*/view
// @match        https://edpuzzle.com/lms/lti/assignments/*/watch
// @match        https://edpuzzle.com/lms/lti/assignments/*/view
// @grant        GM_xmlhttpRequest
// @connect      cdn.jsdelivr.net
// @connect      edpuzzle.hs.vc
// @run-at       document-end
// @license      AGPL-3.0-or-later
// ==/UserScript==

(function() {
    'use strict';

    console.log('Edpuzzle Answers userscript loading...');

    // Method 1: Try using GM_xmlhttpRequest (bypasses CSP)
    if (typeof GM_xmlhttpRequest !== 'undefined') {
        GM_xmlhttpRequest({
            method: 'GET',
            url: 'https://cdn.jsdelivr.net/gh/ading2210/edpuzzle-answers@latest/script.js',
            onload: function(response) {
                console.log('Script loaded via GM_xmlhttpRequest');
                try {
                    eval(response.responseText);
                } catch (e) {
                    console.error('Error executing script:', e);
                    alert('Error loading Edpuzzle Answers: ' + e.message);
                }
            },
            onerror: function(error) {
                console.error('Failed to load from CDN:', error);
                alert('Failed to load Edpuzzle Answers. Check console for details.');
            }
        });
    }
    // Method 2: Fallback to script injection
    else {
        console.log('GM_xmlhttpRequest not available, using script injection');
        var script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/gh/ading2210/edpuzzle-answers@latest/script.js';
        script.onerror = function() {
            console.error('Script injection failed');
            alert('Failed to load Edpuzzle Answers. Make sure you granted the required permissions in Tampermonkey/Violentmonkey.');
        };
        script.onload = function() {
            console.log('Script loaded via injection');
        };
        document.head.appendChild(script);
    }
})();
