import { getStore } from '@netlify/blobs';
import crypto from 'crypto';
import { Resend } from 'resend';
import { appendAudit } from './_audit.js';
import { checkAdmin, getAdminActor } from './_admin-auth.js';

const resend = new Resend(process.env.RESEND_API_KEY);

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

function genToken() { return crypto.randomBytes(20).toString('hex'); }

const REVIEW_STATUSES = ['draft','ready_for_review','admin_reviewing','approved','allocated','sent','rejected','killed'];
// Statuses that only admin can set (beyond ready_for_review)
const ADMIN_ONLY_STATUSES = new Set(['admin_reviewing','approved','allocated','sent','rejected','killed']);

const KILL_REASONS = new Set([
  'Poor value','Building/pest issue','Strata issue','Location concern','Rental concern',
  'Vendor expectations too high','Due diligence issue','Property sold','No longer available','Other',
]);

function buildPropertyEmail(clientName, address, suburb, price, propertyType, bedrooms, bathrooms, carspaces, link) {
  const firstName = clientName.split(' ')[0];
  const typeLabels = { house: 'House', unit: 'Unit', townhouse: 'Townhouse', duplex: 'Duplex', land: 'Land' };
  const typeLabel = typeLabels[propertyType] || 'Property';
  const specParts = [typeLabel, bedrooms && `${bedrooms} bed`, bathrooms && `${bathrooms} bath`, carspaces && `${carspaces} car`].filter(Boolean);
  const specLine = specParts.join(' &nbsp;&middot;&nbsp; ');
  return `<!DOCTYPE html><html lang="en" style="background:#181614;"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Property presentation — Fairway</title>
<style>@media only screen and (max-width:600px){.ew{padding:32px 22px!important;border-radius:14px!important;}.eh1{font-size:22px!important;}.eprop{padding:18px 20px 16px!important;}}</style>
</head>
<body style="margin:0;padding:0;background:#181614;font-family:Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#181614"><tr><td align="center" style="padding:40px 16px;">
<table width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;">
  <tr><td class="ew" style="background:#1C1815;border-radius:20px;border:1px solid rgba(181,113,90,0.2);padding:44px 48px;">
    <p style="margin:0 0 36px;padding-bottom:32px;border-bottom:1px solid rgba(250,246,241,0.08);text-align:center;">
      <img src="https://fairwayinvesting.com.au/logo-word.png" width="200" height="30" alt="Fairway Investing" style="display:inline-block;border:0;max-width:200px;">
    </p>
    <p style="font-size:11px;font-weight:600;letter-spacing:0.2em;text-transform:uppercase;color:#B5715A;margin:0 0 16px;">Property presentation</p>
    <h1 class="eh1" style="font-family:Georgia,'Times New Roman',serif;font-size:30px;font-weight:400;color:#FAF6F1;margin:0 0 16px;line-height:1.25;">${firstName}, I've found one I want you to see.</h1>
    <p style="font-size:16px;color:rgba(250,246,241,0.6);margin:0 0 32px;line-height:1.65;">I've put together my analysis on this property for you to review. Take a look when you get a chance &mdash; I'd like to walk you through it before we decide on next steps.</p>
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:rgba(250,246,241,0.05);border:1px solid rgba(250,246,241,0.1);border-radius:14px;margin:0 0 32px;">
      <tr><td class="eprop" style="padding:24px 28px 20px;">
        <p style="font-size:10px;font-weight:600;letter-spacing:0.2em;text-transform:uppercase;color:#B5715A;margin:0 0 12px;">The property</p>
        <p style="font-size:20px;font-weight:400;color:#FAF6F1;margin:0 0 4px;line-height:1.3;">${address}</p>
        ${suburb ? `<p style="font-size:14px;color:rgba(250,246,241,0.4);margin:0 0 14px;">${suburb}</p>` : '<p style="margin:0 0 14px;"></p>'}
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid rgba(250,246,241,0.07);"><tr>
          <td style="padding:14px 0 0;">
            <span style="font-size:13px;color:rgba(250,246,241,0.45);">${specLine}</span>
          </td>
          ${price ? `<td style="padding:14px 0 0;text-align:right;"><span style="font-size:16px;font-weight:500;color:#FAF6F1;">${price}</span></td>` : ''}
        </tr></table>
      </td></tr>
    </table>
    <table cellpadding="0" cellspacing="0" border="0"><tr>
      <td style="border-radius:100px;background:#B5715A;">
        <a href="${link}" style="display:inline-block;font-size:15px;font-weight:500;color:#FAF6F1;text-decoration:none;padding:15px 34px;">View full presentation &rarr;</a>
      </td>
    </tr></table>
    <p style="font-size:13px;color:rgba(250,246,241,0.3);margin:28px 0 0;line-height:1.6;">Happy to walk you through it &mdash; reply to this email or call <a href="tel:0416184333" style="color:rgba(250,246,241,0.45);text-decoration:none;">0416 184 333</a>.</p>
  </td></tr>
  <tr><td style="padding:24px 0 0;text-align:center;">
    <p style="font-size:12px;color:rgba(250,246,241,0.25);margin:0;line-height:1.7;">Fairway Investing &middot; Suite 211, Level 2/5 Alexander Street, Crows Nest NSW 2065<br>
    <a href="mailto:info@fairwayinvesting.com.au" style="color:#B5715A;text-decoration:none;">info@fairwayinvesting.com.au</a> &middot; 0416 184 333</p>
  </td></tr>
</table></td></tr></table></body></html>`;
}

