import { getStore } from '@netlify/blobs';
import crypto from 'crypto';

function verifyJWT(token, secret) {
  try {
    const [h, b, sig] = token.split('.');
    const expected = crypto.createHmac('sha256', secret).update(`${h}.${b}`).digest('base64url');
    const sa = Buffer.from(sig, 'base64url'), sb = Buffer.from(expected, 'base64url');
    if (sa.length !== sb.length || !crypto.timingSafeEqual(sa, sb)) return null;
    const payload = JSON.parse(Buffer.from(b, 'base64url').toString());
    if (payload.exp && payload.exp < Date.now() / 1000) return null;
    return payload;
  } catch { return null; }
}

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

export default async (req) => {
  const cookie = req.headers.get('cookie') || '';
  const match = cookie.match(/fw_session=([^;]+)/);
  if (!match) return json({ error: 'Not authenticated' }, 401);

  const payload = verifyJWT(match[1], process.env.JWT_SECRET);
  if (!payload) return json({ error: 'Session expired' }, 401);

  const clientId = payload.sub;

  let all = [];
  try {
    const store = getStore('fairway-presentations');
    all = (await store.get('all', { type: 'json' })) || [];
  } catch (err) {
    console.error('presentations: Blobs error', err?.message || err);
    return json({ presentations: [] });
  }

  const mine = all
    .filter(p =>
      Array.isArray(p.assignedClients) &&
      p.assignedClients.includes(clientId) &&
      !(p.revokedClients || []).includes(clientId)
    )
    .map(p => ({
      id: p.id,
      address: p.address || '',
      suburb: p.suburb || '',
      price: p.price || '',
      propertyType: p.propertyType || 'house',
      bedrooms: p.bedrooms || '',
      bathrooms: p.bathrooms || '',
      status: p.status || '',
      token: (p.tokens || {})[clientId] || null,
      acquisitionId: (p.clientAcquisitions || {})[clientId] || null,
    }))
    .filter(p => p.token);

  return json({ presentations: mine });
};

export const config = { path: '/api/presentations', method: ['GET'] };
