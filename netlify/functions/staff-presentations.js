import { getStore } from '@netlify/blobs';
import { getStaffPayload, hasModule } from './_staff-auth.js';

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

// Fields a contractor is allowed to update
const EDITABLE_FIELDS = [
  'address','suburb','price','propertyType','bedrooms','bathrooms','carspaces','landSize',
  'propertyDescription','summary','highlights','knownIssues',
  'images','videos',
  'cashflow','riskProfile','demographics','customSections',
  'comparableSales','comparableRentals',
];

export default async (req) => {
  const payload = await getStaffPayload(req);
  if (!payload) return json({ error: 'Unauthorized' }, 401);
  if (!hasModule(payload, 'presentations')) return json({ error: 'Access denied' }, 403);

  const store = getStore('fairway-presentations');
  const all = (await store.get('all', { type: 'json' }).catch(() => null)) || [];

  if (req.method === 'GET') {
    // Contractor sees presentations they sourced
    const mine = all
      .filter(p => p.sourcedById === payload.userId)
      .map(p => {
        // Strip tokens and sensitive client data
        const { tokens, sentClients, clientAcquisitions, ...safe } = p;
        return safe;
      });
    return json(mine);
  }

  if (req.method === 'PUT') {
    const body = await req.json().catch(() => ({}));
    const { id, action } = body;
    if (!id) return json({ error: 'id required' }, 400);

    const idx = all.findIndex(p => p.id === id);
    if (idx === -1) return json({ error: 'Not found' }, 404);

    // Contractor can only edit their own presentations
    if (all[idx].sourcedById !== payload.userId) return json({ error: 'Access denied' }, 403);

    // Ready for Review — contractor submits for admin review
    if (action === 'ready-for-review') {
      if (all[idx].reviewStatus !== 'draft') {
        return json({ error: 'This presentation has already been submitted for review.' }, 400);
      }
      all[idx].reviewStatus = 'ready_for_review';
      all[idx].reviewStatusUpdatedAt = new Date().toISOString();
      await store.setJSON('all', all);
      return json({ ok: true, reviewStatus: 'ready_for_review' });
    }

    // Nominate suitable clients (only from contractor's assigned clients)
    if (action === 'set-suitable-clients') {
      const assignedClients = new Set(payload.assignedClients || []);
      const suitableClients = Array.isArray(body.suitableClients)
        ? body.suitableClients.filter(c => assignedClients.has(c.clientId || c))
        : [];
      all[idx].suitableClients = suitableClients;
      await store.setJSON('all', all);
      return json({ ok: true });
    }

    // Research field updates — only allowed while in draft or ready_for_review
    const editableStatuses = new Set(['draft', 'ready_for_review']);
    if (!editableStatuses.has(all[idx].reviewStatus)) {
      return json({ error: 'This presentation is under admin review and can no longer be edited.' }, 403);
    }

    EDITABLE_FIELDS.forEach(f => { if (body[f] !== undefined) all[idx][f] = body[f]; });
    all[idx].updatedAt = new Date().toISOString();
    await store.setJSON('all', all);
    return json({ ok: true, pres: all[idx] });
  }

  return new Response('Method Not Allowed', { status: 405 });
};

export const config = { path: '/api/staff/presentations', method: ['GET', 'PUT'] };
