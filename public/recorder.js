/* QA Buddy Browser Recorder v1.0
 * Loaded dynamically via bookmarklet. Captures user actions and streams
 * them to Supabase in real-time. Config is read from the script's own URL.
 */
(function () {
  'use strict';

  // ── Toggle: destroy if already running ───────────────────────────────────
  if (window.__QABuddy__) {
    window.__QABuddy__.destroy();
    return;
  }

  // ── Read config from the script URL query params ─────────────────────────
  var me = document.querySelector('script[src*="recorder.js"]');
  if (!me) {
    console.error('[QA Buddy] Could not find recorder script element.');
    return;
  }
  var srcUrl = new URL(me.src);
  var SESSION_ID   = srcUrl.searchParams.get('s');
  var SUPABASE_URL = srcUrl.searchParams.get('u');
  var ANON_KEY     = srcUrl.searchParams.get('k');

  if (!SESSION_ID || !SUPABASE_URL || !ANON_KEY) {
    console.error('[QA Buddy] Missing config params. Reinstall the bookmarklet.');
    return;
  }

  // ── State ────────────────────────────────────────────────────────────────
  var stepOrder    = 0;
  var inputTimer   = null;
  var navCheckTimer = null;
  var lastUrl      = window.location.href;

  // ── Send event to Supabase REST API ──────────────────────────────────────
  function sendEvent(type, data) {
    stepOrder++;
    var payload = {
      session_id:      SESSION_ID,
      event_type:      type,
      target_selector: data.selector  || '',
      target_text:     data.text      || '',
      value:           data.value     || '',
      url:             window.location.href,
      page_title:      document.title,
      assertion_type:  data.assertionType || '',
      step_order:      stepOrder
    };

    fetch(SUPABASE_URL + '/rest/v1/recording_events', {
      method:  'POST',
      headers: {
        'apikey':       ANON_KEY,
        'Content-Type': 'application/json',
        'Prefer':       'return=minimal'
      },
      body: JSON.stringify(payload)
    }).catch(function (err) {
      console.warn('[QA Buddy] Failed to send event:', err);
    });

    updateCounter();
  }

  // ── Element helpers ───────────────────────────────────────────────────────
  function getSelector(el) {
    if (!el || el === document.body) return 'body';
    if (el.id) return '#' + el.id;
    var testId = el.getAttribute('data-testid') || el.getAttribute('data-test');
    if (testId) return '[data-testid="' + testId + '"]';
    if (el.name) return el.tagName.toLowerCase() + '[name="' + el.name + '"]';
    var classes = Array.from(el.classList)
      .filter(function (c) {
        return !/^(active|hover|focus|selected|disabled|visible|open|is-)/.test(c);
      })
      .slice(0, 2);
    if (classes.length > 0) return el.tagName.toLowerCase() + '.' + classes.join('.');
    return el.tagName.toLowerCase();
  }

  function getText(el) {
    return (
      el.innerText ||
      el.value ||
      el.placeholder ||
      el.getAttribute('aria-label') ||
      el.getAttribute('title') ||
      el.tagName.toLowerCase()
    ).trim().replace(/\s+/g, ' ').slice(0, 120);
  }

  // ── Toolbar UI ────────────────────────────────────────────────────────────
  var style = document.createElement('style');
  style.textContent = [
    '@keyframes __qa_pulse { 0%,100%{opacity:1} 50%{opacity:.3} }',
    '#__qa_toolbar__ * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important; }'
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
    'user-select:none', 'pointer-events:auto'
  ].join(';');

  toolbar.innerHTML = [
    '<span style="display:flex;align-items:center;gap:6px;font-size:13px;font-weight:600;">',
    '  <span style="width:8px;height:8px;border-radius:50%;background:#ef4444;',
    '         animation:__qa_pulse 1.5s ease-in-out infinite;"></span>',
    '  QA Buddy',
    '</span>',
    '<span id="__qa_count__" style="font-size:12px;color:#94a3b8;min-width:52px;">0 steps</span>',
    '<button id="__qa_assert__" style="',
    '  background:#3b82f6;border:none;color:#fff;padding:4px 10px;',
    '  border-radius:6px;cursor:pointer;font-size:12px;font-weight:500;">',
    '  + Assert',
    '</button>',
    '<button id="__qa_userdata__" style="',
    '  background:#7c3aed;border:none;color:#fff;padding:4px 10px;',
    '  border-radius:6px;cursor:pointer;font-size:12px;font-weight:500;">',
    '  User Data',
    '</button>',
    '<button id="__qa_stop__" style="',
    '  background:#dc2626;border:none;color:#fff;padding:4px 10px;',
    '  border-radius:6px;cursor:pointer;font-size:12px;font-weight:500;">',
    '  ⏹ Stop',
    '</button>'
  ].join('');

  document.body.appendChild(toolbar);

  function updateCounter() {
    var el = document.getElementById('__qa_count__');
    if (el) el.textContent = stepOrder + (stepOrder === 1 ? ' step' : ' steps');
  }

  // ── Toolbar button handlers ───────────────────────────────────────────────
  document.getElementById('__qa_assert__').addEventListener('click', function (e) {
    e.stopPropagation();
    var condition = prompt(
      'QA Buddy — Add Assertion\n\nWhat should be true on this page?\n' +
      'Examples:\n  "Login button is visible"\n  "Error message is not shown"\n  "Page title is Dashboard"'
    );
    if (!condition) return;
    var passed = confirm(
      'Assertion: "' + condition + '"\n\nIs this condition currently TRUE on the page?'
    );
    sendEvent('assertion', {
      value:         condition,
      assertionType: passed ? 'true' : 'false',
      text:          condition
    });
    alert('Assertion recorded: ' + (passed ? '✓ PASS' : '✗ FAIL'));
  });

  document.getElementById('__qa_userdata__').addEventListener('click', function (e) {
    e.stopPropagation();
    var label = prompt('QA Buddy — User Data\n\nData label (e.g. "email", "username", "search term"):');
    if (!label) return;
    var value = prompt('Value for "' + label + '":');
    if (value === null) return;
    sendEvent('user_data', { text: label, value: value });
    alert('User data recorded: ' + label + ' = "' + value + '"');
  });

  document.getElementById('__qa_stop__').addEventListener('click', function (e) {
    e.stopPropagation();
    sendEvent('navigation', { value: 'Recording stopped by user', text: 'stop' });

    // Mark session stopped via PATCH
    fetch(SUPABASE_URL + '/rest/v1/recording_sessions?id=eq.' + SESSION_ID, {
      method:  'PATCH',
      headers: {
        'apikey':       ANON_KEY,
        'Content-Type': 'application/json',
        'Prefer':       'return=minimal'
      },
      body: JSON.stringify({ status: 'stopped' })
    });

    window.__QABuddy__.destroy();
    alert(
      'QA Buddy — Recording Stopped\n\n' +
      stepOrder + ' steps captured.\n\n' +
      'Return to QA Buddy → Test Recorder to review and generate your test case.'
    );
  });

  // ── Event listeners ───────────────────────────────────────────────────────

  // Clicks
  document.addEventListener('click', function (e) {
    if (e.target.closest('#__qa_toolbar__')) return;
    sendEvent('click', {
      selector: getSelector(e.target),
      text:     getText(e.target)
    });
  }, true);

  // Input / typing (debounced 800ms, password masked)
  document.addEventListener('input', function (e) {
    var el = e.target;
    if (!el.matches('input, textarea, select, [contenteditable]')) return;
    if (el.closest('#__qa_toolbar__')) return;
    clearTimeout(inputTimer);
    inputTimer = setTimeout(function () {
      var isPassword = el.type === 'password';
      sendEvent('input', {
        selector: getSelector(el),
        text:     getText(el),
        value:    isPassword ? '••••' : (el.value || el.textContent || '').slice(0, 200)
      });
    }, 800);
  }, true);

  // Navigation / URL changes (SPA-friendly)
  navCheckTimer = setInterval(function () {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      sendEvent('navigation', {
        value: 'Navigated to: ' + window.location.href,
        text:  document.title
      });
    }
  }, 1500);

  // ── Global API ────────────────────────────────────────────────────────────
  window.__QABuddy__ = {
    destroy: function () {
      clearTimeout(inputTimer);
      clearInterval(navCheckTimer);
      if (toolbar.parentNode) toolbar.parentNode.removeChild(toolbar);
      if (style.parentNode)   style.parentNode.removeChild(style);
      delete window.__QABuddy__;
    }
  };

  // ── Initial navigation event ──────────────────────────────────────────────
  sendEvent('navigation', {
    value: 'Recording started at: ' + window.location.href,
    text:  document.title
  });

})();
