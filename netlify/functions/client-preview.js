import { getStore } from '@netlify/blobs';
import crypto from 'crypto';

function signJWT(payload, secret) {
  const h = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const b = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(`${h}.${b}`).digest('base64url');
  return `${h}.${b}.${sig}`;
}

const redirect = (url) => new Response(null, { status: 302, headers: { Location: url } });
const error = (msg) => new Response(msg, { status: 400, headers: { 'Content-Type': 'text/plain' } });

export default async (req) => {
  if (req.method !== 'GET') return new Response('Method Not Allowed', { status: 405 });

  const token = new URL(req.url).searchParams.get('t') || '';

  // Parse cp.{clientId}.{ts}.{sig}
  const parts = token.split('.');
  if (parts.length !== 4 || parts[0] !== 'cp') return error('Invalid preview token.');

  const [, clientId, tsHex, sig] = parts;

  // Verify timestamp — reject if older than 5 minutes
  const ts = parseInt(tsHex, 36);
  if (isNaN(ts) || Date.now() - ts > 5 * 60 * 1000) return error('Preview link has expired. Generate a new one from the admin panel.');

  // Verify HMAC
  const key = (process.env.ADMIN_PASSWORD || '') + ':preview:' + (process.env.JWT_SECRET || '');
  const expected = crypto.createHmac('sha256', key).update(clientId + '.' + tsHex).digest('hex').slice(0, 40);
  if (!crypto.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expected, 'hex'))) return error('Invalid preview token.');

  // Look up client
  const store = getStore('fairway-clients');
  const clients = (await store.get('all', { type: 'json' })) || [];
  const client = clients.find(c => c.id === clientId);
  if (!client || !client.active) return error('Client not found or inactive.');

  // Issue a 1-hour admin preview session
  const sessionToken = signJWT({
    sub: client.id,
    name: client.name,
    email: client.email,
    markets: client.markets || [],
    preview: true,
    exp: Math.floor(Date.now() / 1000) + 60 * 60,
  }, process.env.JWT_SECRET);

  return new Response(null, {
    status: 302,
    headers: {
      Location: '/clients/portal.html',
      'Set-Cookie': `fw_session=${sessionToken}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=3600`,
    },
  });
};

export const config = { path: '/api/client-preview', method: ['GET'] };
