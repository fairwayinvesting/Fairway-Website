import { getStore } from '@netlify/blobs';
import crypto from 'crypto';
import { Resend } from 'resend';
import { getStaffPayload, hasModule } from './_staff-auth.js';

const resend = new Resend(process.env.RESEND_API_KEY);

function buildShortlistPromotedEmail(contractorName, address, suburb) {
  const location = [address, suburb].filter(Boolean).join(', ');
  return `<!DOCTYPE html><html lang="en" style="background:#181614;"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>New draft presentation</title>
<style>@media only screen and (max-width:600px){.ew{padding:32px 22px!important;border-radius:14px!important;}}</style>
</head>
<body style="margin:0;padding:0;background:#181614;font-family:Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#181614"><tr><td align="center" style="padding:40px 16px;">
<table width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;">
  <tr><td class="ew" style="background:#1C1815;border-radius:20px;border:1px solid rgba(181,113,90,0.2);padding:44px 48px;">
    <p style="margin:0 0 36px;padding-bottom:32px;border-bottom:1px solid rgba(250,246,241,0.08);text-align:center;">
      <img src="https://fairwayinvesting.com.au/logo-icon.png" width="28" height="28" alt="" style="display:inline-block;border:0;vertical-align:middle;margin-right:10px;">
      <img src="https://fairwayinvesting.com.au/logo-word.png" width="160" height="24" alt="Fairway Investing" style="display:inline-block;border:0;vertical-align:middle;max-width:160px;">
    </p>
    <p style="font-size:11px;font-weight:600;letter-spacing:0.2em;text-transform:uppercase;color:#B5715A;margin:0 0 16px;">Staff portal</p>
    <h1 style="font-family:Georgia,'Times New Roman',serif;font-size:28px;font-weight:400;color:#FAF6F1;margin:0 0 16px;line-height:1.25;">New draft presentation.</h1>
    <p style="font-size:16px;color:rgba(250,246,241,0.6);margin:0 0 28px;line-height:1.65;">${contractorName} has moved a shortlisted property into presentations and started a draft.</p>
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:rgba(250,246,241,0.04);border:1px solid rgba(250,246,241,0.09);border-radius:12px;margin:0 0 32px;">
      <tr><td style="padding:22px 26px;">
        <p style="font-size:10px;font-weight:600;letter-spacing:0.18em;text-transform:uppercase;color:#B5715A;margin:0 0 10px;">Property</p>
        <p style="font-size:18px;color:#FAF6F1;margin:0 0 6px;line-height:1.3;">${location}</p>
        <p style="font-size:13px;color:rgba(250,246,241,0.4);margin:0;">Added by ${contractorName}</p>
      </td></tr>
    </table>
    <table cellpadding="0" cellspacing="0" border="0"><tr>
      <td style="border-radius:100px;background:#B5715A;">
        <a href="https://fairwayinvesting.com.au/admin/" style="display:inline-block;font-size:15px;font-weight:500;color:#FAF6F1;text-decoration:none;padding:14px 32px;">View in admin portal &rarr;</a>
      </td>
    </tr></table>
  </td></tr>
  <tr><td style="padding:24px 0 0;text-align:center;">
    <p style="font-size:12px;color:rgba(250,246,241,0.25);margin:0;line-height:1.7;">Fairway Investing &middot; <a href="mailto:luke@fairwayinvesting.com.au" style="color:#B5715A;text-decoration:none;">luke@fairwayinvesting.com.au</a></p>
  </td></tr>
</table>
</td></tr></table></body></html>`;
}

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
      cashflow:          body.cashflow          || null,
      riskProfile:       body.riskProfile       || null,
      demographics:      body.demographics      || null,
      comparableSales:   body.comparableSales   || null,
      comparableRentals: body.comparableRentals || null,
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
        ...(si.cashflow          ? { cashflow: si.cashflow }                   : {}),
        ...(si.riskProfile       ? { riskProfile: si.riskProfile }             : {}),
        ...(si.demographics      ? { demographics: si.demographics }           : {}),
        ...(si.comparableSales   ? { comparableSales: si.comparableSales }     : {}),
        ...(si.comparableRentals ? { comparableRentals: si.comparableRentals } : {}),
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
      // Notify Luke — fire and forget
      resend.emails.send({
        from: 'Fairway Portal <info@fairwayinvesting.com.au>',
        to: ['luke@fairwayinvesting.com.au'],
        subject: `New draft presentation — ${si.address || 'new property'} (${payload.name})`,
        html: buildShortlistPromotedEmail(payload.name, si.address || '', si.suburb || ''),
      }).catch(err => console.error('Shortlist promotion email failed:', err?.message));
      return json({ ok: true, item: all[idx], presId: pres.id });
    }

    const assignedClients = payload.assignedClients || [];
    if (body.clientId && !assignedClients.includes(body.clientId)) {
      return json({ error: 'You can only assign properties to your assigned clients' }, 403);
    }

    const fields = ['address','suburb','state','price','propertyType','bedrooms','bathrooms',
                    'carspaces','landSize','agentName','agentAgency','agentPhone','agentEmail',
                    'source','notes','clientId','clientName','links','bankValuation','bankLender',
                    'cashflow','riskProfile','demographics','comparableSales','comparableRentals'];
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
