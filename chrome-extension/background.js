/* QA Buddy — Background Service Worker
 * Receives session data from content-bridge.js and stores it in
 * chrome.storage.session so the popup can read it reliably.
 *
 * Also auto re-injects recorder.js after full-page navigations so that
 * recording is not interrupted when the target page redirects.
 */
'use strict';

// ── Session bridge ────────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener(function (msg) {
  if (msg.type === 'QA_BUDDY_SESSION' && msg.session?.sessionId) {
    chrome.storage.session.set({ qaSession: msg.session });
  }
});

// ── Auto re-inject after full-page navigation ────────────────────────────────
// When the user is recording and the target page redirects (e.g. login flow,
// form submit, etc.) the injected recorder.js is destroyed with the old page.
// We watch chrome.tabs.onUpdated and re-inject once the new page has loaded.
chrome.tabs.onUpdated.addListener(async function (tabId, changeInfo) {
  if (changeInfo.status !== 'complete') return;

  const stored = await chrome.storage.session.get('activeRecording');
  const rec = stored?.activeRecording;
  if (!rec || rec.tabId !== tabId) return;

  // Small delay to let the new page's DOM settle
  await new Promise(function (resolve) { setTimeout(resolve, 300); });

  try {
    // Set session config in MAIN world before injecting recorder
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      world:  'MAIN',
      func:   function (s) { window.__QA_BUDDY_SESSION_INJECT__ = s; },
      args:   [rec.session],
    });

    // Re-inject recorder.js — it checks window.__QABuddy__ and skips if
    // somehow already present, otherwise starts fresh on the new page
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      world:  'MAIN',
      files:  ['recorder.js'],
    });
  } catch (err) {
    console.warn('[QA Buddy] Auto re-inject after navigation failed:', err.message);
  }
});
