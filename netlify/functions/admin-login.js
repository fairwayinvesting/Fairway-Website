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

export default async (req) => {
  const { password, code } = await req.json().catch(() => ({}));
  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const totpSecret = process.env.TOTP_SECRET;
  if (totpSecret) {
    if (!code) {
      return new Response(JSON.stringify({ step: 'totp' }), {
        status: 202,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (!verifyTOTP(totpSecret, code)) {
      return new Response(JSON.stringify({ error: 'Invalid authenticator code' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

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
