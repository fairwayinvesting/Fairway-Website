import { getStore } from '@netlify/blobs';
import crypto from 'crypto';
import { appendAudit } from './_audit.js';
import { checkAdmin, getAdminActor } from './_admin-auth.js';

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

const VALID_STATUSES = new Set(['shortlisted','researching','moved_to_presentation','rejected','to_review','passed']);

export default async (req) => {
  if (!(await checkAdmin(req))) return json({ error: 'Unauthorized' }, 401);

  const store = getStore({ name: 'fairway-shortlist', consistency: 'strong' });
  const all = (await store.get('all', { type: 'json' }).catch(() => null)) || [];

  if (req.method === 'GET') {
    const { searchParams } = new URL(req.url);
    const filterSourcedBy = searchParams.get('sourcedBy') || '';
    const filterClientId  = searchParams.get('clientId')  || '';
    const filterStatus    = searchParams.get('status')    || '';
    let result = all;
    if (filterSourcedBy) result = result.filter(i => i.sourcedById === filterSourcedBy || (!i.sourcedById && filterSourcedBy === 'admin'));
    if (filterClientId)  result = result.filter(i => i.clientId === filterClientId);
    if (filterStatus)    result = result.filter(i => i.status === filterStatus);
    return json(result);
  }

  if (req.method === 'POST') {
    const body = await req.json().catch(() => ({}));
    if (!body.address?.trim()) return json({ error: 'address required' }, 400);
    const actor = await getAdminActor(req);
    const actorName = actor === 'secondary' ? 'Admin (secondary)' : 'Luke';
    const now = new Date().toISOString();
    const item = {
      id: crypto.randomUUID(),
      address:     body.address?.trim()     || '',
      suburb:      body.suburb?.trim()      || '',
      state:       body.state?.trim()       || '',
      price:       body.price?.trim()       || '',
      propertyType: body.propertyType       || 'house',
      bedrooms:    body.bedrooms?.trim()    || '',
      bathrooms:   body.bathrooms?.trim()   || '',
      carspaces:   body.carspaces?.trim()   || '',
      landSize:    body.landSize?.trim()    || '',
      agentName:   body.agentName?.trim()   || '',
      agentAgency: body.agentAgency?.trim() || '',
      agentPhone:  body.agentPhone?.trim()  || '',
      agentEmail:  body.agentEmail?.trim()  || '',
      bankValuation: body.bankValuation?.trim() || '',
      bankLender:  body.bankLender?.trim()  || '',
      links:       Array.isArray(body.links) ? body.links : [],
      source:      body.source              || 'own',
      notes:       body.notes?.trim()       || '',
      clientId:    body.clientId            || null,
      clientName:  body.clientName?.trim()  || '',
      status:      'shortlisted',
      // Attribution
      sourcedById:   'admin',
      sourcedByName: actorName,
      sourcedByRole: 'admin',
      history:     [{ at: now, by: actorName, byId: 'admin', byRole: 'admin', action: 'created' }],
      createdAt:   now,
      updatedAt:   now,
    };
    all.push(item);
    await store.setJSON('all', all);
    appendAudit('shortlist_added', `Added to shortlist: ${item.address}${item.suburb ? `, ${item.suburb}` : ''}`);
    return json({ ok: true, item }, 201);
  }

  if (req.method === 'PUT') {
    const body = await req.json().catch(() => ({}));
    const { id, action } = body;
    if (!id) return json({ error: 'id required' }, 400);
    const idx = all.findIndex(i => i.id === id);
    if (idx === -1) return json({ error: 'Not found' }, 404);

    const putActor = await getAdminActor(req);
    const putActorName = putActor === 'secondary' ? 'Admin (secondary)' : 'Luke';
    const histPush = (entry) => {
      if (!Array.isArray(all[idx].history)) all[idx].history = [];
      all[idx].history.push({ at: new Date().toISOString(), by: putActorName, byId: 'admin', byRole: 'admin', ...entry });
    };

    // Move shortlist item → new presentation
    if (action === 'move-to-presentation') {
      const item = all[idx];
      const presStore = getStore('fairway-presentations');
      const presentations = (await presStore.get('all', { type: 'json' }).catch(() => null)) || [];
      const presId = crypto.randomUUID();
      const newPres = {
        id: presId,
        address: item.address,
        suburb: item.suburb || '',
        price: item.price || '',
        bedrooms: item.bedrooms || '',
        bathrooms: item.bathrooms || '',
        carspaces: item.carspaces || '',
        landSize: item.landSize || '',
        propertyType: item.propertyType || 'house',
        propertyDescription: '',
        summary: '',
        highlights: [],
        knownIssues: '',
        images: [],
        videos: [],
        cashflow: { enabled: false, purchasePrice: '', weeklyRent: '', interestRate: '', lvr: '80', managementFee: '8', annualRates: '', annualInsurance: '', annualMaintenance: '' },
        riskProfile: { enabled: false, risks: [] },
        demographics: { enabled: false, ownerOccupier: '', renter: '', publicHousing: '', notes: '', imageUrl: '' },
        customSections: [],
        comparableSales: { enabled: false, items: [] },
        comparableRentals: { enabled: false, items: [] },
        revocationReason: '',
        status: '',
        expiresAt: null,
        assignedClients: item.clientId ? [item.clientId] : [],
        revokedClients: [],
        tokens: {},
        sentClients: [],
        clientAcquisitions: {},
        previewToken: null,
        // Attribution carried from shortlist
        shortlistId: item.id,
        sourcedById: item.sourcedById || 'admin',
        sourcedByName: item.sourcedByName || 'Luke',
        sourcedByRole: item.sourcedByRole || 'admin',
        // Review workflow
        reviewStatus: 'draft',
        reviewStatusUpdatedAt: new Date().toISOString(),
        suitableClients: [],
        history: [{ at: new Date().toISOString(), by: putActorName, byId: 'admin', byRole: 'admin', action: 'created', detail: 'from shortlist' }],
        agentName:   item.agentName || '',
        agentAgency: item.agentAgency || '',
        agentPhone:  item.agentPhone || '',
        agentEmail:  item.agentEmail || '',
        notes: item.notes || '',
        createdAt: new Date().toISOString(),
      };
      presentations.push(newPres);
      await presStore.setJSON('all', presentations);
      // Update shortlist status
      all[idx].status = 'moved_to_presentation';
      all[idx].movedToPresId = presId;
      all[idx].updatedAt = new Date().toISOString();
      histPush({ action: 'moved_to_presentation' });
      await store.setJSON('all', all);
      appendAudit('shortlist_moved', `Moved to presentation: ${item.address}`);
      return json({ ok: true, presId, item: all[idx] });
    }

    const fields = ['address','suburb','state','price','propertyType','bedrooms','bathrooms',
                    'carspaces','landSize','agentName','agentAgency','agentPhone','agentEmail',
                    'source','notes','clientId','clientName','bankValuation','bankLender','links'];
    fields.forEach(f => { if (body[f] !== undefined) all[idx][f] = body[f]; });
    const prevStatus = all[idx].status;
    if (body.status && VALID_STATUSES.has(body.status)) all[idx].status = body.status;
    // Admin can correct attribution
    if (body.sourcedById !== undefined) all[idx].sourcedById = body.sourcedById;
    if (body.sourcedByName !== undefined) all[idx].sourcedByName = body.sourcedByName;
    all[idx].updatedAt = new Date().toISOString();
    if (body.status && VALID_STATUSES.has(body.status) && body.status !== prevStatus) {
      histPush({ action: 'status_changed', detail: body.status });
    } else {
      histPush({ action: 'updated' });
    }
    await store.setJSON('all', all);
    appendAudit('shortlist_updated', `Updated shortlist item: ${all[idx].address}`);
    return json({ ok: true, item: all[idx] });
  }

  if (req.method === 'DELETE') {
    const id = new URL(req.url).searchParams.get('id');
    if (!id) return json({ error: 'id required' }, 400);
    const updated = all.filter(i => i.id !== id);
    if (updated.length === all.length) return json({ error: 'Not found' }, 404);
    const deleted = all.find(i => i.id === id);
    await store.setJSON('all', updated);
    if (deleted) appendAudit('shortlist_removed', `Removed from shortlist: ${deleted.address}`);
    return json({ ok: true });
  }

  return new Response('Method Not Allowed', { status: 405 });
};

export const config = { path: '/api/admin/shortlist', method: ['GET', 'POST', 'PUT', 'DELETE'] };
