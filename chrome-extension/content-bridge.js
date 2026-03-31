/* QA Buddy — Content Bridge
 * Runs in ISOLATED world on every page.
 * Listens for the __qa_buddy_session__ CustomEvent dispatched by the QA Buddy
 * React app, then forwards the session data to the background service worker
 * which saves it to chrome.storage.session.
 */
'use strict';

// Forward any new session event to the background worker
window.addEventListener('__qa_buddy_session__', function (e) {
  chrome.runtime.sendMessage({ type: 'QA_BUDDY_SESSION', session: e.detail });
});

// On load: ask the page if it already has a session (handles the case where
// this content script loads AFTER the user already clicked "Start Recording" —
// e.g. the tab was open before the extension was installed/reloaded).
window.dispatchEvent(new CustomEvent('__qa_buddy_request_session__'));
