/* QA Buddy — Background Service Worker
 * Receives session data from content-bridge.js and stores it in
 * chrome.storage.session so the popup can read it reliably.
 */
'use strict';

chrome.runtime.onMessage.addListener(function (msg) {
  if (msg.type === 'QA_BUDDY_SESSION' && msg.session?.sessionId) {
    chrome.storage.session.set({ qaSession: msg.session });
  }
});
