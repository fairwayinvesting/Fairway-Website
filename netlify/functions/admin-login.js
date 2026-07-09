import { getStore } from '@netlify/blobs';
import crypto from 'crypto';

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

function signJWT(payload, secret) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${sig}`;
}

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

// ── Rate limiting (5 failures → 15-min lockout, keyed by IP) ─────────────────
async function checkRateLimit(store, ip) {
  const now = Date.now();
  const data = await store.get(`admin-rl:${ip}`, { type: 'json' }).catch(() => null) || { attempts: [], lockedUntil: 0 };
  if (data.lockedUntil > now) {
    const mins = Math.ceil((data.lockedUntil - now) / 60000);
    return { blocked: true, message: `Too many failed attempts. Try again in ${mins} minute${mins !== 1 ? 's' : ''}.` };
  }
  data.attempts = (data.attempts || []).filter(t => now - t < 15 * 60 * 1000);
  return { blocked: false, data, now };
}

async function recordFailure(store, ip, data, now) {
  data.attempts.push(now);
  if (data.attempts.length >= 5) { data.lockedUntil = now + 15 * 60 * 1000; data.attempts = []; }
  await store.setJSON(`admin-rl:${ip}`, data).catch(() => {});
}

async function clearRateLimit(store, ip) {
  await store.delete(`admin-rl:${ip}`).catch(() => {});
}

export default async (req) => {
  const store = getStore('fairway-ratelimits');
  const ip = req.headers.get('x-nf-client-connection-ip') || req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';

  const rl = await checkRateLimit(store, ip);
  if (rl.blocked) return json({ error: rl.message }, 429);

  const { password, code } = await req.json().catch(() => ({}));

  if (!password || password !== process.env.ADMIN_PASSWORD) {
    await recordFailure(store, ip, rl.data, rl.now);
    return json({ error: 'Unauthorized' }, 401);
  }

  // TOTP is mandatory — if TOTP_SECRET is not configured the admin login is disabled
  const totpSecret = process.env.TOTP_SECRET;
  if (!totpSecret) {
    return json({ error: 'Admin 2FA is not configured. Set TOTP_SECRET in Netlify environment variables.' }, 503);
  }

  if (!code) {
    return json({ step: 'totp' }, 202);
  }

  if (!verifyTOTP(totpSecret, code)) {
    await recordFailure(store, ip, rl.data, rl.now);
    return json({ error: 'Invalid authenticator code' }, 401);
  }

  // Success — clear rate limit and issue session
  await clearRateLimit(store, ip);

  const token = signJWT(
    { role: 'admin', exp: Math.floor(Date.now() / 1000) + 86400 * 30 },
    process.env.JWT_SECRET
  );

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': `fw_admin=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${86400 * 30}`,
    },
  });
};

export const config = { path: '/api/admin-login' };
