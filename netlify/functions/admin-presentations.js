import { getStore } from '@netlify/blobs';
import crypto from 'crypto';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

function checkAdmin(req) {
  const auth = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  return auth === process.env.ADMIN_PASSWORD;
}

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

function genToken() { return crypto.randomBytes(20).toString('hex'); }

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
    <p style="font-size:16px;color:rgba(250,246,241,0.6);margin:0 0 32px;line-height:1.65;">I've put together a full analysis on this property. Inside you'll find my assessment, the cashflow numbers, comparable sales, and a risk profile &mdash; everything you need to form a view before we talk.</p>
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
    tokens: {}, views: {}, sentClients: [],
    previewToken: null,
    createdAt: new Date().toISOString(),
    ...fields,
  };
}

async function appendAudit(action, detail) {
  try {
    const store = getStore('fairway-audit-log');
    const entries = (await store.get('entries', { type: 'json' }).catch(() => null)) || [];
    entries.unshift({ ts: new Date().toISOString(), action, detail });
    if (entries.length > 200) entries.length = 200;
    await store.setJSON('entries', entries);
  } catch { /* best-effort — never block the main request */ }
}

export default async (req) => {
  if (!checkAdmin(req)) return json({ error: 'Unauthorized' }, 401);

  const store = getStore('fairway-presentations');
  const presentations = (await store.get('all', { type: 'json' })) || [];

  if (req.method === 'GET') return json(presentations);

  if (req.method === 'POST') {
    const body = await req.json().catch(() => ({}));
    if (!body.address) return json({ error: 'address required' }, 400);
    const tokens = {}, views = {};
    (body.assignedClients || []).forEach(cid => { tokens[cid] = genToken(); views[cid] = { firstViewedAt: null, viewCount: 0 }; });
    const pres = defaultPres({ ...body, tokens, views, sentClients: [], revokedClients: [] });
    presentations.push(pres);
    await store.setJSON('all', presentations);
    appendAudit('presentation_created', `Created presentation "${pres.address}"`);
    return json({ ok: true, id: pres.id, pres }, 201);
  }

  if (req.method === 'PUT') {
    const body = await req.json().catch(() => ({}));
    const { id, action } = body;
    if (!id) return json({ error: 'id required' }, 400);

    // Preview uses HMAC — no Blobs read needed, so no eventual-consistency race
    if (action === 'preview') {
      const sig = crypto.createHmac('sha256', process.env.ADMIN_PASSWORD || 'fp-preview')
                        .update(id).digest('hex').slice(0, 32);
      return json({ ok: true, token: `pv.${id}.${sig}` });
    }

    const idx = presentations.findIndex(p => p.id === id);
    if (idx === -1) return json({ error: 'Not found' }, 404);

    if (action === 'send' || action === 'resend' || action === 'notify') {
      const clientStore = getStore('fairway-clients');
      const allClients = (await clientStore.get('all', { type: 'json' })) || [];
      const pres = presentations[idx];
      let toSend;
      if (action === 'notify') {
        // Send (or resend) to all unrevoked assigned clients
        toSend = pres.assignedClients.filter(cid => !(pres.revokedClients||[]).includes(cid));
      } else if (action === 'resend') {
        const { clientId } = body;
        toSend = clientId ? [clientId] : [];
      } else {
        // First send — only clients who haven't received it yet
        toSend = pres.assignedClients.filter(cid => !pres.sentClients.includes(cid) && !(pres.revokedClients||[]).includes(cid));
      }
      let sent = 0;
      for (const cid of toSend) {
        const client = allClients.find(c => c.id === cid);
        if (!client || !pres.tokens[cid]) continue;
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
      presentations[idx] = pres;
      await store.setJSON('all', presentations);
      if (sent > 0) appendAudit('presentation_sent', `Sent "${pres.address}" to ${sent} client${sent !== 1 ? 's' : ''}`);
      return json({ ok: true, sent });
    }

    // Regular update — merge all known fields
    const pres = presentations[idx];
    const prevRevokedCount = (pres.revokedClients || []).length; // capture before any mutations
    const fields = ['address','suburb','price','bedrooms','bathrooms','carspaces','landSize',
                    'propertyType','propertyDescription','summary','highlights','knownIssues','agentSubmission','images','videos','cashflow',
                    'riskProfile','demographics','customSections',
                    'comparableSales','comparableRentals',
                    'revocationReason','status','expiresAt','revokedClients'];
    fields.forEach(f => { if (body[f] !== undefined) pres[f] = body[f]; });

    if (body.assignedClients !== undefined) {
      const prevAssigned = pres.assignedClients || [];
      const prevRevokedSet = new Set(pres.revokedClients || []);
      const newSelectedSet = new Set(body.assignedClients);

      // Previously active = assigned but not yet revoked
      const prevActive = prevAssigned.filter(cid => !prevRevokedSet.has(cid));

      // Grant: generate token for newly selected; restore if previously revoked
      for (const cid of body.assignedClients) {
        if (!pres.tokens[cid]) {
          pres.tokens[cid] = genToken();
          pres.views[cid] = { firstViewedAt: null, viewCount: 0 };
        }
        pres.revokedClients = (pres.revokedClients || []).filter(id => id !== cid);
      }

      // Revoke: was active, no longer selected → add to revokedClients
      // Keep in assignedClients so the token lookup in property-view.js still finds the
      // presentation and reaches the revoked check (→ 403 "access removed"), not 404.
      for (const cid of prevActive) {
        if (!newSelectedSet.has(cid) && !(pres.revokedClients || []).includes(cid)) {
          pres.revokedClients = [...(pres.revokedClients || []), cid];
        }
      }

      // assignedClients = union of all previously assigned + newly selected
      pres.assignedClients = [...new Set([...prevAssigned, ...body.assignedClients])];
    }

    presentations[idx] = pres;
    await store.setJSON('all', presentations);
    const nowRevokedCount = (pres.revokedClients || []).length;
    if (nowRevokedCount > prevRevokedCount) {
      appendAudit('access_revoked', `Revoked access on "${pres.address}" (${nowRevokedCount} client${nowRevokedCount !== 1 ? 's' : ''} total)`);
    }
    return json({ ok: true, pres });
  }

  if (req.method === 'DELETE') {
    const id = new URL(req.url).searchParams.get('id');
    if (!id) return json({ error: 'id required' }, 400);
    const toDelete = presentations.find(p => p.id === id);
    const updated = presentations.filter(p => p.id !== id);
    if (updated.length === presentations.length) return json({ error: 'Not found' }, 404);
    await store.setJSON('all', updated);
    if (toDelete) appendAudit('presentation_deleted', `Deleted presentation "${toDelete.address}"`);
    return json({ ok: true });
  }

  return new Response('Method Not Allowed', { status: 405 });
};

export const config = { path: '/api/admin/presentations', method: ['GET','POST','PUT','DELETE'] };
