// Cloudflare Pages Function — same-origin proxy for the EMX chatbot.
// The n8n chat webhook does not send CORS headers, so browsers block direct
// calls. This function forwards the request server-side (no CORS involved).
// No secrets live here; the webhook URL is a public form endpoint.
var WEBHOOK_URL = 'https://sprtsamurai.app.n8n.cloud/webhook/chat_bot';
var TIMEOUT_MS = 25000;
var MAX_BODY = 8192;

function json(status, obj) {
  return new Response(JSON.stringify(obj), {
    status: status,
    headers: { 'Content-Type': 'application/json' }
  });
}

export async function onRequestPost(context) {
  var req = context.request;
  var raw = '';
  try {
    raw = await req.text();
  } catch (e) {
    return json(400, { error: 'Unreadable request body.' });
  }
  if (raw.length > MAX_BODY) return json(413, { error: 'Message too long.' });
  var body = null;
  try {
    body = JSON.parse(raw);
  } catch (e) {
    return json(400, { error: 'Expected a JSON body.' });
  }
  var message = typeof body.message === 'string' ? body.message.trim() : '';
  var sessionId = typeof body.sessionId === 'string' ? body.sessionId.trim() : '';
  if (!message || message.length > 1000) return json(400, { error: 'Invalid message.' });
  if (!sessionId || sessionId.length > 128) return json(400, { error: 'Invalid session.' });

  var ctrl = new AbortController();
  var timer = setTimeout(function () { ctrl.abort(); }, TIMEOUT_MS);
  var upstream;
  try {
    upstream = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/plain, */*' },
      body: JSON.stringify({ message: message, chatInput: message, sessionId: sessionId }),
      signal: ctrl.signal
    });
  } catch (e) {
    clearTimeout(timer);
    return json(502, { error: 'Chat backend unreachable.' });
  }
  clearTimeout(timer);
  var text = '';
  try {
    text = await upstream.text();
  } catch (e) {
    return json(502, { error: 'Chat backend gave no response.' });
  }
  var ct = upstream.headers.get('content-type') || 'text/plain';
  return new Response(text, {
    status: upstream.ok ? 200 : 502,
    headers: { 'Content-Type': ct.indexOf('json') > -1 ? 'application/json' : 'text/plain' }
  });
}

export async function onRequest(context) {
  if (context.request.method === 'POST') return onRequestPost(context);
  return json(405, { error: 'Method not allowed.' });
}
