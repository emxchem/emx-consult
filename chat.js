// EMX AI Assistant — floating chatbot wired to the n8n chat webhook.
// Modules: UI wiring, webhook transport, response parsing. No dependencies.
(function () {
  'use strict';
  // Same-origin proxy (functions/api/chat.js) forwards to the n8n webhook
  // server-side, because the webhook does not send CORS headers.
  var ENDPOINT = '/api/chat';
  var TIMEOUT_MS = 30000;
  var MAX_LEN = 1000;
  var WELCOME = 'Hello! Welcome to EMX Consult. How can I help you explore AI and automation for your business?';
  var FALLBACK = 'I received your message but could not read the reply. Please try again in a moment.';

  var launcher = document.getElementById('chatlauncher');
  var panel = document.getElementById('chatpanel');
  var msgs = document.getElementById('chatmsgs');
  var typing = document.getElementById('chattyping');
  var form = document.getElementById('chatform');
  var input = document.getElementById('chatinput');
  var sendBtn = document.getElementById('chatsend');
  if (!launcher || !panel || !msgs || !form || !input || !sendBtn) return;

  // Stable session ID per conversation (persisted per tab, reused every message).
  var sid = null;
  try { sid = sessionStorage.getItem('emx_chat_sid'); } catch (_) {}
  if (!sid) {
    sid = (window.crypto && crypto.randomUUID) ? crypto.randomUUID()
      : 'emx-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
    try { sessionStorage.setItem('emx_chat_sid', sid); } catch (_) {}
  }

  var busy = false;
  var lastUserText = '';
  var welcomed = false;

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text; // safe: never injects HTML
    return n;
  }

  function scrollDown() { msgs.scrollTop = msgs.scrollHeight; }

  function addMsg(who, text) {
    var b = el('div', 'chat-bubble ' + (who === 'user' ? 'from-user' : 'from-bot'), text);
    msgs.appendChild(b);
    scrollDown();
    return b;
  }

  function addErrorWithRetry() {
    var b = el('div', 'chat-bubble from-bot chat-error');
    b.appendChild(el('span', '', 'Something went wrong sending that. Check your connection and try again.'));
    var r = el('button', 'chat-retry', 'Retry');
    r.type = 'button';
    r.addEventListener('click', function () { b.remove(); send(lastUserText); });
    b.appendChild(r);
    msgs.appendChild(b);
    scrollDown();
  }

  // Extract the AI reply from varied n8n response shapes. Returns '' if none found.
  // Ignores request-echo structures (headers/params/body/...) so internal
  // metadata is never shown to the visitor.
  var SKIP_KEYS = { headers: 1, params: 1, query: 1, body: 1, webhookurl: 1, executionmode: 1, executionid: 1 };
  var REPLY_KEYS = ['output', 'reply', 'response', 'text', 'message', 'answer'];
  function parseReply(raw) {
    if (raw == null) return '';
    if (typeof raw !== 'string') raw = String(raw);
    var text = raw.trim();
    if (!text) return '';
    var data = null;
    try { data = JSON.parse(text); } catch (_) { return text; } // plain-text reply
    function pick(node) {
      if (typeof node === 'string') return node.trim();
      if (Array.isArray(node)) {
        for (var i = 0; i < node.length; i++) { var r = pick(node[i]); if (r) return r; }
        return '';
      }
      if (node && typeof node === 'object') {
        var i, k;
        for (i = 0; i < REPLY_KEYS.length; i++) {
          k = REPLY_KEYS[i];
          if (typeof node[k] === 'string' && node[k].trim()) return node[k].trim();
        }
        if (node.data !== undefined) { var d = pick(node.data); if (d) return d; }
        var keys = Object.keys(node);
        for (i = 0; i < keys.length; i++) {
          if (SKIP_KEYS[keys[i].toLowerCase()]) continue;
          var v = pick(node[keys[i]]);
          if (v) return v;
        }
      }
      return '';
    }
    return pick(data);
  }

  function setBusy(on) {
    busy = on;
    sendBtn.disabled = on;
    input.disabled = on;
    typing.hidden = !on;
    if (on) scrollDown();
  }

  function send(text) {
    text = (text || '').trim();
    if (!text || busy) return;
    if (text.length > MAX_LEN) text = text.slice(0, MAX_LEN);
    busy = true;
    lastUserText = text;
    addMsg('user', text);
    input.value = '';
    setBusy(true);
    var ctrl = new AbortController();
    var timer = setTimeout(function () { ctrl.abort(); }, TIMEOUT_MS);
    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json, text/plain, */*' },
      body: JSON.stringify({ message: text, chatInput: text, sessionId: sid }),
      signal: ctrl.signal
    }).then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.text();
    }).then(function (raw) {
      var reply = parseReply(raw);
      if (!reply || reply === lastUserText) {
        console.warn('[emx-chat] no AI reply in webhook response:', String(raw).slice(0, 300));
        reply = FALLBACK;
      }
      addMsg('bot', reply);
    }).catch(function (err) {
      console.warn('[emx-chat] request failed:', err);
      addErrorWithRetry();
    }).then(function () {
      clearTimeout(timer);
      setBusy(false);
      input.focus();
    });
  }

  function open() {
    if (!panel.hidden) return;
    panel.hidden = false;
    launcher.setAttribute('aria-expanded', 'true');
    if (!welcomed) { welcomed = true; addMsg('bot', WELCOME); }
    input.focus();
  }
  function close() {
    if (panel.hidden) return;
    panel.hidden = true;
    launcher.setAttribute('aria-expanded', 'false');
    launcher.focus();
  }

  launcher.addEventListener('click', function () { panel.hidden ? open() : close(); });
  document.getElementById('chatclose').addEventListener('click', close);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
  form.addEventListener('submit', function (e) { e.preventDefault(); send(input.value); });

  // Exposed for diagnostics/testing only.
  window.__emxChat = { parseReply: parseReply, getSessionId: function () { return sid; } };
})();
