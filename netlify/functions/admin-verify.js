import crypto from 'crypto';

function verifyJWT(token, secret) {
  try {
    const [h, b, sig] = token.split('.');
    const expected = crypto.createHmac('sha256', secret).update(`${h}.${b}`).digest('base64url');
    if (sig !== expected) return false;
    const payload = JSON.parse(Buffer.from(b, 'base64url').toString());
    if (payload.exp && payload.exp < Date.now() / 1000) return false;
    return payload.role === 'admin';
  } catch { return false; }
}

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

export default async (req) => {
  const secret = process.env.JWT_SECRET;

  // 1. Check fw_admin session cookie (set by admin-login after password + 2FA)
  const cookie = req.headers.get('cookie') || '';
  const cookieMatch = cookie.match(/fw_admin=([^;]+)/);
  if (cookieMatch && verifyJWT(cookieMatch[1], secret)) return json({ ok: true });

  // 2. Fall back to Bearer token (manual password entry on the overlay)
  const bearer = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (bearer && bearer === process.env.ADMIN_PASSWORD) return json({ ok: true });

  return json({ error: 'Unauthorized' }, 401);
};

export const config = { path: '/api/admin/verify', method: ['POST'] };
