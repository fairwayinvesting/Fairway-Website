import crypto from 'crypto';

const json = (data, status = 200, extra = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...extra },
  });

function makeEditorToken() {
  const h = Buffer.from(JSON.stringify({ alg: 'HS256' })).toString('base64url');
  const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 14; // 14 days
  const b = Buffer.from(JSON.stringify({ role: 'editor', exp })).toString('base64url');
  const sig = crypto.createHmac('sha256', process.env.JWT_SECRET).update(`${h}.${b}`).digest('base64url');
  return `${h}.${b}.${sig}`;
}

function checkEditorToken(token) {
  try {
    const [h, b, sig] = token.split('.');
    const expected = crypto.createHmac('sha256', process.env.JWT_SECRET).update(`${h}.${b}`).digest('base64url');
    const sa = Buffer.from(sig, 'base64url'), sb = Buffer.from(expected, 'base64url');
    if (sa.length !== sb.length || !crypto.timingSafeEqual(sa, sb)) return false;
    const payload = JSON.parse(Buffer.from(b, 'base64url').toString());
    return payload.role === 'editor' && payload.exp > Date.now() / 1000;
  } catch { return false; }
}

export default async (req) => {
  const url = new URL(req.url);

  if (req.method === 'POST' && url.pathname === '/api/editor/login') {
    let body;
    try { body = await req.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
    const expected = process.env.EDITOR_PASSWORD;
    if (!expected) return json({ error: 'Editor access not configured' }, 503);
    const match = crypto.timingSafeEqual(
      Buffer.from(body.password || ''), Buffer.from(expected)
    );
    if (!match) return json({ error: 'Incorrect password' }, 401);
    const token = makeEditorToken();
    const cookieVal = `fw_editor=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${60*60*24*14}`;
    return json({ ok: true }, 200, { 'Set-Cookie': cookieVal });
  }

  if (req.method === 'POST' && url.pathname === '/api/editor/verify') {
    const cookie = req.headers.get('cookie') || '';
    const match = cookie.match(/fw_editor=([^;]+)/);
    if (!match || !checkEditorToken(match[1])) return json({ error: 'Not authenticated' }, 401);
    return json({ ok: true });
  }

  return json({ error: 'Not found' }, 404);
};

export const config = {
  path: ['/api/editor/login', '/api/editor/verify'],
  method: ['POST'],
};
