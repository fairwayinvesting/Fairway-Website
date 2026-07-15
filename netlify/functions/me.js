import crypto from 'crypto';
import { getStore } from '@netlify/blobs';

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

export default async (req) => {
  const cookie = req.headers.get('cookie') || '';
  const match = cookie.match(/fw_session=([^;]+)/);
  if (!match) return new Response(JSON.stringify({ error: 'Not authenticated' }), { status: 401, headers: { 'Content-Type': 'application/json' } });

  const payload = verifyJWT(match[1], process.env.JWT_SECRET);
  if (!payload) return new Response(JSON.stringify({ error: 'Session expired' }), { status: 401, headers: { 'Content-Type': 'application/json' } });

  // Live lookup so markets (and name) are always current, not stale from JWT
  try {
    const store = getStore('fairway-clients');
    const clients = (await store.get('all', { type: 'json' })) || [];
    const client = clients.find(c => c.id === payload.sub);
    if (!client || !client.active) {
      return new Response(JSON.stringify({ error: 'Account not found' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    // Look up upcoming settlement date for this client
    let settlementDate = null;
    try {
      const msStore = getStore('fairway-milestones');
      const milestones = (await msStore.get(client.id, { type: 'json' })) || [];
      const upcoming = milestones
        .filter(m => m.type === 'settlement' && !m.completed && m.date)
        .sort((a, b) => new Date(a.date) - new Date(b.date));
      if (upcoming.length) settlementDate = upcoming[0].date;
    } catch {}

    return new Response(
      JSON.stringify({ name: client.name, email: client.email, markets: client.markets || [], pipelineStage: client.pipelineStage || null, settlementDate }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch {
    // Blobs unavailable — fall back to JWT payload so login still works
    return new Response(
      JSON.stringify({ name: payload.name, email: payload.email, markets: payload.markets || [] }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const config = { path: '/api/me' };
