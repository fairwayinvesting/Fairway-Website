import { getStore } from '@netlify/blobs';
import crypto from 'crypto';

async function pbkdf2Hash(password, salt) {
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(password, salt, 100000, 32, 'sha256', (err, key) =>
      err ? reject(err) : resolve(key.toString('hex'))
    );
  });
}

function checkAdmin(req) {
  const auth = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  return auth === process.env.ADMIN_PASSWORD;
}

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

export default async (req) => {
  if (!checkAdmin(req)) return json({ error: 'Unauthorized' }, 401);

  const store = getStore('fairway-clients');
  const clients = (await store.get('all', { type: 'json' })) || [];

  if (req.method === 'GET') {
    return json(clients.map(({ id, name, email, markets, active, createdAt }) =>
      ({ id, name, email, markets, active, createdAt })
    ));
  }

  if (req.method === 'POST') {
    const { name, email, password, markets } = await req.json().catch(() => ({}));
    if (!name || !email || !password) return json({ error: 'name, email and password required' }, 400);
    if (clients.some(c => c.email.toLowerCase() === email.toLowerCase())) return json({ error: 'Email already exists' }, 409);
    const salt = crypto.randomBytes(16).toString('hex');
    const client = {
      id: crypto.randomUUID(),
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash: await pbkdf2Hash(password, salt),
      passwordSalt: salt,
      markets: Array.isArray(markets) ? markets : [],
      active: true,
      createdAt: new Date().toISOString(),
    };
    clients.push(client);
    await store.setJSON('all', clients);
    return json({ ok: true, id: client.id }, 201);
  }

  if (req.method === 'PUT') {
    const { id, name, markets, active, password } = await req.json().catch(() => ({}));
    const idx = clients.findIndex(c => c.id === id);
    if (idx === -1) return json({ error: 'Client not found' }, 404);
    if (name !== undefined) clients[idx].name = name.trim();
    if (markets !== undefined) clients[idx].markets = markets;
    if (active !== undefined) clients[idx].active = active;
    if (password) {
      const salt = crypto.randomBytes(16).toString('hex');
      clients[idx].passwordHash = await pbkdf2Hash(password, salt);
      clients[idx].passwordSalt = salt;
    }
    await store.setJSON('all', clients);
    return json({ ok: true });
  }

  if (req.method === 'DELETE') {
    const id = new URL(req.url).searchParams.get('id');
    if (!id) return json({ error: 'id required' }, 400);
    const updated = clients.filter(c => c.id !== id);
    if (updated.length === clients.length) return json({ error: 'Not found' }, 404);
    await store.setJSON('all', updated);
    return json({ ok: true });
  }

  return new Response('Method Not Allowed', { status: 405 });
};

export const config = {
  path: '/api/admin/clients',
  method: ['GET', 'POST', 'PUT', 'DELETE'],
};
