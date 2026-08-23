import { getStore } from '@netlify/blobs';
import crypto from 'crypto';

async function pbkdf2Hash(password, salt) {
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(password, salt, 100000, 32, 'sha256', (err, key) =>
      err ? reject(err) : resolve(key.toString('hex'))
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

export default async (req) => {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });

  let body;
  try { body = await req.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
  const { token, password } = body;
  if (!token || !password) return json({ error: 'token and password required' }, 400);
  if (password.length < 8) return json({ error: 'Password must be at least 8 characters' }, 400);

  const store = getStore({ name: 'fairway-staff', consistency: 'strong' });
  const all = (await store.get('all', { type: 'json' }).catch(() => null)) || [];
  const idx = all.findIndex(u => !u.deletedAt && u.setupToken === token);
  if (idx === -1) return json({ error: 'Invalid or already used setup link.' }, 400);

  const user = all[idx];
  if (!user.setupTokenExpiry || new Date(user.setupTokenExpiry) < new Date()) {
    return json({ error: 'This setup link has expired. Contact Luke for a new one.' }, 400);
  }

  const salt = crypto.randomBytes(16).toString('hex');
  all[idx].passwordHash = await pbkdf2Hash(password, salt);
  all[idx].passwordSalt = salt;
  delete all[idx].setupToken;
  delete all[idx].setupTokenExpiry;
  all[idx].updatedAt = new Date().toISOString();
  await store.set('all', JSON.stringify(all));

  const now = Math.floor(Date.now() / 1000);
  const sessionToken = signJWT({
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
      'Set-Cookie': `fw_staff=${sessionToken}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${86400 * 30}`,
    },
  });
};

export const config = { path: '/api/staff/setup-password', method: ['POST'] };
