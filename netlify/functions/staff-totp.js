import crypto from 'crypto';
import { getStore } from '@netlify/blobs';
import { getStaffPayload } from './_staff-auth.js';

function verifyTOTP(secret, token) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  for (const c of secret.toUpperCase().replace(/\s+/g, '').replace(/=+$/, '')) {
    const i = chars.indexOf(c);
    if (i < 0) continue;
    bits += i.toString(2).padStart(5, '0');
  }
  const key = Buffer.alloc(Math.floor(bits.length / 8));
  for (let i = 0; i < key.length; i++) key[i] = parseInt(bits.slice(i * 8, i * 8 + 8), 2);
  const now = Math.floor(Date.now() / 1000 / 30);
  for (const d of [-1, 0, 1]) {
    const buf = Buffer.alloc(8);
    buf.writeBigUInt64BE(BigInt(now + d));
    const hmac = crypto.createHmac('sha1', key).update(buf).digest();
    const offset = hmac[hmac.length - 1] & 0x0f;
    const otp = ((hmac.readUInt32BE(offset) & 0x7fffffff) % 1_000_000).toString().padStart(6, '0');
    if (otp === String(token).padStart(6, '0')) return true;
  }
  return false;
}

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

export default async (req) => {
  const payload = await getStaffPayload(req);
  if (!payload) return json({ error: 'Unauthorized' }, 401);

  const store = getStore({ name: 'fairway-staff', consistency: 'strong' });
  const all = (await store.get('all', { type: 'json' }).catch(() => null)) || [];
  const idx = all.findIndex(u => u.id === payload.userId);
  if (idx === -1) return json({ error: 'Not found' }, 404);

  if (req.method === 'GET') {
    const configured = !!all[idx].totpSecret;
    if (configured) return json({ configured: true });
    // Generate a fresh secret for the setup flow
    const secret = Array.from(crypto.randomBytes(20), b => 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'[b % 32]).join('');
    const label = encodeURIComponent(`Fairway:${all[idx].email || all[idx].name}`);
    const uri = `otpauth://totp/${label}?secret=${secret}&issuer=Fairway%20Investing&algorithm=SHA1&digits=6&period=30`;
    return json({ configured: false, secret, uri });
  }

  if (req.method === 'POST') {
    const body = await req.json().catch(() => ({}));
    const { action, secret, code } = body;

    if (action === 'enable') {
      if (!secret || !code) return json({ error: 'secret and code required' }, 400);
      if (!verifyTOTP(secret, code)) return json({ error: 'Invalid code — open your authenticator app and try again.' }, 400);
      all[idx].totpSecret = secret;
      all[idx].totpEnabledAt = new Date().toISOString();
      await store.setJSON('all', all);
      return json({ ok: true });
    }

    if (action === 'disable') {
      if (!code) return json({ error: 'code required' }, 400);
      const totpSecret = all[idx].totpSecret;
      if (!totpSecret) return json({ error: '2FA is not enabled on this account.' }, 400);
      if (!verifyTOTP(totpSecret, code)) return json({ error: 'Invalid code — check your authenticator app.' }, 400);
      delete all[idx].totpSecret;
      delete all[idx].totpEnabledAt;
      await store.setJSON('all', all);
      return json({ ok: true });
    }

    return json({ error: 'Unknown action' }, 400);
  }

  return new Response('Method Not Allowed', { status: 405 });
};

export const config = { path: '/api/staff/totp', method: ['GET', 'POST'] };
