import { getStore } from '@netlify/blobs';
import { getStaffPayload, hasModule } from './_staff-auth.js';

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

function filterClientFields(c, publishedBrief) {
  return {
    id: c.id,
    name: c.name,
    email: c.email,
    phone: c.phone,
    stage: c.stage,
    markets: c.markets,
    active: c.active,
    createdAt: c.createdAt,
    // Published buying brief (from fairway-briefs store — this is the source of truth)
    publishedBrief: publishedBrief || null,
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

  const clientStore = getStore({ name: 'fairway-clients', consistency: 'strong' });
  const briefStore = getStore({ name: 'fairway-briefs', consistency: 'strong' });

  const all = (await clientStore.get('all', { type: 'json' }).catch(() => null)) || [];
  const assigned = all.filter(c => !c.deleted && c.active && assignedClients.includes(c.id));

  // Load published briefs for all assigned clients in parallel
  const briefs = await Promise.all(
    assigned.map(c =>
      briefStore.get(c.id, { type: 'json' })
        .then(b => (b && b.status === 'published' ? b : null))
        .catch(() => null)
    )
  );

  const visible = assigned.map((c, i) => filterClientFields(c, briefs[i]));

  return json(visible);
};

export const config = { path: '/api/staff/clients', method: ['GET'] };
