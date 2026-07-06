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

export default async (req) => {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });

  let body;
  try { body = await req.json(); } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  const { email, password } = body;
  if (!email || !password) return json({ error: 'Email and password required' }, 400);

  const store = getStore('fairway-clients');
  const clients = (await store.get('all', { type: 'json' })) || [];
  const client = clients.find(c => c.email.toLowerCase() === email.toLowerCase().trim() && c.active);

  // Always run hash to prevent timing-based user enumeration
  const salt = client ? client.passwordSalt : crypto.randomBytes(16).toString('hex');
  const hash = client ? client.passwordHash : crypto.randomBytes(32).toString('hex');
  const valid = await verifyPassword(password, salt, hash);

  if (!client || !valid) return json({ error: 'Invalid email or password' }, 401);

  const token = signJWT({
    sub: client.id,
    name: client.name,
    email: client.email,
    markets: client.markets,
    exp: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
  }, process.env.JWT_SECRET);

  return json({ ok: true, name: client.name, markets: client.markets }, 200, {
    'Set-Cookie': `fw_session=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${30 * 24 * 60 * 60}`,
  });
};

export const config = { path: '/api/login' };
