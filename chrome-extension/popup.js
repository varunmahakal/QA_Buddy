/* QA Buddy Recorder — Extension Popup
 * Finds the active QA Buddy session and injects the recorder into the current tab.
 */
'use strict';

// ── DOM refs ────────────────────────────────────────────────────────────────
const headerSub   = document.getElementById('headerSub');
const sessionCard = document.getElementById('sessionCard');
const sessionUrl  = document.getElementById('sessionUrl');
const sessionSteps= document.getElementById('sessionSteps');
const errorBox    = document.getElementById('errorBox');
const btnActivate = document.getElementById('btnActivate');
const btnStop     = document.getElementById('btnStop');
const hint        = document.getElementById('hint');

// ── State ───────────────────────────────────────────────────────────────────
let currentSession = null;  // { sessionId, supabaseUrl, anonKey, targetUrl }
let currentTabId   = null;

// ── Helpers ─────────────────────────────────────────────────────────────────
function showError(msg) {
  errorBox.textContent = msg;
  errorBox.style.display = 'block';
}
function clearError() {
  errorBox.style.display = 'none';
}
function setHint(text) {
  hint.textContent = text;
}

// ── On popup open ────────────────────────────────────────────────────────────
(async () => {
  try {
    // 1. Get the current (active) tab
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    currentTabId = activeTab?.id;

    // 2. Find the QA Buddy tab (production or localhost dev)
    const qaTabMatches = await chrome.tabs.query({
      url: [
        'https://qabuddy.netlify.app/*',
        'http://localhost:*/*',
        'http://127.0.0.1:*/*',
      ]
    });

    if (qaTabMatches.length === 0) {
      headerSub.textContent = 'QA Buddy tab not found';
      setHint('Open QA Buddy and click "Start Recording" first.');
      return;
    }

    const qaTab = qaTabMatches[0];

    // 3. Read session from QA Buddy tab's window object
    let session = null;
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId: qaTab.id },
        func: () => window.__QA_BUDDY_SESSION__ ?? null,
      });
      session = results?.[0]?.result ?? null;
    } catch (err) {
      showError('Could not read session from QA Buddy tab. Make sure you clicked "Start Recording".');
      headerSub.textContent = 'Session read failed';
      return;
    }

    if (!session || !session.sessionId) {
      headerSub.textContent = 'No active session';
      setHint('Go to QA Buddy → Test Recorder → enter a URL → click "Start Recording".');
      return;
    }

    // 4. Session found — update UI
    currentSession = session;
    sessionCard.classList.remove('empty');
    sessionUrl.textContent = session.targetUrl || 'Recording in progress…';

    // Check if recorder is already running on the current tab
    let isRecording = false;
    try {
      const check = await chrome.scripting.executeScript({
        target: { tabId: currentTabId },
        func: () => !!window.__QABuddy__,
      });
      isRecording = check?.[0]?.result ?? false;
    } catch (_) {}

    if (isRecording) {
      headerSub.textContent = 'Recorder is active';
      sessionSteps.style.display = 'block';
      sessionSteps.textContent = 'Recording in progress on this tab';
      btnActivate.disabled = true;
      btnStop.disabled = false;
      setHint('Perform your test actions. Click Stop when done.');

      // Poll step count
      pollStepCount();
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

// ── Activate button ──────────────────────────────────────────────────────────
btnActivate.addEventListener('click', async () => {
  if (!currentSession || !currentTabId) return;
  clearError();
  btnActivate.disabled = true;
  btnActivate.textContent = 'Injecting…';

  try {
    // Store session in chrome.storage.session so recorder.js can read it
    await chrome.storage.session.set({ qaSession: currentSession });

    // Inject recorder.js into the current tab (bypasses CSP)
    await chrome.scripting.executeScript({
      target: { tabId: currentTabId },
      files: ['recorder.js'],
    });

    headerSub.textContent = 'Recorder active';
    btnActivate.textContent = '▶ Activate Recorder';
    btnActivate.disabled = true;
    btnStop.disabled = false;
    sessionSteps.style.display = 'block';
    sessionSteps.textContent = 'Recorder is running';
    setHint('Perform your test. Steps stream to QA Buddy in real-time.');

    pollStepCount();
  } catch (err) {
    showError('Failed to inject recorder: ' + (err.message || err));
    btnActivate.disabled = false;
    btnActivate.textContent = '▶ Activate Recorder';
  }
});

// ── Stop button ──────────────────────────────────────────────────────────────
btnStop.addEventListener('click', async () => {
  if (!currentTabId) return;
  clearError();
  btnStop.disabled = true;

  try {
    await chrome.scripting.executeScript({
      target: { tabId: currentTabId },
      func: () => {
        if (window.__QABuddy__) {
          window.__QABuddy__.stop();
        }
      },
    });

    headerSub.textContent = 'Recording stopped';
    sessionSteps.textContent = 'Done — check QA Buddy to review steps';
    setHint('Switch to QA Buddy to review steps and generate your test case.');
    btnActivate.disabled = true;
  } catch (err) {
    showError('Failed to stop recorder: ' + (err.message || err));
    btnStop.disabled = false;
  }
});

// ── Poll step count ──────────────────────────────────────────────────────────
function pollStepCount() {
  const interval = setInterval(async () => {
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId: currentTabId },
        func: () => window.__QABuddy__ ? window.__QABuddy__.stepCount() : -1,
      });
      const count = results?.[0]?.result ?? -1;
      if (count === -1) {
        clearInterval(interval);
        return;
      }
      sessionSteps.textContent = count + (count === 1 ? ' step' : ' steps') + ' recorded';
    } catch (_) {
      clearInterval(interval);
    }
  }, 1500);
}
