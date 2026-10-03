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
    var b = el('div', 'chat-bubble ' + (who === 'user' ? 'from-user' : 'from-bot'));
    if (who === 'user') {
      b.textContent = text;
    } else {
      b.appendChild(renderBot(text));
    }
    msgs.appendChild(b);
    scrollDown();
    return b;
  }

  // Safe mini-markdown for AI replies: paragraphs, line breaks, lists,
  // [label](https://...) links and bare https:// URLs become real anchors.
  // AI content is never injected as HTML — only text nodes plus
  // allow-listed elements (p, br, ul, ol, li, a[http/https]) are created.
  var URL_RE = /\[([^\]\n]{1,200})\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s<)\]]+)/g;
  function isSafeUrl(u) { return /^https?:\/\/[^ \t\n<>"']+$/i.test(u); }
  function linkLabel(href, label) {
    if (href.toLowerCase().indexOf('wa.me') > -1 && (!label || label === href)) return 'Chat on WhatsApp';
    return label || href;
  }
  function appendText(parent, raw) {
    // **bold** within a plain-text run — still no HTML injection (text nodes only).
    var parts = raw.split(/\*\*([^*]+)\*\*/g);
    for (var i = 0; i < parts.length; i++) {
      if (i % 2 === 1 && parts[i]) {
        var s = document.createElement('strong');
        s.textContent = parts[i];
        parent.appendChild(s);
      } else if (parts[i]) {
        parent.appendChild(document.createTextNode(parts[i]));
      }
    }
  }
  function appendInline(parent, raw) {
    URL_RE.lastIndex = 0;
    var m, last = 0;
    while ((m = URL_RE.exec(raw))) {
      if (m.index > last) appendText(parent, raw.slice(last, m.index));
      var href = m[2] || m[3];
      var label = m[2] ? m[1] : href;
      if (isSafeUrl(href)) {
        var a = document.createElement('a');
        a.setAttribute('href', href);
        a.setAttribute('target', '_blank');
        a.setAttribute('rel', 'noopener noreferrer');
        a.className = 'chat-link';
        appendText(a, linkLabel(href, label));
        parent.appendChild(a);
      } else {
        parent.appendChild(document.createTextNode(m[0]));
      }
      last = m.index + m[0].length;
    }
    if (last < raw.length) appendText(parent, raw.slice(last));
  }
  function renderBot(text) {
    var frag = document.createDocumentFragment();
    var blocks = String(text).replace(/\r\n?/g, '\n').split(/\n{2,}/);
    blocks.forEach(function (block) {
      var lines = block.split('\n').filter(function (l) { return l.trim() !== ''; });
      if (!lines.length) return;
      var isList = lines.every(function (l) { return /^\s*([-*]|\d+[.)])\s+/.test(l); });
      if (isList) {
        var ordered = /^\s*\d+[.)]\s+/.test(lines[0]);
        var list = document.createElement(ordered ? 'ol' : 'ul');
        lines.forEach(function (l) {
          var li = document.createElement('li');
          appendInline(li, l.replace(/^\s*([-*]|\d+[.)])\s+/, ''));
          list.appendChild(li);
        });
        frag.appendChild(list);
      } else {
        var p = document.createElement('p');
        lines.forEach(function (l, i) {
          if (i > 0) p.appendChild(document.createElement('br'));
          appendInline(p, l);
        });
        frag.appendChild(p);
      }
    });
    return frag;
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
  window.__emxChat = { parseReply: parseReply, renderBot: renderBot, getSessionId: function () { return sid; } };
})();
