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
    // 1. Current (target) tab
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    currentTabId = activeTab?.id;

    // 2. Find the QA Buddy tab
    const qaTabMatches = await chrome.tabs.query({
      url: ['https://qabuddy.netlify.app/*', 'http://localhost:*/*', 'http://127.0.0.1:*/*']
    });

    if (qaTabMatches.length === 0) {
      headerSub.textContent = 'QA Buddy tab not found';
      setHint('Open QA Buddy and click "Start Recording" first.');
      return;
    }

    const qaTab = qaTabMatches[0];

    // 3. Read session from QA Buddy tab's MAIN world (where React sets window.__QA_BUDDY_SESSION__)
    let session = null;
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId: qaTab.id },
        world: 'MAIN',                          // ← must be MAIN to read page window vars
        func: () => window.__QA_BUDDY_SESSION__ ?? null,
      });
      session = results?.[0]?.result ?? null;
    } catch (err) {
      showError('Could not read session: ' + (err.message || err));
      headerSub.textContent = 'Permission error';
      return;
    }

    if (!session?.sessionId) {
      headerSub.textContent = 'No active session';
      setHint('Go to QA Buddy → Test Recorder → enter a URL → click "Start Recording".');
      return;
    }

    // 4. Session found — update UI
    currentSession = session;
    sessionCard.classList.remove('empty');
    sessionUrl.textContent = session.targetUrl || 'Recording in progress…';

    // 5. Check if recorder already running on current tab (MAIN world)
    let isRecording = false;
    try {
      const check = await chrome.scripting.executeScript({
        target: { tabId: currentTabId },
        world: 'MAIN',
        func: () => !!window.__QABuddy__,
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
      headerSub.textContent = 'Session ready';
      btnActivate.disabled = false;
      btnStop.disabled = true;
      setHint('Click "Activate Recorder" then perform your test actions.');
    }

  } catch (err) {
    showError('Unexpected error: ' + (err.message || err));
    headerSub.textContent = 'Error';
  }
})();

// ── Activate ─────────────────────────────────────────────────────────────────
btnActivate.addEventListener('click', async () => {
  if (!currentSession || !currentTabId) return;
  clearError();
  btnActivate.disabled = true;
  btnActivate.textContent = 'Injecting…';

  try {
    // Step 1: Write session config into target tab's window (MAIN world)
    await chrome.scripting.executeScript({
      target: { tabId: currentTabId },
      world: 'MAIN',
      func: (s) => { window.__QA_BUDDY_SESSION_INJECT__ = s; },
      args: [currentSession],
    });

    // Step 2: Inject recorder.js into MAIN world (bypasses CSP)
    await chrome.scripting.executeScript({
      target: { tabId: currentTabId },
      world: 'MAIN',
      files: ['recorder.js'],
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
      world: 'MAIN',
      func: () => { if (window.__QABuddy__) window.__QABuddy__.stop(); },
    });
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
        world: 'MAIN',
        func: () => (window.__QABuddy__ ? window.__QABuddy__.stepCount() : -1),
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
