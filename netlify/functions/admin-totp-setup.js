import crypto from 'crypto';
import { checkAdmin } from './_admin-auth.js';

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

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

export default async (req) => {
  if (!checkAdmin(req)) return json({ error: 'Unauthorized' }, 401);

  const configured = !!process.env.TOTP_SECRET;

  if (req.method === 'GET') {
    const secret = process.env.TOTP_SECRET ||
      Array.from(crypto.randomBytes(32), b => 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'[b % 32]).join('');
    const uri = `otpauth://totp/Fairway%20Admin?secret=${secret}&issuer=Fairway&algorithm=SHA1&digits=6&period=30`;
    return json({ secret, uri, configured });
  }

  if (req.method === 'POST') {
    const { code, secret: testSecret } = await req.json().catch(() => ({}));
    const secret = testSecret || process.env.TOTP_SECRET;
    if (!secret || !code) return json({ error: 'secret and code required' }, 400);
    return json({ valid: verifyTOTP(secret, code) });
  }

  return new Response('Method Not Allowed', { status: 405 });
};

export const config = { path: '/api/admin/totp-setup', method: ['GET', 'POST'] };
