import { getStore } from '@netlify/blobs';
import crypto from 'crypto';
import { Resend } from 'resend';
import { getStaffPayload, hasModule } from './_staff-auth.js';

const resend = new Resend(process.env.RESEND_API_KEY);

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

function buildSubmissionAlertEmail(contractorName, address, suburb) {
  const location = [address, suburb].filter(Boolean).join(', ');
  return `<!DOCTYPE html><html lang="en" style="background:#181614;"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Presentation submitted for review</title>
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
    <h1 style="font-family:Georgia,'Times New Roman',serif;font-size:28px;font-weight:400;color:#FAF6F1;margin:0 0 16px;line-height:1.25;">Presentation ready for review.</h1>
    <p style="font-size:16px;color:rgba(250,246,241,0.6);margin:0 0 28px;line-height:1.65;">${contractorName} has submitted a presentation for your review.</p>
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:rgba(250,246,241,0.04);border:1px solid rgba(250,246,241,0.09);border-radius:12px;margin:0 0 32px;">
      <tr><td style="padding:22px 26px;">
        <p style="font-size:10px;font-weight:600;letter-spacing:0.18em;text-transform:uppercase;color:#B5715A;margin:0 0 10px;">Property</p>
        <p style="font-size:18px;color:#FAF6F1;margin:0 0 6px;line-height:1.3;">${location}</p>
        <p style="font-size:13px;color:rgba(250,246,241,0.4);margin:0;">Submitted by ${contractorName}</p>
      </td></tr>
    </table>
    <table cellpadding="0" cellspacing="0" border="0"><tr>
      <td style="border-radius:100px;background:#B5715A;">
        <a href="https://fairwayinvesting.com.au/admin/" style="display:inline-block;font-size:15px;font-weight:500;color:#FAF6F1;text-decoration:none;padding:14px 32px;">Review in admin portal &rarr;</a>
      </td>
    </tr></table>
  </td></tr>
  <tr><td style="padding:24px 0 0;text-align:center;">
    <p style="font-size:12px;color:rgba(250,246,241,0.25);margin:0;line-height:1.7;">Fairway Investing &middot; <a href="mailto:luke@fairwayinvesting.com.au" style="color:#B5715A;text-decoration:none;">luke@fairwayinvesting.com.au</a></p>
  </td></tr>
</table>
</td></tr></table></body></html>`;
}

// Fields a contractor is allowed to set/update
const EDITABLE_FIELDS = [
  'address','suburb','price','propertyType','bedrooms','bathrooms','carspaces','landSize',
  'propertyDescription','summary','highlights','knownIssues','notes',
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
      history: [{ at: now, by: payload.name, byId: payload.userId, byRole: 'contractor', action: 'created' }],
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
      if (!Array.isArray(all[idx].history)) all[idx].history = [];
      all[idx].history.push({ at: new Date().toISOString(), by: payload.name, byId: payload.userId, byRole: 'contractor', action: 'submitted_for_review' });
      await store.setJSON('all', all);
      // Notify Luke — fire and forget
      resend.emails.send({
        from: 'Fairway Portal <info@fairwayinvesting.com.au>',
        to: ['luke@fairwayinvesting.com.au'],
        subject: `Review needed — ${all[idx].address || 'new presentation'} (${payload.name})`,
        html: buildSubmissionAlertEmail(payload.name, all[idx].address || '', all[idx].suburb || ''),
      }).catch(err => console.error('Submission alert email failed:', err?.message));
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

    // Field edits — blocked only once sent to client (unless admin grants override)
    const editableStatuses = new Set(['draft', 'ready_for_review', 'admin_reviewing', 'rejected', 'approved', 'allocated']);
    const canEditSent = rs === 'sent' && all[idx].contractorEditOverride === true;
    if (!editableStatuses.has(rs) && !canEditSent) {
      return json({ error: 'This presentation has been sent to the client — editing is locked.' }, 403);
    }

    EDITABLE_FIELDS.forEach(f => { if (body[f] !== undefined) all[idx][f] = body[f]; });
    all[idx].updatedAt = new Date().toISOString();
    if (!Array.isArray(all[idx].history)) all[idx].history = [];
    all[idx].history.push({ at: new Date().toISOString(), by: payload.name, byId: payload.userId, byRole: 'contractor', action: 'updated' });
    await store.setJSON('all', all);
    return json({ ok: true, pres: all[idx] });
  }

  return new Response('Method Not Allowed', { status: 405 });
};

export const config = { path: '/api/staff/presentations', method: ['GET', 'POST', 'PUT'] };
