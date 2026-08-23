import { getStore } from '@netlify/blobs';
import { getStaffPayload, hasModule } from './_staff-auth.js';

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

export default async (req) => {
  if (req.method !== 'GET') return new Response('Method Not Allowed', { status: 405 });

  const payload = await getStaffPayload(req);
  if (!payload) return json({ error: 'Unauthorized' }, 401);
  if (!hasModule(payload, 'pipeline')) return json({ error: 'Access denied' }, 403);

  const { assignedClients = [] } = payload;
  if (!assignedClients.length) return json([]);

  const store = getStore('fairway-clients');
  const all = (await store.get('all', { type: 'json' }).catch(() => null)) || [];

  const pipeline = all
    .filter(c => !c.deleted && c.active && assignedClients.includes(c.id))
    .map(c => ({
      id: c.id,
      name: c.name,
      stage: c.stage,
      markets: c.markets,
      acquisitions: (c.acquisitions || []).map(acq => ({
        id: acq.id,
        label: acq.label,
        stage: acq.stage,
        markets: acq.markets,
        createdAt: acq.createdAt,
      })),
    }));

  return json(pipeline);
};

export const config = { path: '/api/staff/pipeline', method: ['GET'] };