function buildApprovalEmail(contractorName, address, suburb) {
  const firstName = contractorName.split(' ')[0];
  const location = suburb ? `${address}, ${suburb}` : address;
  return `<!DOCTYPE html><html lang="en" style="background:#181614;"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Presentation approved</title>
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
    <h1 style="font-family:Georgia,'Times New Roman',serif;font-size:28px;font-weight:400;color:#FAF6F1;margin:0 0 16px;line-height:1.25;">Good work, ${firstName}.</h1>
    <p style="font-size:16px;color:rgba(250,246,241,0.6);margin:0 0 28px;line-height:1.65;">Your presentation has been reviewed and approved. I'll take it from here — it's ready to be sent to clients.</p>
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:rgba(109,191,123,0.06);border:1px solid rgba(109,191,123,0.2);border-radius:12px;margin:0 0 32px;">
      <tr><td style="padding:22px 26px;">
        <p style="font-size:10px;font-weight:600;letter-spacing:0.18em;text-transform:uppercase;color:#6dbf7b;margin:0 0 10px;">Approved</p>
        <p style="font-size:18px;color:#FAF6F1;margin:0;line-height:1.3;">${location}</p>
      </td></tr>
    </table>
    <table cellpadding="0" cellspacing="0" border="0"><tr>
      <td style="border-radius:100px;background:#B5715A;">
        <a href="https://fairwayinvesting.com.au/staff/portal.html" style="display:inline-block;font-size:15px;font-weight:500;color:#FAF6F1;text-decoration:none;padding:14px 32px;">View in portal &rarr;</a>
      </td>
    </tr></table>
  </td></tr>
  <tr><td style="padding:24px 0 0;text-align:center;">
    <p style="font-size:12px;color:rgba(250,246,241,0.25);margin:0;line-height:1.7;">Fairway Investing &middot; <a href="mailto:luke@fairwayinvesting.com.au" style="color:#B5715A;text-decoration:none;">luke@fairwayinvesting.com.au</a> &middot; 0416 184 333</p>
  </td></tr>
</table>
</td></tr></table></body></html>`;
}

