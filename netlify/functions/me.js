import crypto from 'crypto';
import { getStore } from '@netlify/blobs';

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
    if (!client || !client.active || client.deleted) {
      return new Response(JSON.stringify({ error: 'Account not found' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    // Look up upcoming settlement date and purchase count in parallel
    let settlementDate = null;
    let purchaseCount = 0;
    try {
      const [msStore, purchasesStore] = [getStore('fairway-milestones'), getStore('fairway-purchases')];
      const [milestones, purchases] = await Promise.all([
        msStore.get(client.id, { type: 'json' }).catch(() => []),
        purchasesStore.get(client.id, { type: 'json' }).catch(() => []),
      ]);
      const upcoming = (milestones || [])
        .filter(m => m.type === 'settlement' && !m.completed && m.date)
        .sort((a, b) => new Date(a.date) - new Date(b.date));
      if (upcoming.length) settlementDate = upcoming[0].date;
      purchaseCount = (purchases || []).length;
    } catch {}

    return new Response(
      JSON.stringify({ name: client.name, email: client.email, markets: client.markets || [], pipelineStage: client.pipelineStage || null, settlementDate, status: client.status || 'active', engagementNumber: client.engagementNumber || 1, purchaseCount }),
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
