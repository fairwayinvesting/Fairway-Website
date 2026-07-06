const crypto = require('crypto');
const { getStore } = require('@netlify/blobs');

async function pbkdf2(password, salt) {
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(password, salt, 100000, 32, 'sha256', (err, key) =>
      err ? reject(err) : resolve(key.toString('hex'))
    );
  });
}

async function verifyPassword(password, salt, storedHash) {
  const computed = await pbkdf2(password, salt);
  return crypto.timingSafeEqual(Buffer.from(computed, 'hex'), Buffer.from(storedHash, 'hex'));
}

function signJWT(payload, secret) {
  const h = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const b = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(`${h}.${b}`).digest('base64url');
  return `${h}.${b}.${sig}`;
}

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  let body;
  try { body = JSON.parse(event.body || '{}'); } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const { email, password } = body;
  if (!email || !password) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Email and password required' }) };
  }

  const store = getStore('fairway-clients');
  const clients = (await store.get('all', { type: 'json' })) || [];
  const client = clients.find(c => c.email.toLowerCase() === email.toLowerCase().trim() && c.active);

  // Run hash even when client not found — prevents timing-based user enumeration
  const salt = client ? client.passwordSalt : crypto.randomBytes(16).toString('hex');
  const hash = client ? client.passwordHash : crypto.randomBytes(32).toString('hex');
  const valid = await verifyPassword(password, salt, hash);

  if (!client || !valid) {
    return {
      statusCode: 401,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Invalid email or password' }),
    };
  }

  const token = signJWT({
    sub: client.id,
    name: client.name,
    email: client.email,
    markets: client.markets,
    exp: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
  }, process.env.JWT_SECRET);

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': `fw_session=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${30 * 24 * 60 * 60}`,
    },
    body: JSON.stringify({ ok: true, name: client.name, markets: client.markets }),
  };
};