function buildRejectionEmail(contractorName, address, suburb, feedback) {
  const firstName = contractorName.split(' ')[0];
  const location = suburb ? `${address}, ${suburb}` : address;
  const feedbackHtml = feedback
    ? `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:rgba(232,168,124,0.06);border:1px solid rgba(232,168,124,0.2);border-radius:12px;margin:0 0 32px;"><tr><td style="padding:22px 26px;"><p style="font-size:10px;font-weight:600;letter-spacing:0.18em;text-transform:uppercase;color:#e8a87c;margin:0 0 10px;">Feedback</p><p style="font-size:15px;color:rgba(250,246,241,0.75);margin:0;line-height:1.65;white-space:pre-wrap;">${feedback.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</p></td></tr></table>`
    : '';
  return `<!DOCTYPE html><html lang="en" style="background:#181614;"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Revisions needed</title>
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
    <h1 style="font-family:Georgia,'Times New Roman',serif;font-size:28px;font-weight:400;color:#FAF6F1;margin:0 0 16px;line-height:1.25;">${firstName}, a few revisions needed.</h1>
    <p style="font-size:16px;color:rgba(250,246,241,0.6);margin:0 0 28px;line-height:1.65;">I've reviewed your presentation on <strong style="color:rgba(250,246,241,0.85);">${location}</strong> and have some notes. Log in to make the changes and resubmit when you're ready.</p>
    ${feedbackHtml}
    <table cellpadding="0" cellspacing="0" border="0"><tr>
      <td style="border-radius:100px;background:#B5715A;">
        <a href="https://fairwayinvesting.com.au/staff/portal.html" style="display:inline-block;font-size:15px;font-weight:500;color:#FAF6F1;text-decoration:none;padding:14px 32px;">Edit &amp; resubmit &rarr;</a>
      </td>
    </tr></table>
    <p style="font-size:13px;color:rgba(250,246,241,0.35);margin:20px 0 0;line-height:1.6;">Any questions — reply to this email or call <a href="tel:0416184333" style="color:rgba(250,246,241,0.4);text-decoration:none;">0416 184 333</a>.</p>
  </td></tr>
  <tr><td style="padding:24px 0 0;text-align:center;">
    <p style="font-size:12px;color:rgba(250,246,241,0.25);margin:0;line-height:1.7;">Fairway Investing &middot; <a href="mailto:luke@fairwayinvesting.com.au" style="color:#B5715A;text-decoration:none;">luke@fairwayinvesting.com.au</a> &middot; 0416 184 333</p>
  </td></tr>
</table>
</td></tr></table></body></html>`;
}

function buildKillEmail(contractorName, address, suburb, reason) {
  const firstName = contractorName.split(' ')[0];
  const location = suburb ? `${address}, ${suburb}` : address;
  return `<!DOCTYPE html><html lang="en" style="background:#181614;"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Property removed from pipeline</title>
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
    <h1 style="font-family:Georgia,'Times New Roman',serif;font-size:28px;font-weight:400;color:#FAF6F1;margin:0 0 16px;line-height:1.25;">Property removed from the pipeline.</h1>
    <p style="font-size:16px;color:rgba(250,246,241,0.6);margin:0 0 28px;line-height:1.65;">Hi ${firstName}, the following property has been removed. No further action is needed from you.</p>
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:rgba(250,246,241,0.03);border:1px solid rgba(250,246,241,0.08);border-radius:12px;margin:0 0 28px;">
      <tr><td style="padding:22px 26px;">
        <p style="font-size:18px;color:rgba(250,246,241,0.6);margin:0 0 14px;line-height:1.3;">${location}</p>
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid rgba(250,246,241,0.07);"><tr><td style="padding:14px 0 0;">
          <span style="font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:rgba(250,246,241,0.3);">Reason</span>
          <span style="font-size:13px;color:rgba(250,246,241,0.5);margin-left:12px;">${reason.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</span>
        </td></tr></table>
      </td></tr>
    </table>
    <p style="font-size:13px;color:rgba(250,246,241,0.35);margin:0;line-height:1.6;">Questions? Reply to this email or call <a href="tel:0416184333" style="color:rgba(250,246,241,0.4);text-decoration:none;">0416 184 333</a>.</p>
  </td></tr>
  <tr><td style="padding:24px 0 0;text-align:center;">
    <p style="font-size:12px;color:rgba(250,246,241,0.25);margin:0;line-height:1.7;">Fairway Investing &middot; <a href="mailto:luke@fairwayinvesting.com.au" style="color:#B5715A;text-decoration:none;">luke@fairwayinvesting.com.au</a> &middot; 0416 184 333</p>
  </td></tr>
</table>
</td></tr></table></body></html>`;
}

