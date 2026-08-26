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

async function verifyPassword(password, salt, hash) {
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(password, salt, 100000, 32, 'sha256', (err, key) =>
      err ? reject(err) : resolve(crypto.timingSafeEqual(Buffer.from(key.toString('hex')), Buffer.from(hash)))
    );
  });
}

function signJWT(payload, secret) {
  const h = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const b = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(`${h}.${b}`).digest('base64url');
  return `${h}.${b}.${sig}`;
}

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

async function checkRateLimit(store, key) {
  const now = Date.now();
  const data = await store.get(key, { type: 'json' }).catch(() => null) || { attempts: [], lockedUntil: 0 };
  if (data.lockedUntil > now) {
    const mins = Math.ceil((data.lockedUntil - now) / 60000);
    return { blocked: true, message: `Too many failed attempts. Try again in ${mins} minute${mins !== 1 ? 's' : ''}.`, data, now };
  }
  data.attempts = (data.attempts || []).filter(t => now - t < 15 * 60 * 1000);
  return { blocked: false, data, now };
}

async function recordFailure(store, key, data, now) {
  data.attempts.push(now);
  if (data.attempts.length >= 5) { data.lockedUntil = now + 15 * 60 * 1000; data.attempts = []; }
  await store.setJSON(key, data).catch(() => {});
}

export default async (req) => {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });

  const rlStore = getStore('fairway-ratelimits');
  const ip = req.headers.get('x-nf-client-connection-ip') || req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
  const rlKey = `staff-login:${ip}`;

  const rl = await checkRateLimit(rlStore, rlKey);
  if (rl.blocked) return json({ error: rl.message }, 429);

  let body;
  try { body = await req.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
  const { email, password, code } = body;
  if (!email || !password) return json({ error: 'email and password required' }, 400);

  const emailNorm = email.toLowerCase().trim();
  const staffStore = getStore({ name: 'fairway-staff', consistency: 'strong' });
  const all = (await staffStore.get('all', { type: 'json' }).catch(() => null)) || [];
  const user = all.find(u => !u.deletedAt && u.email?.toLowerCase() === emailNorm);

  // Always run hash to prevent timing-based enumeration
  const salt = user?.passwordSalt || crypto.randomBytes(16).toString('hex');
  const hash = user?.passwordHash || crypto.randomBytes(32).toString('hex');

  let valid = false;
  try { valid = await verifyPassword(password, salt, hash); } catch {}

  if (!user || !valid) {
    await recordFailure(rlStore, rlKey, rl.data, rl.now);
    return json({ error: 'Invalid email or password' }, 401);
  }

  if (!user.active) return json({ error: 'Your account has been deactivated. Contact Luke.' }, 403);
  if (!user.passwordHash) return json({ error: 'Account not yet set up. Check your email for a setup link.' }, 403);

  // TOTP check — if configured, require code
  if (user.totpSecret) {
    if (!code) return json({ step: 'totp' }, 202);
    if (!verifyTOTP(user.totpSecret, code)) {
      await recordFailure(rlStore, rlKey, rl.data, rl.now);
      return json({ error: 'Invalid authenticator code. Try again.' }, 401);
    }
  }

  // Clear rate limit on success
  await rlStore.delete(rlKey).catch(() => {});

  const now = Math.floor(Date.now() / 1000);
  const token = signJWT({
    role: 'contractor',
    userId: user.id,
    name: user.name,
    email: user.email,
    modules: user.modules || [],
    assignedClients: user.assignedClients || [],
    iat: now,
    exp: now + 86400 * 30,
  }, process.env.JWT_SECRET);

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': `fw_staff=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${86400 * 30}`,
    },
  });
};

export const config = { path: '/api/staff/login', method: ['POST'] };
