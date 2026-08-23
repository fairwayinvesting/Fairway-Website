import { getStore } from '@netlify/blobs';
import { getStaffPayload, hasModule } from './_staff-auth.js';

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

// Fields a contractor is allowed to see on a client
function filterClientFields(c) {
  return {
    id: c.id,
    name: c.name,
    email: c.email,
    phone: c.phone,
    stage: c.stage,
    markets: c.markets,
    active: c.active,
    createdAt: c.createdAt,
    // brief / search parameters
    brief: c.brief,
    briefText: c.briefText,
    briefUrl: c.briefUrl,
    strategy: c.strategy,
    budgetMin: c.budgetMin,
    budgetMax: c.budgetMax,
    budget: c.budget,
    propertyTypes: c.propertyTypes,
    targetYield: c.targetYield,
    // acquisition context
    acquisitions: (c.acquisitions || []).map(acq => ({
      id: acq.id,
      label: acq.label,
      stage: acq.stage,
      budget: acq.budget,
      budgetMin: acq.budgetMin,
      budgetMax: acq.budgetMax,
      markets: acq.markets,
      propertyTypes: acq.propertyTypes,
      briefText: acq.briefText,
      createdAt: acq.createdAt,
    })),
  };
}

export default async (req) => {
  if (req.method !== 'GET') return new Response('Method Not Allowed', { status: 405 });

  const payload = await getStaffPayload(req);
  if (!payload) return json({ error: 'Unauthorized' }, 401);
  if (!hasModule(payload, 'clients')) return json({ error: 'Access denied' }, 403);

  const { assignedClients = [] } = payload;
  if (!assignedClients.length) return json([]);

  const store = getStore('fairway-clients');
  const all = (await store.get('all', { type: 'json' }).catch(() => null)) || [];

  const visible = all
    .filter(c => !c.deleted && c.active && assignedClients.includes(c.id))
    .map(filterClientFields);

  return json(visible);
};

export const config = { path: '/api/staff/clients', method: ['GET'] };