async function getContractorDetails(sourcedById) {
  try {
    const staffStore = getStore({ name: 'fairway-staff', consistency: 'strong' });
    const staffAll = (await staffStore.get('all', { type: 'json' }).catch(() => null)) || [];
    const user = staffAll.find(u => u.id === sourcedById && !u.deletedAt);
    return user ? { email: user.email, name: user.name } : null;
  } catch { return null; }
}

function defaultPres(fields) {
  return {
    id: crypto.randomUUID(),
    address: '', suburb: '', price: '',
    bedrooms: '', bathrooms: '', carspaces: '', landSize: '',
    propertyType: 'house',
    source: 'manual',
    agentSubmission: null,
    propertyDescription: '',
    summary: '', highlights: [],
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
    assignedClients: [],
    revokedClients: [],
    tokens: {}, sentClients: [],
    clientAcquisitions: {},
    previewToken: null,
    // Sourcing attribution
    shortlistId: null,
    sourcedById: 'admin',
    sourcedByName: 'Luke',
    sourcedByRole: 'admin',
    // Review workflow
    reviewStatus: 'draft',
    reviewStatusUpdatedAt: new Date().toISOString(),
    // Contractor nominations
    suitableClients: [],
    history: [],
    createdAt: new Date().toISOString(),
    ...fields,
  };
}

const pvStore = () => getStore({ name: 'fairway-presentation-views', consistency: 'strong' });

async function getViews(presId) {
  return (await pvStore().get(presId, { type: 'json' }).catch(() => null)) || {};
}

async function setViews(presId, views) {
  await pvStore().setJSON(presId, views);
}

async function migrateViewsIfNeeded(presentations, presStore) {
  const done = await pvStore().get('_migrated', { type: 'json' }).catch(() => null);
  if (done) return;
  const writes = [];
  let changed = false;
  for (const p of presentations) {
    if (p.views && Object.keys(p.views).length > 0) {
      writes.push(pvStore().setJSON(p.id, p.views));
      changed = true;
    }
    delete p.views;
  }
  await Promise.all([
    ...writes,
    changed ? presStore.setJSON('all', presentations) : Promise.resolve(),
    pvStore().setJSON('_migrated', { at: new Date().toISOString() }),
  ]);
}

