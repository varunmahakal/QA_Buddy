/* QA Buddy Recorder — Chrome Extension Content Script v1.1
 * Injected via chrome.scripting.executeScript({ world: 'MAIN' }) — bypasses CSP.
 * Session config is written to window.__QA_BUDDY_SESSION_INJECT__ by popup.js
 * before this script is injected.
 */
(function () {
  'use strict';

  // ── Toggle: destroy if already running ─────────────────────────────────────
  if (window.__QABuddy__) {
    window.__QABuddy__.destroy();
    return;
  }

  // ── Read config from window (set by popup.js before injection) ──────────────
  var cfg = window.__QA_BUDDY_SESSION_INJECT__;
  if (!cfg || !cfg.sessionId || !cfg.supabaseUrl || !cfg.anonKey) {
    console.error('[QA Buddy] Missing session config. The extension popup should set window.__QA_BUDDY_SESSION_INJECT__ before injecting this script.');
    return;
  }

  var SESSION_ID   = cfg.sessionId;
  var SUPABASE_URL = cfg.supabaseUrl;
  var ANON_KEY     = cfg.anonKey;

  // ── State ──────────────────────────────────────────────────────────────────
  var stepOrder     = 0;
  var inputTimer    = null;
  var navCheckTimer = null;
  var lastUrl       = window.location.href;

  // ── Send event to Supabase REST API ────────────────────────────────────────
  function sendEvent(type, data) {
    stepOrder++;
    var payload = {
      session_id:      SESSION_ID,
      event_type:      type,
      target_selector: data.selector      || '',
      target_text:     data.text          || '',
      value:           data.value         || '',
      url:             window.location.href,
      page_title:      document.title,
      assertion_type:  data.assertionType || '',
      step_order:      stepOrder,
    };

    fetch(SUPABASE_URL + '/rest/v1/recording_events', {
      method:  'POST',
      headers: {
        'apikey':       ANON_KEY,
        'Content-Type': 'application/json',
        'Prefer':       'return=minimal',
      },
      body: JSON.stringify(payload),
    }).catch(function (err) {
      console.warn('[QA Buddy] Failed to send event:', err);
    });

    updateCounter();
  }

  // ── Element helpers ────────────────────────────────────────────────────────
  function getSelector(el) {
    if (!el || el === document.body) return 'body';
    if (el.id) return '#' + el.id;
    var testId = el.getAttribute('data-testid') || el.getAttribute('data-test');
    if (testId) return '[data-testid="' + testId + '"]';
    if (el.name) return el.tagName.toLowerCase() + '[name="' + el.name + '"]';
    var classes = Array.from(el.classList)
      .filter(function (c) { return !/^(active|hover|focus|selected|disabled|visible|open|is-)/.test(c); })
      .slice(0, 2);
    if (classes.length > 0) return el.tagName.toLowerCase() + '.' + classes.join('.');
    return el.tagName.toLowerCase();
  }

  function getText(el) {
    return (
      el.innerText || el.value || el.placeholder ||
      el.getAttribute('aria-label') || el.getAttribute('title') || el.tagName.toLowerCase()
    ).trim().replace(/\s+/g, ' ').slice(0, 120);
  }

  // ── Toolbar UI ─────────────────────────────────────────────────────────────
  var style = document.createElement('style');
  style.textContent = [
    '@keyframes __qa_pulse { 0%,100%{opacity:1} 50%{opacity:.3} }',
    '#__qa_toolbar__ * { box-sizing:border-box; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif !important; }',
  ].join(' ');
  document.head.appendChild(style);

  var toolbar = document.createElement('div');
  toolbar.id = '__qa_toolbar__';
  toolbar.style.cssText = [
    'position:fixed', 'top:0', 'left:50%', 'transform:translateX(-50%)',
    'z-index:2147483647', 'background:#0f172a', 'color:#fff',
    'padding:8px 14px', 'border-radius:0 0 14px 14px',
    'box-shadow:0 4px 24px rgba(0,0,0,.5)',
    'display:flex', 'gap:10px', 'align-items:center',
    'user-select:none', 'pointer-events:auto',
  ].join(';');

  toolbar.innerHTML = [
    '<span style="display:flex;align-items:center;gap:6px;font-size:13px;font-weight:600;">',
    '  <span style="width:8px;height:8px;border-radius:50%;background:#ef4444;animation:__qa_pulse 1.5s ease-in-out infinite;"></span>',
    '  QA Buddy',
    '</span>',
    '<span id="__qa_count__" style="font-size:12px;color:#94a3b8;min-width:52px;">0 steps</span>',
    '<button id="__qa_assert__" style="background:#3b82f6;border:none;color:#fff;padding:4px 10px;border-radius:6px;cursor:pointer;font-size:12px;font-weight:500;">+ Assert</button>',
    '<button id="__qa_userdata__" style="background:#7c3aed;border:none;color:#fff;padding:4px 10px;border-radius:6px;cursor:pointer;font-size:12px;font-weight:500;">User Data</button>',
    '<button id="__qa_stop__" style="background:#dc2626;border:none;color:#fff;padding:4px 10px;border-radius:6px;cursor:pointer;font-size:12px;font-weight:500;">⏹ Stop</button>',
  ].join('');

  document.body.appendChild(toolbar);

  function updateCounter() {
    var el = document.getElementById('__qa_count__');
    if (el) el.textContent = stepOrder + (stepOrder === 1 ? ' step' : ' steps');
  }

  // ── Toolbar button handlers ────────────────────────────────────────────────
  document.getElementById('__qa_assert__').addEventListener('click', function (e) {
    e.stopPropagation();
    var condition = prompt('QA Buddy — Add Assertion\n\nWhat should be true on this page?');
    if (!condition) return;
    var passed = confirm('Assertion: "' + condition + '"\n\nIs this currently TRUE on the page?');
    sendEvent('assertion', { value: condition, assertionType: passed ? 'true' : 'false', text: condition });
    alert('Assertion recorded: ' + (passed ? '✓ PASS' : '✗ FAIL'));
  });

  document.getElementById('__qa_userdata__').addEventListener('click', function (e) {
    e.stopPropagation();
    var label = prompt('QA Buddy — User Data\n\nLabel (e.g. "email", "username"):');
    if (!label) return;
    var value = prompt('Value for "' + label + '":');
    if (value === null) return;
    sendEvent('user_data', { text: label, value: value });
    alert('User data recorded: ' + label + ' = "' + value + '"');
  });

  document.getElementById('__qa_stop__').addEventListener('click', function (e) {
    e.stopPropagation();
    stopRecording();
  });

  // ── Named event handlers (needed for proper removeEventListener) ───────────
  function onClickCapture(e) {
    if (e.target.closest('#__qa_toolbar__')) return;
    sendEvent('click', { selector: getSelector(e.target), text: getText(e.target) });
  }

  function onInputCapture(e) {
    var el = e.target;
    if (!el.matches('input, textarea, select, [contenteditable]')) return;
    if (el.closest('#__qa_toolbar__')) return;
    clearTimeout(inputTimer);
    inputTimer = setTimeout(function () {
      sendEvent('input', {
        selector: getSelector(el),
        text:     getText(el),
        value:    el.type === 'password' ? '••••' : (el.value || el.textContent || '').slice(0, 200),
      });
    }, 800);
  }

  document.addEventListener('click', onClickCapture, true);
  document.addEventListener('input', onInputCapture, true);

  // SPA navigation detection
  navCheckTimer = setInterval(function () {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      sendEvent('navigation', { value: 'Navigated to: ' + window.location.href, text: document.title });
    }
  }, 1500);

  // ── Stop recording ─────────────────────────────────────────────────────────
  function stopRecording() {
    sendEvent('navigation', { value: 'Recording stopped by user', text: 'stop' });

    fetch(SUPABASE_URL + '/rest/v1/recording_sessions?id=eq.' + SESSION_ID, {
      method:  'PATCH',
      headers: { 'apikey': ANON_KEY, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
      body:    JSON.stringify({ status: 'stopped' }),
    });

    window.__QABuddy__.destroy();
    alert('QA Buddy — Recording Stopped\n\n' + stepOrder + ' steps captured.\n\nReturn to QA Buddy → Test Recorder to review and generate your test case.');
  }

  // ── Global API ─────────────────────────────────────────────────────────────
  window.__QABuddy__ = {
    stepCount: function () { return stepOrder; },
    stop:      function () { stopRecording(); },
    destroy:   function () {
      clearTimeout(inputTimer);
      clearInterval(navCheckTimer);
      document.removeEventListener('click', onClickCapture, true);
      document.removeEventListener('input', onInputCapture, true);
      if (toolbar.parentNode) toolbar.parentNode.removeChild(toolbar);
      if (style.parentNode)   style.parentNode.removeChild(style);
      delete window.__QABuddy__;
      delete window.__QA_BUDDY_SESSION_INJECT__;
    },
  };

  // ── Initial event ──────────────────────────────────────────────────────────
  sendEvent('navigation', { value: 'Recording started at: ' + window.location.href, text: document.title });

})();
