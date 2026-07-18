import { getStore } from '@netlify/blobs';
import crypto from 'crypto';
import { appendAudit } from './_audit.js';

function checkAdmin(req) {
  const auth = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  return auth === process.env.ADMIN_PASSWORD;
}

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });


const EDITABLE_FIELDS = [
  'address', 'suburb', 'state', 'propertyType',
  'purchasePrice', 'purchaseDate', 'settlementDate',
  'currentValue',
  'loanAmount', 'interestRate', 'loanTerm', 'loanType', 'lender',
  'brokerName', 'brokerPhone', 'brokerEmail', 'brokerCompany',
  'pmName', 'pmAgency', 'pmPhone', 'pmEmail',
  'managementFee', 'leaseStartDate', 'weeklyRent',
  'notes',
];

export default async (req) => {
  if (!checkAdmin(req)) return json({ error: 'Unauthorized' }, 401);

  const url = new URL(req.url);
  const clientId = url.searchParams.get('clientId');

  // GET — list all purchases for a client
  if (req.method === 'GET') {
    if (!clientId) return json({ error: 'clientId required' }, 400);
    const store = getStore('fairway-purchases');
    const purchases = (await store.get(clientId, { type: 'json' }).catch(() => null)) || [];
    return json(purchases);
  }

  // POST — create a purchase record
  if (req.method === 'POST') {
    const body = await req.json().catch(() => ({}));
    const { clientId: cid, clientName, ...fields } = body;
    if (!cid) return json({ error: 'clientId required' }, 400);
    if (!fields.address?.trim()) return json({ error: 'address required' }, 400);

    const store = getStore('fairway-purchases');
    const purchases = (await store.get(cid, { type: 'json' }).catch(() => null)) || [];

    const purchase = {
      id: crypto.randomUUID(),
      engagementNumber: fields.engagementNumber || 1,
      address:       fields.address?.trim()       || '',
      suburb:        fields.suburb?.trim()        || '',
      state:         fields.state?.trim()         || '',
      propertyType:  fields.propertyType          || 'house',
      purchasePrice: fields.purchasePrice?.trim() || '',
      purchaseDate:  fields.purchaseDate          || '',
      settlementDate: fields.settlementDate       || '',
      currentValue:  fields.currentValue?.trim()  || '',
      loanAmount:    fields.loanAmount?.trim()    || '',
      interestRate:  fields.interestRate?.trim()  || '',
      loanTerm:      fields.loanTerm?.trim()      || '',
      loanType:      fields.loanType              || 'variable',
      lender:        fields.lender?.trim()        || '',
      brokerName:    fields.brokerName?.trim()    || '',
      brokerPhone:   fields.brokerPhone?.trim()   || '',
      brokerEmail:   fields.brokerEmail?.trim()   || '',
      brokerCompany: fields.brokerCompany?.trim() || '',
      pmName:        fields.pmName?.trim()        || '',
      pmAgency:      fields.pmAgency?.trim()      || '',
      pmPhone:       fields.pmPhone?.trim()       || '',
      pmEmail:       fields.pmEmail?.trim()       || '',
      managementFee: fields.managementFee?.trim() || '',
      leaseStartDate: fields.leaseStartDate       || '',
      weeklyRent:    fields.weeklyRent?.trim()    || '',
      notes:         fields.notes?.trim()         || '',
      createdAt:     new Date().toISOString(),
      updatedAt:     new Date().toISOString(),
    };

    purchases.push(purchase);
    await store.setJSON(cid, purchases);
    appendAudit('purchase_logged', `Logged purchase: ${purchase.address} for client ${clientName || cid}`);
    return json({ ok: true, purchase }, 201);
  }

  // PUT — update a purchase record (admin can edit all fields)
  if (req.method === 'PUT') {
    const body = await req.json().catch(() => ({}));
    const { clientId: cid, id, clientName, ...fields } = body;
    if (!cid || !id) return json({ error: 'clientId and id required' }, 400);

    const store = getStore('fairway-purchases');
    const purchases = (await store.get(cid, { type: 'json' }).catch(() => null)) || [];
    const idx = purchases.findIndex(p => p.id === id);
    if (idx === -1) return json({ error: 'Purchase not found' }, 404);

    EDITABLE_FIELDS.forEach(f => {
      if (fields[f] !== undefined) purchases[idx][f] = typeof fields[f] === 'string' ? fields[f].trim() : fields[f];
    });
    purchases[idx].updatedAt = new Date().toISOString();
    await store.setJSON(cid, purchases);
    appendAudit('purchase_updated', `Updated purchase: ${purchases[idx].address} for client ${clientName || cid}`);
    return json({ ok: true, purchase: purchases[idx] });
  }

  // DELETE — remove a purchase record
  if (req.method === 'DELETE') {
    const cid = url.searchParams.get('clientId');
    const id  = url.searchParams.get('id');
    if (!cid || !id) return json({ error: 'clientId and id required' }, 400);

    const store = getStore('fairway-purchases');
    const purchases = (await store.get(cid, { type: 'json' }).catch(() => null)) || [];
    const updated = purchases.filter(p => p.id !== id);
    if (updated.length === purchases.length) return json({ error: 'Purchase not found' }, 404);
    await store.setJSON(cid, updated);
    appendAudit('purchase_deleted', `Deleted purchase record for client ${cid}`);
    return json({ ok: true });
  }

  return new Response('Method Not Allowed', { status: 405 });
};

export const config = {
  path: '/api/admin/purchases',
  method: ['GET', 'POST', 'PUT', 'DELETE'],
};