export default async (req) => {
  if (!(await checkAdmin(req))) return json({ error: 'Unauthorized' }, 401);

  const store = getStore({ name: 'fairway-presentations', consistency: 'strong' });
  const presentations = (await store.get('all', { type: 'json' }).catch(() => null)) || [];

  await migrateViewsIfNeeded(presentations, store);

  if (req.method === 'GET') {
    const { searchParams } = new URL(req.url);
    const filterReviewStatus = searchParams.get('reviewStatus') || '';
    const viewResults = await Promise.all(presentations.map(p => getViews(p.id)));
    let result = presentations.map((p, i) => ({ ...p, views: viewResults[i] }));
    if (filterReviewStatus) result = result.filter(p => p.reviewStatus === filterReviewStatus);
    return json(result);
  }

  if (req.method === 'POST') {
    const body = await req.json().catch(() => ({}));
    if (!body.address) return json({ error: 'address required' }, 400);
    const postActor = await getAdminActor(req);
    const postActorName = postActor === 'secondary' ? 'Admin (secondary)' : 'Luke';
    const tokens = {};
    const initViews = {};
    (body.assignedClients || []).forEach(cid => {
      tokens[cid] = genToken();
      initViews[cid] = { firstViewedAt: null, viewCount: 0 };
    });
    const pres = defaultPres({ ...body, tokens, sentClients: [], revokedClients: [] });
    pres.history = [{ at: pres.createdAt, by: postActorName, byId: 'admin', byRole: 'admin', action: 'created' }];
    presentations.push(pres);
    await Promise.all([
      store.setJSON('all', presentations),
      Object.keys(initViews).length > 0 ? setViews(pres.id, initViews) : Promise.resolve(),
    ]);
    appendAudit('presentation_created', `Created presentation "${pres.address}"`);
    return json({ ok: true, id: pres.id, pres: { ...pres, views: initViews } }, 201);
  }

  if (req.method === 'PUT') {
    const body = await req.json().catch(() => ({}));
    const { id, action } = body;
    if (!id) return json({ error: 'id required' }, 400);

    const putActor = await getAdminActor(req);
    const putActorName = putActor === 'secondary' ? 'Admin (secondary)' : 'Luke';
    const histPush = (idx, entry) => {
      if (!Array.isArray(presentations[idx].history)) presentations[idx].history = [];
      presentations[idx].history.push({ at: new Date().toISOString(), by: putActorName, byId: 'admin', byRole: 'admin', ...entry });
    };

    if (action === 'preview') {
      const sig = crypto.createHmac('sha256', process.env.ADMIN_PASSWORD || 'fp-preview')
                        .update(id).digest('hex').slice(0, 32);
      return json({ ok: true, token: `pv.${id}.${sig}` });
    }

    const idx = presentations.findIndex(p => p.id === id);
    if (idx === -1) return json({ error: 'Not found' }, 404);

    // Admin-only: advance review status
    if (action === 'set-review-status') {
      const { reviewStatus } = body;
      if (!REVIEW_STATUSES.includes(reviewStatus)) return json({ error: 'Invalid review status' }, 400);
      presentations[idx].reviewStatus = reviewStatus;
      presentations[idx].reviewStatusUpdatedAt = new Date().toISOString();
      if (reviewStatus !== 'rejected') presentations[idx].reviewFeedback = null;
      histPush(idx, { action: 'review_status_changed', detail: reviewStatus });
      await store.setJSON('all', presentations);
      appendAudit('review_status_changed', `"${presentations[idx].address}" → ${reviewStatus}`);
      // Email contractor on approval
      if (reviewStatus === 'approved' && presentations[idx].sourcedByRole === 'contractor') {
        const contractor = await getContractorDetails(presentations[idx].sourcedById);
        if (contractor?.email) {
          resend.emails.send({
            from: 'Luke at Fairway <info@fairwayinvesting.com.au>',
            to: [contractor.email],
            reply_to: 'luke@fairwayinvesting.com.au',
            subject: `Approved — ${presentations[idx].address}`,
            html: buildApprovalEmail(contractor.name, presentations[idx].address, presentations[idx].suburb || ''),
          }).catch(err => console.error('Approval email failed:', err?.message));
        }
      }
      return json({ ok: true, pres: presentations[idx] });
    }

    // Admin-only: reject with feedback
    if (action === 'reject') {
      presentations[idx].reviewStatus = 'rejected';
      presentations[idx].reviewStatusUpdatedAt = new Date().toISOString();
      presentations[idx].reviewFeedback = body.feedback || '';
      histPush(idx, { action: 'rejected', detail: body.feedback || '' });
      await store.setJSON('all', presentations);
      appendAudit('review_status_changed', `"${presentations[idx].address}" → rejected`);
      // Email contractor with feedback
      if (presentations[idx].sourcedByRole === 'contractor') {
        const contractor = await getContractorDetails(presentations[idx].sourcedById);
        if (contractor?.email) {
          resend.emails.send({
            from: 'Luke at Fairway <info@fairwayinvesting.com.au>',
            to: [contractor.email],
            reply_to: 'luke@fairwayinvesting.com.au',
            subject: `Revisions needed — ${presentations[idx].address}`,
            html: buildRejectionEmail(contractor.name, presentations[idx].address, presentations[idx].suburb || '', body.feedback || ''),
          }).catch(err => console.error('Rejection email failed:', err?.message));
        }
      }
      return json({ ok: true, pres: presentations[idx] });
    }

    // Admin-only: grant or revoke contractor edit access after sent
    if (action === 'set-contractor-edit-override') {
      presentations[idx].contractorEditOverride = !!body.enabled;
      histPush(idx, { action: 'contractor_edit_override', detail: body.enabled ? 'granted' : 'revoked' });
      await store.setJSON('all', presentations);
      appendAudit('contractor_edit_override', `"${presentations[idx].address}" contractor edit ${body.enabled ? 'granted' : 'revoked'}`);
      return json({ ok: true });
    }

    // Admin-only: kill property with reason
    if (action === 'kill') {
      const reason = body.reason?.trim();
      if (!reason || !KILL_REASONS.has(reason)) return json({ error: 'Valid kill reason required' }, 400);
      presentations[idx].reviewStatus = 'killed';
      presentations[idx].reviewStatusUpdatedAt = new Date().toISOString();
      presentations[idx].killedReason = reason;
      presentations[idx].killedAt = new Date().toISOString();
      histPush(idx, { action: 'killed', detail: reason });
      await store.setJSON('all', presentations);
      appendAudit('presentation_killed', `"${presentations[idx].address}" killed — ${reason}`);
      // Email contractor about removal
      if (presentations[idx].sourcedByRole === 'contractor') {
        const contractor = await getContractorDetails(presentations[idx].sourcedById);
        if (contractor?.email) {
          resend.emails.send({
            from: 'Luke at Fairway <info@fairwayinvesting.com.au>',
            to: [contractor.email],
            reply_to: 'luke@fairwayinvesting.com.au',
            subject: `Property removed — ${presentations[idx].address}`,
            html: buildKillEmail(contractor.name, presentations[idx].address, presentations[idx].suburb || '', reason),
          }).catch(err => console.error('Kill email failed:', err?.message));
        }
      }
      return json({ ok: true, pres: presentations[idx] });
    }

    // Admin-only: update suitable clients list (admin can also edit)
    if (action === 'set-suitable-clients') {
      presentations[idx].suitableClients = Array.isArray(body.suitableClients) ? body.suitableClients : [];
      await store.setJSON('all', presentations);
      return json({ ok: true });
    }

    // Admin-only: mark contractor commission as paid / unpaid
    if (action === 'mark-commission-paid') {
      presentations[idx].contractorCommissionPaidAt = body.paidAt || new Date().toISOString();
      await store.setJSON('all', presentations);
      appendAudit('commission_paid', `Marked commission paid on "${presentations[idx].address}"`);
      return json({ ok: true, paidAt: presentations[idx].contractorCommissionPaidAt });
    }

    if (action === 'mark-commission-unpaid') {
      presentations[idx].contractorCommissionPaidAt = null;
      await store.setJSON('all', presentations);
      return json({ ok: true });
    }

    // Admin-only: set contractor commission on a deal
    if (action === 'set-commission') {
      const amount = body.contractorCommission !== undefined ? Number(body.contractorCommission) || null : undefined;
      if (amount !== undefined) presentations[idx].contractorCommission = amount;
      if (body.contractorCommissionNote !== undefined) presentations[idx].contractorCommissionNote = body.contractorCommissionNote?.trim() || '';
      await store.setJSON('all', presentations);
      appendAudit('commission_set', `Set commission on "${presentations[idx].address}"`);
      return json({ ok: true });
    }

    // Admin-only: update attribution (corrections)
    if (action === 'set-attribution') {
      if (body.sourcedById !== undefined) presentations[idx].sourcedById = body.sourcedById;
      if (body.sourcedByName !== undefined) presentations[idx].sourcedByName = body.sourcedByName;
      if (body.sourcedByRole !== undefined) presentations[idx].sourcedByRole = body.sourcedByRole;
      await store.setJSON('all', presentations);
      appendAudit('attribution_updated', `Updated attribution on "${presentations[idx].address}"`);
      return json({ ok: true });
    }

    if (action === 'send' || action === 'resend' || action === 'notify') {
      const clientStore = getStore('fairway-clients');
      const allClients = (await clientStore.get('all', { type: 'json' })) || [];
      const pres = presentations[idx];
      pres.tokens = pres.tokens || {};
      pres.sentClients = pres.sentClients || [];
      pres.assignedClients = pres.assignedClients || [];
      pres.revokedClients = pres.revokedClients || [];
      let toSend;
      if (action === 'notify') {
        toSend = pres.assignedClients.filter(cid => !pres.revokedClients.includes(cid));
      } else if (action === 'resend') {
        const { clientId } = body;
        toSend = clientId ? [clientId] : [];
      } else {
        if (Array.isArray(body.targetClients) && body.targetClients.length) {
          toSend = body.targetClients.filter(cid => !pres.revokedClients.includes(cid));
          for (const cid of toSend) {
            if (!pres.assignedClients.includes(cid)) pres.assignedClients.push(cid);
          }
        } else {
          toSend = pres.assignedClients.filter(cid => !pres.sentClients.includes(cid) && !pres.revokedClients.includes(cid));
        }
      }
      let tokensDirty = false;
      let sent = 0;
      for (const cid of toSend) {
        const client = allClients.find(c => c.id === cid);
        if (!client) continue;
        if (!pres.tokens[cid]) { pres.tokens[cid] = genToken(); tokensDirty = true; }
        const link = `https://fairwayinvesting.com.au/p/property.html?t=${pres.tokens[cid]}`;
        try {
          await resend.emails.send({
            from: 'Luke at Fairway <info@fairwayinvesting.com.au>',
            to: [client.email],
            reply_to: 'luke@fairwayinvesting.com.au',
            subject: `Property opportunity — ${pres.address}`,
            html: buildPropertyEmail(client.name, pres.address, pres.suburb, pres.price, pres.propertyType, pres.bedrooms, pres.bathrooms, pres.carspaces, link),
          });
          if (!pres.sentClients.includes(cid)) pres.sentClients.push(cid);
          sent++;
        } catch (err) { console.error('Send failed:', err?.message || err); }
      }
      // When a presentation is sent, advance reviewStatus to 'sent'
      if (sent > 0 && presentations[idx].reviewStatus !== 'sent') {
        presentations[idx].reviewStatus = 'sent';
        presentations[idx].reviewStatusUpdatedAt = new Date().toISOString();
      }
      if (sent > 0) histPush(idx, { action: 'sent', detail: `${sent} client${sent !== 1 ? 's' : ''}` });
      presentations[idx] = pres;
      if (tokensDirty || sent > 0) await store.setJSON('all', presentations);
      if (sent > 0) appendAudit('presentation_sent', `Sent "${pres.address}" to ${sent} client${sent !== 1 ? 's' : ''}`);
      return json({ ok: true, sent, sentClients: pres.sentClients });
    }

    // Regular update
    const pres = presentations[idx];
    const prevRevokedCount = (pres.revokedClients || []).length;
    const fields = ['address','suburb','price','bedrooms','bathrooms','carspaces','landSize',
                    'propertyType','propertyDescription','summary','highlights','knownIssues','agentSubmission','images','videos','cashflow',
                    'riskProfile','demographics','customSections',
                    'comparableSales','comparableRentals',
                    'revocationReason','status','expiresAt','revokedClients','clientAcquisitions'];
    fields.forEach(f => { if (body[f] !== undefined) pres[f] = body[f]; });

    let viewsUpdated = false;
    let presViews = null;
    if (body.assignedClients !== undefined) {
      const prevAssigned = pres.assignedClients || [];
      const prevRevokedSet = new Set(pres.revokedClients || []);
      const newSelectedSet = new Set(body.assignedClients);
      const prevActive = prevAssigned.filter(cid => !prevRevokedSet.has(cid));
      presViews = await getViews(pres.id);
      pres.tokens = pres.tokens || {};
      for (const cid of body.assignedClients) {
        if (!pres.tokens[cid]) {
          pres.tokens[cid] = genToken();
          presViews[cid] = { firstViewedAt: null, viewCount: 0 };
          viewsUpdated = true;
        }
        pres.revokedClients = (pres.revokedClients || []).filter(rid => rid !== cid);
      }
      for (const cid of prevActive) {
        if (!newSelectedSet.has(cid) && !(pres.revokedClients || []).includes(cid)) {
          pres.revokedClients = [...(pres.revokedClients || []), cid];
        }
      }
      pres.assignedClients = [...new Set([...prevAssigned, ...body.assignedClients])];
      // When a client is assigned, mark as allocated if not yet sent
      if (body.assignedClients.length > 0 && !['allocated','sent'].includes(pres.reviewStatus)) {
        pres.reviewStatus = 'allocated';
        pres.reviewStatusUpdatedAt = new Date().toISOString();
      }
    }

    if (!Array.isArray(pres.history)) pres.history = [];
    if (body.assignedClients !== undefined) {
      pres.history.push({ at: new Date().toISOString(), by: putActorName, byId: 'admin', byRole: 'admin', action: 'clients_assigned' });
    } else {
      pres.history.push({ at: new Date().toISOString(), by: putActorName, byId: 'admin', byRole: 'admin', action: 'updated' });
    }
    presentations[idx] = pres;
    await Promise.all([
      store.setJSON('all', presentations),
      viewsUpdated && presViews ? setViews(pres.id, presViews) : Promise.resolve(),
    ]);
    const nowRevokedCount = (pres.revokedClients || []).length;
    if (nowRevokedCount > prevRevokedCount) {
      appendAudit('access_revoked', `Revoked access on "${pres.address}" (${nowRevokedCount} client${nowRevokedCount !== 1 ? 's' : ''} total)`);
    }
    const currentViews = presViews || await getViews(pres.id);
    return json({ ok: true, pres: { ...pres, views: currentViews } });
  }

  if (req.method === 'DELETE') {
    const id = new URL(req.url).searchParams.get('id');
    if (!id) return json({ error: 'id required' }, 400);
    const toDelete = presentations.find(p => p.id === id);
    const updated = presentations.filter(p => p.id !== id);
    if (updated.length === presentations.length) return json({ error: 'Not found' }, 404);

    // Move to bin before removing
    const binStore = getStore({ name: 'fairway-bin', consistency: 'strong' });
    const binAll = (await binStore.get('all', { type: 'json' }).catch(() => null)) || [];
    if (toDelete) {
      binAll.push({
        id: crypto.randomUUID(),
        type: 'presentation',
        label: toDelete.address || 'Presentation',
        data: toDelete,
        deletedAt: new Date().toISOString(),
        deletedByName: 'Admin',
      });
      await binStore.setJSON('all', binAll);
    }

    await Promise.all([
      store.setJSON('all', updated),
      pvStore().delete(id).catch(() => {}),
    ]);
    if (toDelete) appendAudit('presentation_deleted', `Deleted presentation "${toDelete.address}"`);
    return json({ ok: true });
  }

  return new Response('Method Not Allowed', { status: 405 });
};

export const config = { path: '/api/admin/presentations', method: ['GET','POST','PUT','DELETE'] };
