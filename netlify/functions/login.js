import { getStore } from '@netlify/blobs';
import crypto from 'crypto';

async function pbkdf2Hash(password, salt) {
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(password, salt, 100000, 32, 'sha256', (err, key) =>
      err ? reject(err) : resolve(key.toString('hex'))
    );
  });
}

async function verifyPassword(password, salt, storedHash) {
  const computed = await pbkdf2Hash(password, salt);
  return crypto.timingSafeEqual(Buffer.from(computed, 'hex'), Buffer.from(storedHash, 'hex'));
}

function signJWT(payload, secret) {
  const h = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const b = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(`${h}.${b}`).digest('base64url');
  return `${h}.${b}.${sig}`;
}

const json = (data, status = 200, extraHeaders = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
  });

// ── Rate limiting (5 failures → 15-min lockout, keyed by email) ──────────────
async function checkRateLimit(store, email) {
  const now = Date.now();
  const key = `client-rl:${email.toLowerCase()}`;
  const data = await store.get(key, { type: 'json' }).catch(() => null) || { attempts: [], lockedUntil: 0 };
  if (data.lockedUntil > now) {
    const mins = Math.ceil((data.lockedUntil - now) / 60000);
    return { blocked: true, message: `Too many failed attempts. Try again in ${mins} minute${mins !== 1 ? 's' : ''}.` };
  }
  data.attempts = (data.attempts || []).filter(t => now - t < 15 * 60 * 1000);
  return { blocked: false, data, now, key };
}

async function recordFailure(store, key, data, now) {
  data.attempts.push(now);
  if (data.attempts.length >= 5) { data.lockedUntil = now + 15 * 60 * 1000; data.attempts = []; }
  await store.setJSON(key, data).catch(() => {});
}

async function clearRateLimit(store, key) {
  await store.delete(key).catch(() => {});
}

export default async (req) => {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });

  let body;
  try { body = await req.json(); } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  const { email, password } = body;
  if (!email || !password) return json({ error: 'Email and password required' }, 400);

  const rlStore = getStore('fairway-ratelimits');
  const rl = await checkRateLimit(rlStore, email);
  if (rl.blocked) return json({ error: rl.message }, 429);

  const clientStore = getStore('fairway-clients');
  const clients = (await clientStore.get('all', { type: 'json' })) || [];
  // Use the most recently created active non-deleted entry for this email.
  // Array order = creation order, so the last match is always the newest.
  // This ensures a freshly recreated test client is never shadowed by a zombie entry.
  const emailNorm = email.toLowerCase().trim();
  const matches = clients.filter(c => !c.deleted && c.active && c.email.toLowerCase() === emailNorm);
  const client = matches.length ? matches[matches.length - 1] : null;

  // If no direct client match, check portalAccess on all active clients (partners/co-investors)
  let partnerEntry = null, partnerClient = null;
  if (!client) {
    for (const c of clients) {
      if (c.deleted || !c.active) continue;
      const entry = (c.portalAccess || []).find(p => p.email?.toLowerCase() === emailNorm);
      if (entry) { partnerEntry = entry; partnerClient = c; break; }
    }
  }

  // Always run hash to prevent timing-based user enumeration
  const salt = client ? client.passwordSalt : (partnerEntry ? partnerEntry.passwordSalt : crypto.randomBytes(16).toString('hex'));
  const hash = client ? client.passwordHash : (partnerEntry ? partnerEntry.passwordHash : crypto.randomBytes(32).toString('hex'));
  const valid = await verifyPassword(password, salt, hash);

  if ((!client && !partnerEntry) || !valid) {
    await recordFailure(rlStore, rl.key, rl.data, rl.now);
    return json({ error: 'Invalid email or password' }, 401);
  }

  // Success — clear rate limit and issue session
  await clearRateLimit(rlStore, rl.key);

  const sessionPayload = client
    ? { sub: client.id, name: client.name, email: client.email, markets: client.markets }
    : { sub: partnerClient.id, name: partnerEntry.name, email: partnerEntry.email, markets: partnerClient.markets, isPartner: true };

  const token = signJWT({
    ...sessionPayload,
    exp: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
  }, process.env.JWT_SECRET);

  const displayName = client ? client.name : partnerEntry.name;
  const displayMarkets = client ? client.markets : partnerClient.markets;
  return json({ ok: true, name: displayName, markets: displayMarkets }, 200, {
    'Set-Cookie': `fw_session=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${30 * 24 * 60 * 60}`,
  });
};

export const config = { path: '/api/login' };
