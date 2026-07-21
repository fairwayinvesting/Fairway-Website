import crypto from 'crypto';
import { getStore } from '@netlify/blobs';

async function verifyAdminToken(req) {
  const cookie = req.headers.get('cookie') || '';
  const cookieMatch = cookie.match(/fw_admin=([^;]+)/);
  if (!cookieMatch) return null;
  try {
    const [h, b, sig] = cookieMatch[1].split('.');
    const expected = crypto.createHmac('sha256', process.env.JWT_SECRET).update(`${h}.${b}`).digest('base64url');
    if (sig !== expected) return null;
    const payload = JSON.parse(Buffer.from(b, 'base64url').toString());
    if (payload.role !== 'admin' || payload.exp <= Date.now() / 1000) return null;
    try {
      const store = getStore('fairway-admin-session');
      const state = await store.get('state', { type: 'json' }).catch(() => null);
      if (state?.loggedOutAt && (!payload.iat || payload.iat <= state.loggedOutAt)) return null;
    } catch {}
    return payload;
  } catch {}
  return null;
}

export async function checkAdmin(req) {
  return (await verifyAdminToken(req)) !== null;
}

export async function getAdminActor(req) {
  const payload = await verifyAdminToken(req);
  return payload?.actor || 'primary';
}
