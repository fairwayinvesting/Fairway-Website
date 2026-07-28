import { getStore } from '@netlify/blobs';
import crypto from 'crypto';

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

export default async (req) => {
  const token = new URL(req.url).searchParams.get('t');
  if (!token) return json({ error: 'Token required' }, 400);

  const store = getStore('fairway-presentations');
  const presentations = (await store.get('all', { type: 'json' })) || [];

  let found = null, clientId = null;

  if (token.startsWith('pv.')) {
    // HMAC-signed preview token — verify without any Blobs read race
    const lastDot = token.lastIndexOf('.');
    if (lastDot > 3) {
      const presId = token.slice(3, lastDot);
      const sig = token.slice(lastDot + 1);
      const expected = crypto.createHmac('sha256', process.env.ADMIN_PASSWORD || 'fp-preview')
                             .update(presId).digest('hex').slice(0, 32);
      const sa = Buffer.from(sig, 'hex'), sb = Buffer.from(expected, 'hex');
      if (sa.length === sb.length && sa.length > 0 && crypto.timingSafeEqual(sa, sb)) {
        found = presentations.find(p => p.id === presId) || null;
        if (found) clientId = '_preview';
      }
    }
  } else {
    for (const p of presentations) {
      for (const [cid, tok] of Object.entries(p.tokens || {})) {
        if (tok === token) { found = p; clientId = cid; break; }
      }
      if (found) break;
    }
  }

  if (!found) return json({ error: 'Not found' }, 404);

  // Check expiry
  if (found.expiresAt && new Date(found.expiresAt) < new Date()) {
    return json({ expired: true }, 410);
  }

  if (clientId !== '_preview') {
    // Check revoked — a token in p.tokens is proof of prior assignment, so revocation is the only gate
    if ((found.revokedClients || []).includes(clientId)) {
      return json({ revoked: true, reason: found.revocationReason || '' }, 403);
    }
  }

  if (req.method === 'GET') {
    let firstName = '';
    if (clientId !== '_preview') {
      const clientStore = getStore('fairway-clients');
      const allClients = (await clientStore.get('all', { type: 'json' })) || [];
      const client = allClients.find(c => c.id === clientId);
      firstName = client ? client.name.split(' ')[0] : '';
    }
    const { id, address, suburb, price, bedrooms, bathrooms, carspaces, landSize,
            propertyType, propertyDescription, summary, highlights, knownIssues, images, videos,
            cashflow, riskProfile, demographics, customSections,
            comparableSales, comparableRentals, status } = found;
    return json({
      id, address, suburb, price, bedrooms, bathrooms, carspaces, landSize,
      propertyType, propertyDescription: propertyDescription || '', summary, highlights,
      knownIssues: knownIssues || '',
      images: images || [], videos: videos || [],
      cashflow: cashflow || {}, riskProfile: riskProfile || {},
      demographics: demographics || {}, customSections: customSections || [],
      comparableSales: comparableSales || {}, comparableRentals: comparableRentals || {},
      status: status || '',
      firstName, isPreview: clientId === '_preview',
    });
  }

  if (req.method === 'POST') {
    if (clientId === '_preview') return json({ ok: true });
    // Write only to the per-presentation views store — avoids rewriting the entire presentations array
    const pvStore = getStore('fairway-presentation-views');
    const views = (await pvStore.get(found.id, { type: 'json' }).catch(() => null)) || {};
    if (!views[clientId]) views[clientId] = { firstViewedAt: null, viewCount: 0 };
    const v = views[clientId];
    if (!v.firstViewedAt) v.firstViewedAt = new Date().toISOString();
    v.viewCount = (v.viewCount || 0) + 1;
    await pvStore.setJSON(found.id, views);
    return json({ ok: true });
  }

  return new Response('Method Not Allowed', { status: 405 });
};

export const config = { path: '/api/property-view', method: ['GET', 'POST'] };
