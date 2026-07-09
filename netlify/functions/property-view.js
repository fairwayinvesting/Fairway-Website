import { getStore } from '@netlify/blobs';

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

export default async (req) => {
  const token = new URL(req.url).searchParams.get('t');
  if (!token) return json({ error: 'Token required' }, 400);

  const store = getStore('fairway-presentations');
  const presentations = (await store.get('all', { type: 'json' })) || [];

  let found = null, clientId = null;
  const previewMatch = presentations.find(p => p.previewToken === token);
  if (previewMatch) {
    found = previewMatch;
    clientId = '_preview';
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
    // Client must still be in assignedClients (catches unassigned clients who have old tokens)
    if (!(found.assignedClients || []).includes(clientId)) {
      return json({ error: 'Not found' }, 404);
    }
    // Check revoked
    if ((found.revokedClients || []).includes(clientId)) {
      return json({ revoked: true }, 403);
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
            propertyType, summary, highlights, images, videos,
            cashflow, riskProfile, demographics, customSections, status } = found;
    return json({
      id, address, suburb, price, bedrooms, bathrooms, carspaces, landSize,
      propertyType, summary, highlights,
      images: images || [], videos: videos || [],
      cashflow: cashflow || {}, riskProfile: riskProfile || {},
      demographics: demographics || {}, customSections: customSections || [],
      status: status || '',
      firstName, isPreview: clientId === '_preview',
    });
  }

  if (req.method === 'POST') {
    if (clientId === '_preview') return json({ ok: true });
    const idx = presentations.findIndex(p => p.id === found.id);
    if (idx !== -1) {
      if (!presentations[idx].views[clientId]) presentations[idx].views[clientId] = { firstViewedAt: null, viewCount: 0 };
      const v = presentations[idx].views[clientId];
      if (!v.firstViewedAt) v.firstViewedAt = new Date().toISOString();
      v.viewCount = (v.viewCount || 0) + 1;
      await store.setJSON('all', presentations);
    }
    return json({ ok: true });
  }

  return new Response('Method Not Allowed', { status: 405 });
};

export const config = { path: '/api/property-view', method: ['GET', 'POST'] };
