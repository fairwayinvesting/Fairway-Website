import crypto from 'crypto';
import { getStore } from '@netlify/blobs';

export async function checkAdmin(req) {
  const cookie = req.headers.get('cookie') || '';
  const cookieMatch = cookie.match(/fw_admin=([^;]+)/);
  if (!cookieMatch) return false;
  try {
    const [h, b, sig] = cookieMatch[1].split('.');
    const expected = crypto.createHmac('sha256', process.env.JWT_SECRET).update(`${h}.${b}`).digest('base64url');
    if (sig !== expected) return false;
    const payload = JSON.parse(Buffer.from(b, 'base64url').toString());
    if (payload.role !== 'admin' || payload.exp <= Date.now() / 1000) return false;
    // Check against global logout timestamp — any token issued at or before loggedOutAt is invalid
    try {
      const store = getStore('fairway-admin-session');
      const state = await store.get('state', { type: 'json' }).catch(() => null);
      if (state?.loggedOutAt && (!payload.iat || payload.iat <= state.loggedOutAt)) return false;
    } catch {}
    return true;
  } catch {}
  return false;
}
