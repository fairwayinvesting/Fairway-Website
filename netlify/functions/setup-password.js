import { getStore } from '@netlify/blobs';
import crypto from 'crypto';

async function pbkdf2Hash(password, salt) {
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(password, salt, 100000, 32, 'sha256', (err, key) =>
      err ? reject(err) : resolve(key.toString('hex'))
    );
  });
}

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

export default async (req) => {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });

  let body;
  try { body = await req.json(); } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  const { token, password } = body;
  if (!token || !password) return json({ error: 'token and password required' }, 400);
  if (password.length < 8) return json({ error: 'Password must be at least 8 characters' }, 400);

  const store = getStore('fairway-clients');
  const clients = (await store.get('all', { type: 'json' })) || [];
  // Must match an active, non-deleted entry — prevents stale deleted entries from
  // intercepting a token lookup and causing the password to be set on the wrong record.
  const idx = clients.findIndex(c => !c.deleted && c.active && c.setupToken === token);

  if (idx === -1) return json({ error: 'Invalid or already used setup link.' }, 400);

  const client = clients[idx];
  if (!client.setupTokenExpiry || new Date(client.setupTokenExpiry) < new Date()) {
    return json({ error: 'This setup link has expired. Contact Luke for a new one.' }, 400);
  }

  const salt = crypto.randomBytes(16).toString('hex');
  clients[idx].passwordHash = await pbkdf2Hash(password, salt);
  clients[idx].passwordSalt = salt;
  delete clients[idx].setupToken;
  delete clients[idx].setupTokenExpiry;

  await store.setJSON('all', clients);
  return json({ ok: true });
};

export const config = { path: '/api/setup-password', method: ['POST'] };
