import { getStore } from '@netlify/blobs';
import crypto from 'crypto';
import { getStaffPayload, hasModule } from './_staff-auth.js';

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

// Fields a contractor is allowed to set/update
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

  const store = getStore({ name: 'fairway-presentations', consistency: 'strong' });
  const all = (await store.get('all', { type: 'json' }).catch(() => null)) || [];

  if (req.method === 'GET') {
    const mine = all
      .filter(p => p.sourcedById === payload.userId)
      .map(p => {
        const { tokens, sentClients, clientAcquisitions, ...safe } = p;
        return safe;
      });
    return json(mine);
  }

  // Create new presentation from scratch
  if (req.method === 'POST') {
    const body = await req.json().catch(() => ({}));
    if (!body.address?.trim()) return json({ error: 'address required' }, 400);
    const now = new Date().toISOString();
    const pres = {
      id: crypto.randomUUID(),
      reviewStatus: 'draft',
      reviewStatusUpdatedAt: now,
      sourcedById: payload.userId,
      sourcedByName: payload.name,
      createdAt: now,
      updatedAt: now,
    };
    EDITABLE_FIELDS.forEach(f => { if (body[f] !== undefined) pres[f] = body[f]; });
    all.push(pres);
    await store.setJSON('all', all);
    const { tokens, sentClients, clientAcquisitions, ...safe } = pres;
    return json({ ok: true, pres: safe }, 201);
  }

  if (req.method === 'PUT') {
    const body = await req.json().catch(() => ({}));
    const { id, action } = body;
    if (!id) return json({ error: 'id required' }, 400);

    const idx = all.findIndex(p => p.id === id);
    if (idx === -1) return json({ error: 'Not found' }, 404);
    if (all[idx].sourcedById !== payload.userId) return json({ error: 'Access denied' }, 403);

    const rs = all[idx].reviewStatus || 'draft';

    // Submit/resubmit for review — allowed from draft or rejected
    if (action === 'ready-for-review') {
      if (!['draft', 'rejected'].includes(rs)) {
        return json({ error: 'This presentation has already been submitted for review.' }, 400);
      }
      all[idx].reviewStatus = 'ready_for_review';
      all[idx].reviewStatusUpdatedAt = new Date().toISOString();
      all[idx].reviewFeedback = null;
      await store.setJSON('all', all);
      return json({ ok: true, reviewStatus: 'ready_for_review' });
    }

    // Nominate suitable clients
    if (action === 'set-suitable-clients') {
      const assignedClients = new Set(payload.assignedClients || []);
      const suitableClients = Array.isArray(body.suitableClients)
        ? body.suitableClients.filter(c => assignedClients.has(c.clientId || c))
        : [];
      all[idx].suitableClients = suitableClients;
      await store.setJSON('all', all);
      return json({ ok: true });
    }

    // Field edits — allowed while draft, ready_for_review, or rejected
    const editableStatuses = new Set(['draft', 'ready_for_review', 'rejected']);
    if (!editableStatuses.has(rs)) {
      return json({ error: 'This presentation has been approved and can no longer be edited.' }, 403);
    }

    EDITABLE_FIELDS.forEach(f => { if (body[f] !== undefined) all[idx][f] = body[f]; });
    all[idx].updatedAt = new Date().toISOString();
    await store.setJSON('all', all);
    return json({ ok: true, pres: all[idx] });
  }

  return new Response('Method Not Allowed', { status: 405 });
};

export const config = { path: '/api/staff/presentations', method: ['GET', 'POST', 'PUT'] };
