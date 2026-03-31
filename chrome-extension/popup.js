/* QA Buddy Recorder — Extension Popup */
'use strict';

const headerSub    = document.getElementById('headerSub');
const sessionCard  = document.getElementById('sessionCard');
const sessionUrl   = document.getElementById('sessionUrl');
const sessionSteps = document.getElementById('sessionSteps');
const errorBox     = document.getElementById('errorBox');
const btnActivate  = document.getElementById('btnActivate');
const btnStop      = document.getElementById('btnStop');
const hint         = document.getElementById('hint');

let currentSession = null;
let currentTabId   = null;
let pollInterval   = null;

function showError(msg) { errorBox.textContent = msg; errorBox.style.display = 'block'; }
function clearError()   { errorBox.style.display = 'none'; }
function setHint(text)  { hint.textContent = text; }

(async () => {
  try {
    // 1. Get the current (target) tab
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    currentTabId = activeTab?.id;

    // 2. Read session from chrome.storage.session (saved by background.js via content-bridge.js)
    const stored = await chrome.storage.session.get('qaSession');
    let session = stored?.qaSession ?? null;

    // 2b. Fallback: if storage is empty, scan all open tabs for window.__QA_BUDDY_SESSION__
    //     (handles the case where the QA Buddy tab was open before the extension was installed
    //     or reloaded, so content-bridge.js was never injected into it)
    if (!session?.sessionId) {
      try {
        const allTabs = await chrome.tabs.query({ url: ['http://*/*', 'https://*/*'] });
        for (const tab of allTabs) {
          if (!tab.id) continue;
          try {
            const res = await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              world:  'MAIN',
              func:   () => window.__QA_BUDDY_SESSION__ ?? null,
            });
            const found = res?.[0]?.result;
            if (found?.sessionId) {
              session = found;
              await chrome.storage.session.set({ qaSession: session });
              break;
            }
          } catch (_) { /* tab not injectable — skip */ }
        }
      } catch (_) { /* tabs query failed */ }
    }

    if (!session?.sessionId) {
      headerSub.textContent = 'No active session';
      setHint('Open QA Buddy → Test Recorder → enter a URL → click "Start Recording".');
      return;
    }

    // 3. Session found — update UI
    currentSession = session;
    sessionCard.classList.remove('empty');
    sessionUrl.textContent = session.targetUrl || 'Recording in progress…';

    // 4. Check if recorder already running on current tab
    let isRecording = false;
    try {
      const check = await chrome.scripting.executeScript({
        target: { tabId: currentTabId },
        world:  'MAIN',
        func:   () => !!window.__QABuddy__,
      });
      isRecording = check?.[0]?.result ?? false;
    } catch (_) {}

    if (isRecording) {
      headerSub.textContent = 'Recorder is active';
      sessionSteps.style.display = 'block';
      sessionSteps.textContent = 'Recording…';
      btnActivate.disabled = true;
      btnStop.disabled = false;
      setHint('Perform your test. Click Stop when done.');
      startPolling();
    } else {
      headerSub.textContent = 'Session ready ✓';
      btnActivate.disabled = false;
      btnStop.disabled = true;
      setHint('Click "Activate Recorder" then perform your test actions on this page.');
    }

  } catch (err) {
    showError('Error: ' + (err.message || err));
    headerSub.textContent = 'Something went wrong';
  }
})();

// ── Activate ─────────────────────────────────────────────────────────────────
btnActivate.addEventListener('click', async () => {
  if (!currentSession || !currentTabId) return;
  clearError();
  btnActivate.disabled = true;
  btnActivate.textContent = 'Injecting…';

  try {
    // Write session config into the target tab's window (MAIN world)
    await chrome.scripting.executeScript({
      target: { tabId: currentTabId },
      world:  'MAIN',
      func:   (s) => { window.__QA_BUDDY_SESSION_INJECT__ = s; },
      args:   [currentSession],
    });

    // Inject recorder.js into MAIN world — bypasses CSP completely
    await chrome.scripting.executeScript({
      target: { tabId: currentTabId },
      world:  'MAIN',
      files:  ['recorder.js'],
    });

    headerSub.textContent = 'Recorder active';
    btnActivate.textContent = '▶ Activate Recorder';
    btnActivate.disabled = true;
    btnStop.disabled = false;
    sessionSteps.style.display = 'block';
    sessionSteps.textContent = '0 steps recorded';
    setHint('Perform your test. Steps stream to QA Buddy in real-time.');
    startPolling();
  } catch (err) {
    showError('Inject failed: ' + (err.message || err));
    btnActivate.disabled = false;
    btnActivate.textContent = '▶ Activate Recorder';
  }
});

// ── Stop ──────────────────────────────────────────────────────────────────────
btnStop.addEventListener('click', async () => {
  if (!currentTabId) return;
  clearError();
  btnStop.disabled = true;
  stopPolling();

  try {
    await chrome.scripting.executeScript({
      target: { tabId: currentTabId },
      world:  'MAIN',
      func:   () => { if (window.__QABuddy__) window.__QABuddy__.stop(); },
    });
    // Clear the session from storage so next recording starts fresh
    await chrome.storage.session.remove('qaSession');
    headerSub.textContent = 'Recording stopped';
    sessionSteps.textContent = 'Done — switch to QA Buddy to review';
    setHint('Switch to QA Buddy to review steps and generate your test case.');
  } catch (err) {
    showError('Stop failed: ' + (err.message || err));
    btnStop.disabled = false;
  }
});

// ── Step count polling ────────────────────────────────────────────────────────
function startPolling() {
  stopPolling();
  pollInterval = setInterval(async () => {
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId: currentTabId },
        world:  'MAIN',
        func:   () => (window.__QABuddy__ ? window.__QABuddy__.stepCount() : -1),
      });
      const count = results?.[0]?.result ?? -1;
      if (count === -1) { stopPolling(); return; }
      sessionSteps.textContent = count + (count === 1 ? ' step' : ' steps') + ' recorded';
    } catch (_) { stopPolling(); }
  }, 1500);
}

function stopPolling() {
  if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }
}
