import { getStore } from '@netlify/blobs';
import crypto from 'crypto';
import { getStaffPayload, hasModule } from './_staff-auth.js';

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

const VALID_STATUSES = new Set(['shortlisted','researching','rejected']);

export default async (req) => {
  const payload = await getStaffPayload(req);
  if (!payload) return json({ error: 'Unauthorized' }, 401);
  if (!hasModule(payload, 'shortlist')) return json({ error: 'Access denied' }, 403);

  const store = getStore({ name: 'fairway-shortlist', consistency: 'strong' });
  const all = (await store.get('all', { type: 'json' }).catch(() => null)) || [];

  if (req.method === 'GET') {
    // Contractors only see their own items (not moved_to_presentation ones that admin controls)
    const mine = all.filter(i => i.sourcedById === payload.userId);
    return json(mine);
  }

  if (req.method === 'POST') {
    const body = await req.json().catch(() => ({}));
    if (!body.address?.trim()) return json({ error: 'address required' }, 400);

    // Validate client assignment — contractor can only assign to their own clients
    const assignedClients = payload.assignedClients || [];
    if (body.clientId && !assignedClients.includes(body.clientId)) {
      return json({ error: 'You can only assign properties to your assigned clients' }, 403);
    }

    const item = {
      id: crypto.randomUUID(),
      address:      body.address?.trim()     || '',
      suburb:       body.suburb?.trim()      || '',
      state:        body.state?.trim()       || '',
      price:        body.price?.trim()       || '',
      propertyType: body.propertyType        || 'house',
      bedrooms:     body.bedrooms?.trim()    || '',
      bathrooms:    body.bathrooms?.trim()   || '',
      carspaces:    body.carspaces?.trim()   || '',
      landSize:     body.landSize?.trim()    || '',
      agentName:    body.agentName?.trim()   || '',
      agentAgency:  body.agentAgency?.trim() || '',
      agentPhone:   body.agentPhone?.trim()  || '',
      agentEmail:   body.agentEmail?.trim()  || '',
      links:        Array.isArray(body.links) ? body.links : [],
      source:       body.source              || 'own',
      notes:        body.notes?.trim()       || '',
      bankValuation: body.bankValuation?.trim() || '',
      bankLender:    body.bankLender?.trim()    || '',
      clientId:     body.clientId            || null,
      clientName:   body.clientName?.trim()  || '',
      status:       'shortlisted',
      // Attribution auto-set from session
      sourcedById:   payload.userId,
      sourcedByName: payload.name,
      sourcedByRole: 'contractor',
      history:     [{ at: new Date().toISOString(), by: payload.name, byId: payload.userId, byRole: 'contractor', action: 'created' }],
      createdAt:   new Date().toISOString(),
      updatedAt:   new Date().toISOString(),
    };
    all.push(item);
    await store.setJSON('all', all);
    return json({ ok: true, item }, 201);
  }

  if (req.method === 'PUT') {
    const body = await req.json().catch(() => ({}));
    const { id, action } = body;
    if (!id) return json({ error: 'id required' }, 400);
    const idx = all.findIndex(i => i.id === id);
    if (idx === -1) return json({ error: 'Not found' }, 404);
    // Contractor can only edit their own items
    if (all[idx].sourcedById !== payload.userId) return json({ error: 'Access denied' }, 403);
    // Cannot edit items already moved to presentation
    if (all[idx].status === 'moved_to_presentation') {
      return json({ error: 'This property has been moved to a presentation and can no longer be edited here.' }, 403);
    }

    if (action === 'move-to-presentation') {
      const now = new Date().toISOString();
      const presStore = getStore({ name: 'fairway-presentations', consistency: 'strong' });
      const presAll = (await presStore.get('all', { type: 'json' }).catch(() => null)) || [];
      const si = all[idx];
      const pres = {
        id: crypto.randomUUID(),
        reviewStatus: 'draft',
        reviewStatusUpdatedAt: now,
        sourcedById: payload.userId,
        sourcedByName: payload.name,
        sourcedByRole: 'contractor',
        address: si.address || '',
        suburb: si.suburb || '',
        price: si.price || '',
        propertyType: si.propertyType || 'house',
        bedrooms: si.bedrooms || '',
        bathrooms: si.bathrooms || '',
        carspaces: si.carspaces || '',
        landSize: si.landSize || '',
        clientId: si.clientId || null,
        clientName: si.clientName || '',
        shortlistId: si.id,
        history: [{ at: now, by: payload.name, byId: payload.userId, byRole: 'contractor', action: 'created', detail: 'from shortlist' }],
        createdAt: now,
        updatedAt: now,
      };
      presAll.push(pres);
      await presStore.setJSON('all', presAll);
      all[idx].status = 'moved_to_presentation';
      all[idx].movedToPresId = pres.id;
      all[idx].movedAt = now;
      all[idx].updatedAt = now;
      if (!Array.isArray(all[idx].history)) all[idx].history = [];
      all[idx].history.push({ at: now, by: payload.name, byId: payload.userId, byRole: 'contractor', action: 'moved_to_presentation' });
      await store.setJSON('all', all);
      return json({ ok: true, item: all[idx], presId: pres.id });
    }

    const assignedClients = payload.assignedClients || [];
    if (body.clientId && !assignedClients.includes(body.clientId)) {
      return json({ error: 'You can only assign properties to your assigned clients' }, 403);
    }

    const fields = ['address','suburb','state','price','propertyType','bedrooms','bathrooms',
                    'carspaces','landSize','agentName','agentAgency','agentPhone','agentEmail',
                    'source','notes','clientId','clientName','links','bankValuation','bankLender'];
    fields.forEach(f => { if (body[f] !== undefined) all[idx][f] = body[f]; });
    const prevStatus = all[idx].status;
    if (body.status && VALID_STATUSES.has(body.status)) all[idx].status = body.status;
    all[idx].updatedAt = new Date().toISOString();
    if (!Array.isArray(all[idx].history)) all[idx].history = [];
    if (body.status && VALID_STATUSES.has(body.status) && body.status !== prevStatus) {
      all[idx].history.push({ at: new Date().toISOString(), by: payload.name, byId: payload.userId, byRole: 'contractor', action: 'status_changed', detail: body.status });
    } else {
      all[idx].history.push({ at: new Date().toISOString(), by: payload.name, byId: payload.userId, byRole: 'contractor', action: 'updated' });
    }
    await store.setJSON('all', all);
    return json({ ok: true, item: all[idx] });
  }

  return new Response('Method Not Allowed', { status: 405 });
};

export const config = { path: '/api/staff/shortlist', method: ['GET', 'POST', 'PUT'] };
