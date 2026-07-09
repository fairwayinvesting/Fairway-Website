import { getStore } from '@netlify/blobs';

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

export default async (req) => {
  const token = new URL(req.url).searchParams.get('t');
  if (!token) return json({ error: 'Token required' }, 400);

  const store = getStore('fairway-presentations');
  const presentations = (await store.get('all', { type: 'json' })) || [];

  let found = null, clientId = null;
  for (const p of presentations) {
    for (const [cid, tok] of Object.entries(p.tokens || {})) {
      if (tok === token) { found = p; clientId = cid; break; }
    }
    if (found) break;
  }

  if (!found) return json({ error: 'Not found' }, 404);

  if (req.method === 'GET') {
    const clientStore = getStore('fairway-clients');
    const allClients = (await clientStore.get('all', { type: 'json' })) || [];
    const client = allClients.find(c => c.id === clientId);
    const firstName = client ? client.name.split(' ')[0] : '';
    const { id, address, suburb, price, bedrooms, bathrooms, carspaces,
            landSize, propertyType, videoUrl, imageUrl, summary, highlights } = found;
    return json({ id, address, suburb, price, bedrooms, bathrooms, carspaces,
                  landSize, propertyType, videoUrl, imageUrl, summary, highlights, firstName });
  }

  if (req.method === 'POST') {
    const idx = presentations.findIndex(p => p.id === found.id);
    if (idx !== -1) {
      if (!presentations[idx].views[clientId]) {
        presentations[idx].views[clientId] = { firstViewedAt: null, viewCount: 0 };
      }
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
