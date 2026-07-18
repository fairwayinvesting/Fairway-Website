import { getStore } from '@netlify/blobs';
import { Resend } from 'resend';
import { appendAudit } from './_audit.js';
import { checkAdmin } from './_admin-auth.js';

const resend = new Resend(process.env.RESEND_API_KEY);

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

function entityDisplay(q) {
  if (!q) return { type: 'Individual', name: '' };
  const type = q.entityType || 'Individual';
  const name = type === 'Company' ? q.companyName
    : type === 'Trust' ? q.trustName
    : type === 'SMSF' ? q.smsfName
    : '';
  return { type, name };
}

function qKey(email) {
  return email.toLowerCase().replace(/[^a-z0-9]/g, '-');
}


function buildBriefEmail(name) {
  const firstName = name.split(' ')[0];
  const portalLink = 'https://fairwayinvesting.com.au/clients/brief.html';
  return `<!DOCTYPE html><html lang="en" style="background:#181614;"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Your Buying Brief is ready — Fairway</title>
<style>@media only screen and (max-width:600px){.ew{padding:32px 22px!important;border-radius:14px!important;}.eh1{font-size:26px!important;}}</style>
</head>
<body style="margin:0;padding:0;background:#181614;font-family:Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#181614"><tr><td align="center" style="padding:40px 16px;background:#181614;">
<table width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;">
  <tr><td class="ew" style="background:#1C1815;border-radius:20px;border:1px solid rgba(181,113,90,0.2);padding:44px 48px;">
    <p style="margin:0 0 36px;padding-bottom:32px;border-bottom:1px solid rgba(250,246,241,0.08);text-align:center;">
      <img src="https://fairwayinvesting.com.au/logo-icon.png" width="28" height="28" alt="" style="display:inline-block;border:0;vertical-align:middle;margin-right:10px;">
      <img src="https://fairwayinvesting.com.au/logo-word.png" width="160" height="24" alt="Fairway Investing" style="display:inline-block;border:0;vertical-align:middle;max-width:160px;">
    </p>
    <p style="font-size:11px;font-weight:600;letter-spacing:0.2em;text-transform:uppercase;color:#B5715A;margin:0 0 16px;">Buying Brief</p>
    <h1 class="eh1" style="font-family:Georgia,'Times New Roman',serif;font-size:36px;font-weight:400;color:#FAF6F1;margin:0 0 12px;line-height:1.15;">Your brief is ready, ${firstName}.</h1>
    <p style="font-size:16px;color:rgba(250,246,241,0.6);margin:0 0 32px;line-height:1.65;">I've published your Buying Brief to your portal. It outlines your acquisition strategy, target markets, property criteria, and the key parameters we'll be working to. Log in to review it and let me know if anything needs adjusting.</p>
    <table cellpadding="0" cellspacing="0" border="0"><tr>
      <td style="border-radius:100px;background:#B5715A;">
        <a href="${portalLink}" style="display:inline-block;font-size:15px;font-weight:500;color:#FAF6F1;text-decoration:none;padding:15px 34px;">View your brief &rarr;</a>
      </td>
    </tr></table>
    <p style="font-size:13px;color:rgba(250,246,241,0.3);margin:28px 0 0;line-height:1.6;">Any questions, reply to this email or call 0416 184 333.</p>
  </td></tr>
  <tr><td style="padding:24px 0 0;text-align:center;">
    <p style="font-size:12px;color:rgba(250,246,241,0.25);margin:0;line-height:1.7;">Fairway Investing &middot; Suite 211, Level 2/5 Alexander Street, Crows Nest NSW 2065<br>
    <a href="mailto:info@fairwayinvesting.com.au" style="color:#B5715A;text-decoration:none;">info@fairwayinvesting.com.au</a> &middot; 0416 184 333</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}

export default async (req) => {
  if (!checkAdmin(req)) return json({ error: 'Unauthorized' }, 401);

  const briefStore = getStore('fairway-briefs');
  const clientStore = getStore('fairway-clients');
  const qStore = getStore('fairway-questionnaires');

  if (req.method === 'GET') {
    const clientId = new URL(req.url).searchParams.get('clientId');
    if (!clientId) return json({ error: 'clientId required' }, 400);

    const allClients = (await clientStore.get('all', { type: 'json' }).catch(() => null)) || [];
    const client = allClients.find(c => c.id === clientId);
    if (!client) return json({ error: 'Client not found' }, 404);

    const [brief, questionnaire] = await Promise.all([
      briefStore.get(clientId, { type: 'json' }).catch(() => null),
      qStore.get(qKey(client.email), { type: 'json' }).catch(() => null),
    ]);

    return json({ brief, questionnaire, client: { id: client.id, name: client.name, email: client.email } });
  }

  if (req.method === 'POST') {
    const body = await req.json().catch(() => ({}));
    const { clientId, action, strategyNotes, targetMarkets, customMarkets, budgetMin, budgetMax,
            propertyTypes, propertyCriteria, customCriteria, excludedCharacteristics, customExclusions, status } = body;
    if (!clientId) return json({ error: 'clientId required' }, 400);

    const allClients = (await clientStore.get('all', { type: 'json' }).catch(() => null)) || [];
    const client = allClients.find(c => c.id === clientId);
    if (!client) return json({ error: 'Client not found' }, 404);

    // ── Notify action ─────────────────────────────────────────────────────────
    if (action === 'notify') {
      try {
        await resend.emails.send({
          from: 'Luke at Fairway <info@fairwayinvesting.com.au>',
          to: [client.email],
          reply_to: 'luke@fairwayinvesting.com.au',
          subject: 'Your Buying Brief is ready — Fairway',
          html: buildBriefEmail(client.name),
        });
      } catch (err) {
        console.error('Brief email failed:', err?.message || err);
        return json({ error: 'Email failed to send' }, 500);
      }
      await appendAudit('brief_notified', `Sent buying brief to ${client.name} <${client.email}>`);
      return json({ ok: true });
    }

    // ── Save / publish ────────────────────────────────────────────────────────
    const q = await qStore.get(qKey(client.email), { type: 'json' }).catch(() => null);
    const entity = entityDisplay(q);

    const existing = await briefStore.get(clientId, { type: 'json' }).catch(() => null);
    const now = new Date().toISOString();
    const newStatus = status || existing?.status || 'draft';

    const brief = {
      ...(existing || {}),
      clientId,
      clientName: client.name,
      strategyNotes: strategyNotes ?? existing?.strategyNotes ?? '',
      targetMarkets: targetMarkets ?? existing?.targetMarkets ?? [],
      customMarkets: customMarkets ?? existing?.customMarkets ?? [],
      budgetMin: budgetMin ?? existing?.budgetMin ?? '',
      budgetMax: budgetMax ?? existing?.budgetMax ?? '',
      propertyTypes: propertyTypes ?? existing?.propertyTypes ?? [],
      propertyCriteria: propertyCriteria ?? existing?.propertyCriteria ?? [],
      customCriteria: customCriteria ?? existing?.customCriteria ?? [],
      excludedCharacteristics: excludedCharacteristics ?? existing?.excludedCharacteristics ?? [],
      customExclusions: customExclusions ?? existing?.customExclusions ?? [],
      // Derived from questionnaire — auto-bundled
      entityType: entity.type,
      entityName: entity.name,
      timeline: q?.timeframe ?? '',
      fundingMethod: q?.fundingMethod ?? '',
      coInvestor: q?.coInvestor ?? 'No',
      p2Name: q?.coInvestor === 'Yes' ? `${q.p2FirstName || ''} ${q.p2LastName || ''}`.trim() : '',
      status: newStatus,
      updatedAt: now,
      createdAt: existing?.createdAt || now,
      publishedAt: newStatus === 'published' && !existing?.publishedAt ? now : (existing?.publishedAt ?? null),
    };

    await briefStore.setJSON(clientId, brief);

    if (newStatus === 'published' && existing?.status !== 'published') {
      await appendAudit('brief_published', `Published buying brief for ${client.name} <${client.email}>`);
    } else if (newStatus === 'draft') {
      await appendAudit('brief_draft_saved', `Saved draft brief for ${client.name} <${client.email}>`);
    } else if (newStatus === 'published') {
      await appendAudit('brief_published', `Updated published brief for ${client.name} <${client.email}>`);
    }

    return json({ ok: true, brief });
  }

  return new Response('Method Not Allowed', { status: 405 });
};

export const config = { path: '/api/admin/brief', method: ['GET', 'POST'] };
