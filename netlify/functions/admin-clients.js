const crypto = require('crypto');
const { getStore } = require('@netlify/blobs');

async function pbkdf2(password, salt) {
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(password, salt, 100000, 32, 'sha256', (err, key) =>
      err ? reject(err) : resolve(key.toString('hex'))
    );
  });
}

function checkAdmin(event) {
  const auth = (event.headers['authorization'] || event.headers['Authorization'] || '').replace(/^Bearer\s+/i, '');
  return auth === process.env.ADMIN_PASSWORD;
}

exports.handler = async function (event) {
  if (!checkAdmin(event)) {
    return { statusCode: 401, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  const store = getStore('fairway-clients');
  const clients = (await store.get('all', { type: 'json' })) || [];

  if (event.httpMethod === 'GET') {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(clients.map(({ id, name, email, markets, active, createdAt }) =>
        ({ id, name, email, markets, active, createdAt })
      )),
    };
  }

  if (event.httpMethod === 'POST') {
    let body;
    try { body = JSON.parse(event.body || '{}'); } catch {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) };
    }
    const { name, email, password, markets } = body;
    if (!name || !email || !password) {
      return { statusCode: 400, body: JSON.stringify({ error: 'name, email and password required' }) };
    }
    if (clients.some(c => c.email.toLowerCase() === email.toLowerCase())) {
      return { statusCode: 409, body: JSON.stringify({ error: 'Email already exists' }) };
    }
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = await pbkdf2(password, salt);
    const client = {
      id: crypto.randomUUID(),
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash: hash,
      passwordSalt: salt,
      markets: Array.isArray(markets) ? markets : [],
      active: true,
      createdAt: new Date().toISOString(),
    };
    clients.push(client);
    await store.setJSON('all', clients);
    return { statusCode: 201, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ok: true, id: client.id }) };
  }

  if (event.httpMethod === 'PUT') {
    let body;
    try { body = JSON.parse(event.body || '{}'); } catch {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) };
    }
    const { id, name, markets, active, password } = body;
    const idx = clients.findIndex(c => c.id === id);
    if (idx === -1) return { statusCode: 404, body: JSON.stringify({ error: 'Client not found' }) };
    if (name !== undefined) clients[idx].name = name.trim();
    if (markets !== undefined) clients[idx].markets = markets;
    if (active !== undefined) clients[idx].active = active;
    if (password) {
      const salt = crypto.randomBytes(16).toString('hex');
      clients[idx].passwordHash = await pbkdf2(password, salt);
      clients[idx].passwordSalt = salt;
    }
    await store.setJSON('all', clients);
    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ok: true }) };
  }

  if (event.httpMethod === 'DELETE') {
    const id = new URLSearchParams(event.rawQuery || '').get('id');
    if (!id) return { statusCode: 400, body: JSON.stringify({ error: 'id required' }) };
    const updated = clients.filter(c => c.id !== id);
    if (updated.length === clients.length) return { statusCode: 404, body: JSON.stringify({ error: 'Not found' }) };
    await store.setJSON('all', updated);
    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ok: true }) };
  }

  return { statusCode: 405, body: 'Method Not Allowed' };
};
