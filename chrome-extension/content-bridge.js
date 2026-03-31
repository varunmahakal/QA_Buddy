/* QA Buddy — Content Bridge
 * Runs in ISOLATED world on every page.
 * Listens for the __qa_buddy_session__ CustomEvent dispatched by the QA Buddy
 * React app, then forwards the session data to the background service worker
 * which saves it to chrome.storage.session.
 */
'use strict';

window.addEventListener('__qa_buddy_session__', function (e) {
  chrome.runtime.sendMessage({ type: 'QA_BUDDY_SESSION', session: e.detail });
});
