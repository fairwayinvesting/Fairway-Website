const crypto = require('crypto');

function verifyJWT(token, secret) {
  try {
    const [h, b, sig] = token.split('.');
    const expected = crypto.createHmac('sha256', secret).update(`${h}.${b}`).digest('base64url');
    if (sig !== expected) return null;
    const payload = JSON.parse(Buffer.from(b, 'base64url').toString());
    if (payload.exp && payload.exp < Date.now() / 1000) return null;
    return payload;
  } catch { return null; }
}

exports.handler = async function (event) {
  const cookie = event.headers['cookie'] || '';
  const match = cookie.match(/fw_session=([^;]+)/);
  if (!match) return { statusCode: 401, body: JSON.stringify({ error: 'Not authenticated' }) };

  const payload = verifyJWT(match[1], process.env.JWT_SECRET);
  if (!payload) return { statusCode: 401, body: JSON.stringify({ error: 'Session expired' }) };

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: payload.name, email: payload.email, markets: payload.markets }),
  };
};
