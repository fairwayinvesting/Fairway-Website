import { getStore } from '@netlify/blobs';
import crypto from 'crypto';
import { Resend } from 'resend';
import { appendAudit } from './_audit.js';
import { checkAdmin } from './_admin-auth.js';

const resend = new Resend(process.env.RESEND_API_KEY);

function buildWelcomeEmail(name, email, setupToken) {
  const firstName = name.split(' ')[0];
  const setupLink = `https://fairwayinvesting.com.au/clients/setup.html?token=${setupToken}`;
  return `<!DOCTYPE html><html lang="en" style="background:#181614;"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Welcome to Fairway</title>
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
    <p style="font-size:11px;font-weight:600;letter-spacing:0.2em;text-transform:uppercase;color:#B5715A;margin:0 0 16px;">Client portal</p>
    <h1 class="eh1" style="font-family:Georgia,'Times New Roman',serif;font-size:36px;font-weight:400;color:#FAF6F1;margin:0 0 12px;line-height:1.15;">Welcome, ${firstName}.</h1>
    <p style="font-size:16px;color:rgba(250,246,241,0.6);margin:0 0 32px;line-height:1.65;">Your Fairway client portal is ready. Start by setting your password, then complete your onboarding questionnaire so we can build your client brief and get started.</p>
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:rgba(250,246,241,0.06);border:1px solid rgba(250,246,241,0.1);border-radius:12px;margin:0 0 32px;">
      <tr><td style="padding:28px 32px;">
        <p style="font-size:11px;font-weight:600;letter-spacing:0.18em;text-transform:uppercase;color:#B5715A;margin:0 0 16px;">Your login</p>
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr><td style="padding:0 0 14px;">
            <span style="font-size:11px;color:rgba(250,246,241,0.4);display:block;margin-bottom:4px;">PORTAL URL</span>
            <a href="https://fairwayinvesting.com.au/clients/" style="font-size:14px;color:#B5715A;text-decoration:none;">fairwayinvesting.com.au/clients</a>
          </td></tr>
          <tr><td style="padding:14px 0 0;border-top:1px solid rgba(250,246,241,0.07);">
            <span style="font-size:11px;color:rgba(250,246,241,0.4);display:block;margin-bottom:4px;">EMAIL</span>
            <span style="font-size:14px;color:#FAF6F1;font-family:Courier,monospace;">${email}</span>
          </td></tr>
        </table>
      </td></tr>
    </table>
    <table cellpadding="0" cellspacing="0" border="0"><tr>
      <td style="border-radius:100px;background:#B5715A;">
        <a href="${setupLink}" style="display:inline-block;font-size:15px;font-weight:500;color:#FAF6F1;text-decoration:none;padding:15px 34px;">Set your password &rarr;</a>
      </td>
    </tr></table>
    <p style="font-size:12px;color:rgba(250,246,241,0.25);margin:20px 0 0;line-height:1.6;">This link expires in 7 days. If it has expired, contact Luke and he can send a new one.</p>
    <p style="font-size:13px;color:rgba(250,246,241,0.3);margin:20px 0 0;line-height:1.6;">Any questions, reply to this email or call 0416 184 333.</p>
  </td></tr>
  <tr><td style="padding:24px 0 0;text-align:center;">
    <p style="font-size:12px;color:rgba(250,246,241,0.25);margin:0;line-height:1.7;">Fairway Investing &middot; Suite 211, Level 2/5 Alexander Street, Crows Nest NSW 2065<br>
    <a href="mailto:info@fairwayinvesting.com.au" style="color:#B5715A;text-decoration:none;">info@fairwayinvesting.com.au</a> &middot; 0416 184 333</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}

function buildRefreshQuestionnaireEmail(name, email, acqLabel, link) {
  const firstName = name.split(' ')[0];
  return `<!DOCTYPE html><html lang="en" style="background:#181614;"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Questionnaire — Fairway</title>
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
    <p style="font-size:11px;font-weight:600;letter-spacing:0.2em;text-transform:uppercase;color:#B5715A;margin:0 0 16px;">${acqLabel}</p>
    <h1 class="eh1" style="font-family:Georgia,'Times New Roman',serif;font-size:32px;font-weight:400;color:#FAF6F1;margin:0 0 12px;line-height:1.2;">Ready to get started on your next property, ${firstName}?</h1>
    <p style="font-size:16px;color:rgba(250,246,241,0.6);margin:0 0 32px;line-height:1.65;">I've prepared a short questionnaire for your next acquisition. To save you time, I've pre-filled your personal details from our first engagement — just review what's there and update anything that's changed. You'll also need to confirm your purchasing entity for this property, as that may differ from before.</p>
    <table cellpadding="0" cellspacing="0" border="0"><tr>
      <td style="border-radius:100px;background:#B5715A;">
        <a href="${link}" style="display:inline-block;font-size:15px;font-weight:500;color:#FAF6F1;text-decoration:none;padding:15px 34px;">Start questionnaire &rarr;</a>
      </td>
    </tr></table>
    <p style="font-size:13px;color:rgba(250,246,241,0.3);margin:24px 0 0;line-height:1.6;">Any questions, reply to this email or call 0416 184 333.</p>
  </td></tr>
  <tr><td style="padding:24px 0 0;text-align:center;">
    <p style="font-size:12px;color:rgba(250,246,241,0.25);margin:0;line-height:1.7;">Fairway Investing &middot; Suite 211, Level 2/5 Alexander Street, Crows Nest NSW 2065<br>
    <a href="mailto:info@fairwayinvesting.com.au" style="color:#B5715A;text-decoration:none;">info@fairwayinvesting.com.au</a> &middot; 0416 184 333</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}

function buildMarketsEmail(name) {
  const firstName = name.split(' ')[0];
  const portalLink = 'https://fairwayinvesting.com.au/clients/portal.html';
  return `<!DOCTYPE html><html lang="en" style="background:#181614;"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Your reports are ready — Fairway</title>
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
    <p style="font-size:11px;font-weight:600;letter-spacing:0.2em;text-transform:uppercase;color:#B5715A;margin:0 0 16px;">Market research</p>
    <h1 class="eh1" style="font-family:Georgia,'Times New Roman',serif;font-size:36px;font-weight:400;color:#FAF6F1;margin:0 0 12px;line-height:1.15;">Your reports are ready, ${firstName}.</h1>
    <p style="font-size:16px;color:rgba(250,246,241,0.6);margin:0 0 32px;line-height:1.65;">I've assigned your market research reports in the portal. Log in to explore the data on your target markets — prices, rents, yields, growth history and the infrastructure pipeline.</p>
    <table cellpadding="0" cellspacing="0" border="0"><tr>
      <td style="border-radius:100px;background:#B5715A;">
        <a href="${portalLink}" style="display:inline-block;font-size:15px;font-weight:500;color:#FAF6F1;text-decoration:none;padding:15px 34px;">View your reports &rarr;</a>
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

async function pbkdf2Hash(password, salt) {
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(password, salt, 100000, 32, 'sha256', (err, key) =>
      err ? reject(err) : resolve(key.toString('hex'))
    );
  });
}

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

export default async (req) => {
  if (!(await checkAdmin(req))) return json({ error: 'Unauthorized' }, 401);

  const store = getStore({ name: 'fairway-clients', consistency: 'strong' });
  const clients = (await store.get('all', { type: 'json' })) || [];

  if (req.method === 'GET') {
    return json(clients.filter(c => !c.deleted).map(({ id, name, email, markets, active, createdAt, setupToken, pipelineStage, pipelineStageUpdatedAt, status, engagementNumber, referralSource, referrerId, crmContactId, acquisitions, customFields, welcomeEmailSentAt, welcomeEmailFailed, dealProfessionals, manualFee, manualFees, manualFeeDeleteLog }) => {
      // Migrate legacy single manualFee → manualFees array on read
      const resolvedFees = manualFees?.length ? manualFees
        : (manualFee?.totalFee ? [{ id: 'fee-1', label: 'Acquisition 1', totalFee: manualFee.totalFee, notes: manualFee.notes || '', payments: manualFee.payments || [], createdAt: '' }] : []);
      return { id, name, email, markets, active, createdAt, hasSetupToken: !!setupToken, pipelineStage: pipelineStage || null, pipelineStageUpdatedAt: pipelineStageUpdatedAt || null, status: status || 'active', engagementNumber: engagementNumber || 1, referralSource: referralSource || null, referrerId: referrerId || null, crmContactId: crmContactId || null, acquisitions: acquisitions || [], customFields: customFields || [], welcomeEmailSentAt: welcomeEmailSentAt || null, welcomeEmailFailed: welcomeEmailFailed || false, dealProfessionals: dealProfessionals || [], manualFee: manualFee || null, manualFees: resolvedFees, manualFeeDeleteLog: manualFeeDeleteLog || [] };
    }));
  }

  if (req.method === 'POST') {
    const { name, email, password, markets, sendEmail = true, referralSource, referrerId } = await req.json().catch(() => ({}));
    if (!name || !email) return json({ error: 'name and email required' }, 400);

    const emailNorm = email.toLowerCase().trim();

    // Block if an active non-deleted client already exists with this email
    if (clients.some(c => !c.deleted && c.active && c.email?.toLowerCase() === emailNorm)) {
      return json({ error: 'A client with this email is already active.' }, 409);
    }

    // Soft-delete any stale/zombie entries with this email so they cannot shadow the new
    // entry at login. This handles cases where a previous hard-delete didn't persist in Blobs.
    clients
      .filter(c => c.email?.toLowerCase() === emailNorm)
      .forEach(e => { e.deleted = true; e.active = false; if (!e.deletedAt) e.deletedAt = new Date().toISOString(); });

    const salt = crypto.randomBytes(16).toString('hex');
    const setupToken = crypto.randomBytes(24).toString('hex');
    const setupTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    // If admin sets a password, hash it; otherwise use a random placeholder (client must use setup link)
    const effectivePassword = password || crypto.randomBytes(32).toString('hex');

    const now = new Date().toISOString();
    const firstAcqId = crypto.randomUUID();
    const client = {
      id: crypto.randomUUID(),
      name: name.trim(),
      email: emailNorm,
      passwordHash: await pbkdf2Hash(effectivePassword, salt),
      passwordSalt: salt,
      markets: Array.isArray(markets) ? markets : [],
      active: true,
      createdAt: now,
      pipelineStage: 'onboarding',
      pipelineStageUpdatedAt: now,
      referralSource: referralSource || null,
      referrerId: referrerId || null,
      setupToken,
      setupTokenExpiry,
      acquisitions: [{
        id: firstAcqId,
        number: 1,
        label: 'Acquisition 1',
        pipelineStage: 'onboarding',
        pipelineStageUpdatedAt: now,
        status: 'active',
        markets: Array.isArray(markets) ? markets : [],
      }],
    };
    clients.push(client);
    await store.setJSON('all', clients);

    let emailSent = false;
    if (sendEmail) {
      try {
        await resend.emails.send({
          from: 'Luke at Fairway <info@fairwayinvesting.com.au>',
          to: [client.email],
          reply_to: 'luke@fairwayinvesting.com.au',
          subject: 'Welcome to Fairway — set up your portal access',
          html: buildWelcomeEmail(client.name, client.email, setupToken),
        });
        emailSent = true;
        client.welcomeEmailSentAt = new Date().toISOString();
      } catch (err) {
        console.error('Welcome email failed:', err?.message || err);
        client.welcomeEmailFailed = true;
      }
      await store.setJSON('all', clients);
    }

    appendAudit('client_created', `Created client ${client.name} <${client.email}>`);
    return json({ ok: true, id: client.id, emailSent, acquisitions: client.acquisitions }, 201);
  }

  if (req.method === 'PUT') {
    const body = await req.json().catch(() => ({}));
    const { id, name, markets, active, password, action, datesArchived, pipelineStage, status, engagementNumber, referralSource, referrerId, crmContactId, customFields, dealProfessionals, manualFee } = body;
    const idx = clients.findIndex(c => c.id === id);
    if (idx === -1) return json({ error: 'Client not found' }, 404);

    if (action === 'add-acquisition') {
      const client = clients[idx];
      // Auto-seed acquisitions array if first time
      if (!client.acquisitions || client.acquisitions.length === 0) {
        client.acquisitions = [{
          id: crypto.randomUUID(),
          number: 1,
          label: 'Acquisition 1',
          pipelineStage: client.pipelineStage || null,
          markets: client.markets || [],
          status: 'active',
          questionnaireSubmitted: false,
          createdAt: client.createdAt || new Date().toISOString(),
        }];
      }
      const number = client.acquisitions.length + 1;
      const newAcq = {
        id: crypto.randomUUID(),
        number,
        label: `Acquisition ${number}`,
        pipelineStage: 'onboarding',
        markets: [],
        status: 'active',
        questionnaireSubmitted: false,
        createdAt: new Date().toISOString(),
      };
      client.acquisitions.push(newAcq);
      await store.setJSON('all', clients);
      appendAudit('acquisition_added', `Added ${newAcq.label} for ${client.name} <${client.email}>`);
      return json({ ok: true, acquisition: newAcq, acquisitions: client.acquisitions });
    }

    if (action === 'update-acquisition') {
      const { acqId, pipelineStage: acqStage, markets: acqMarkets, status: acqStatus, label: acqLabel } = body;
      const client = clients[idx];
      if (!client.acquisitions) return json({ error: 'No acquisitions' }, 404);
      const acqIdx = client.acquisitions.findIndex(a => a.id === acqId);
      if (acqIdx === -1) return json({ error: 'Acquisition not found' }, 404);
      const acq = client.acquisitions[acqIdx];
      if (acqStage !== undefined) { acq.pipelineStage = acqStage; acq.pipelineStageUpdatedAt = new Date().toISOString(); }
      if (acqMarkets !== undefined) acq.markets = acqMarkets;
      if (acqStatus !== undefined) acq.status = acqStatus;
      if (acqLabel !== undefined) acq.label = acqLabel;
      client.acquisitions[acqIdx] = acq;
      // Mirror latest active acquisition's stage to client.pipelineStage for kanban
      const latestActive = [...client.acquisitions].reverse().find(a => a.status === 'active');
      if (latestActive) { client.pipelineStage = latestActive.pipelineStage; client.pipelineStageUpdatedAt = latestActive.pipelineStageUpdatedAt || new Date().toISOString(); }
      await store.setJSON('all', clients);
      appendAudit('acquisition_updated', `Updated ${acq.label} for ${client.name} <${client.email}>`);
      return json({ ok: true, acquisition: acq });
    }

    if (action === 'delete-acquisition') {
      const { acqId } = body;
      const client = clients[idx];
      if (!client.acquisitions?.length) return json({ error: 'No acquisitions found' }, 404);
      const acqToDelete = client.acquisitions.find(a => a.id === acqId);
      if (!acqToDelete) return json({ error: 'Acquisition not found' }, 404);
      if (client.acquisitions.length === 1) return json({ error: 'Cannot delete the only acquisition' }, 400);
      client.acquisitions = client.acquisitions.filter(a => a.id !== acqId);
      // Mirror latest active acquisition's stage to client-level pipeline stage
      const latestActive = [...client.acquisitions].reverse().find(a => a.status === 'active');
      if (latestActive) { client.pipelineStage = latestActive.pipelineStage; client.pipelineStageUpdatedAt = latestActive.pipelineStageUpdatedAt || new Date().toISOString(); }
      await store.setJSON('all', clients);
      appendAudit('acquisition_deleted', `Deleted ${acqToDelete.label} for ${client.name} <${client.email}>`);
      return json({ ok: true, acquisitions: client.acquisitions });
    }

    if (action === 'send-acq-questionnaire') {
      const { acqId } = body;
      const client = clients[idx];
      const acq = (client.acquisitions || []).find(a => a.id === acqId);
      if (!acq) return json({ error: 'Acquisition not found' }, 404);
      const isFirst = acq.number === 1;
      const link = isFirst
        ? `https://fairwayinvesting.com.au/clients/questionnaire.html`
        : `https://fairwayinvesting.com.au/clients/questionnaire.html?acq=${acqId}`;
      try {
        await resend.emails.send({
          from: 'Luke at Fairway <info@fairwayinvesting.com.au>',
          to: [client.email],
          reply_to: 'luke@fairwayinvesting.com.au',
          subject: isFirst ? 'Complete your onboarding questionnaire — Fairway' : `Questionnaire for your next property — Fairway`,
          html: isFirst ? buildWelcomeEmail(client.name, client.email, client.setupToken || '') : buildRefreshQuestionnaireEmail(client.name, client.email, acq.label, link),
        });
      } catch (err) {
        console.error('Questionnaire email failed:', err?.message || err);
        return json({ error: 'Email failed to send' }, 500);
      }
      appendAudit('acq_questionnaire_sent', `Sent questionnaire for ${acq.label} to ${client.name} <${client.email}>`);
      return json({ ok: true });
    }

    // Reactivate a completed client for a new engagement
    if (action === 'reactivate') {
      const client = clients[idx];
      const newEngagement = (client.engagementNumber || 1) + 1;
      client.status = 'active';
      client.engagementNumber = newEngagement;
      client.pipelineStage = 'onboarding';
      client.pipelineStageUpdatedAt = new Date().toISOString();
      // Apply any updated engagement fields from the re-engagement form
      if (body.markets !== undefined) client.markets = body.markets;
      await store.setJSON('all', clients);
      appendAudit('client_reactivated', `Reactivated ${client.name} <${client.email}> — engagement #${newEngagement}`);
      return json({ ok: true, engagementNumber: newEngagement });
    }

    if (action === 'resend-setup') {
      const client = clients[idx];
      const setupToken = crypto.randomBytes(24).toString('hex');
      const setupTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      client.setupToken = setupToken;
      client.setupTokenExpiry = setupTokenExpiry;
      await store.setJSON('all', clients);
      try {
        await resend.emails.send({
          from: 'Luke at Fairway <info@fairwayinvesting.com.au>',
          to: [client.email],
          reply_to: 'luke@fairwayinvesting.com.au',
          subject: 'Set up your Fairway portal access',
          html: buildWelcomeEmail(client.name, client.email, setupToken),
        });
        client.welcomeEmailSentAt = new Date().toISOString();
        client.welcomeEmailFailed = false;
        await store.setJSON('all', clients);
      } catch (err) {
        console.error('Resend setup email failed:', err?.message || err);
        return json({ error: 'Email failed to send' }, 500);
      }
      appendAudit('setup_resent', `Resent setup link to ${client.name} <${client.email}>`);
      return json({ ok: true });
    }

    if (action === 'notify-markets') {
      const client = clients[idx];
      try {
        await resend.emails.send({
          from: 'Luke at Fairway <info@fairwayinvesting.com.au>',
          to: [client.email],
          reply_to: 'luke@fairwayinvesting.com.au',
          subject: 'Your market research reports are ready — Fairway',
          html: buildMarketsEmail(client.name),
        });
      } catch (err) {
        console.error('Markets email failed:', err?.message || err);
        return json({ error: 'Email failed to send' }, 500);
      }
      appendAudit('markets_notified', `Sent markets notification to ${client.name} <${client.email}>`);
      return json({ ok: true });
    }

    const client = clients[idx];
    const prevName = client.name;
    const prevMarkets = (client.markets || []).slice().sort().join(',');
    const prevActive = client.active;
    const prevStage = client.pipelineStage;

    if (name !== undefined) client.name = name.trim();
    if (markets !== undefined) client.markets = markets;
    if (active !== undefined) client.active = active;
    if (datesArchived !== undefined) client.datesArchived = datesArchived;
    if (pipelineStage !== undefined) {
      client.pipelineStage = pipelineStage;
      client.pipelineStageUpdatedAt = new Date().toISOString();
    }
    if (status !== undefined) {
      const prevStatus = client.status || 'active';
      client.status = status;
      if (status === 'completed' && prevStatus !== 'completed') {
        appendAudit('client_completed', `Marked ${client.name} <${client.email}> as completed`);
      }
    }
    if (engagementNumber !== undefined) client.engagementNumber = engagementNumber;
    if (referralSource !== undefined) client.referralSource = referralSource;
    if (referrerId !== undefined) client.referrerId = referrerId;
    if (crmContactId !== undefined) client.crmContactId = crmContactId || null;
    if (customFields !== undefined) client.customFields = customFields;
    if (dealProfessionals !== undefined) client.dealProfessionals = dealProfessionals;
    if (manualFee !== undefined) client.manualFee = manualFee;
    if (body.manualFees !== undefined) { client.manualFees = body.manualFees; client.manualFee = null; }
    if (body.manualFeeDeleteLog !== undefined) client.manualFeeDeleteLog = body.manualFeeDeleteLog;
    if (password) {
      const salt = crypto.randomBytes(16).toString('hex');
      client.passwordHash = await pbkdf2Hash(password, salt);
      client.passwordSalt = salt;
    }
    await store.setJSON('all', clients);

    // Audit after save so name is consistent in log entries
    if (name !== undefined && name.trim() !== prevName) {
      appendAudit('client_updated', `Renamed client "${prevName}" to "${client.name}" <${client.email}>`);
    }
    if (markets !== undefined && markets.slice().sort().join(',') !== prevMarkets) {
      const label = markets.length
        ? markets.map(m => m.charAt(0).toUpperCase() + m.slice(1).replace(/-/g, ' ')).join(', ')
        : 'none';
      appendAudit('markets_assigned', `Assigned markets to ${client.name} <${client.email}>: ${label}`);
    }
    if (active !== undefined && active !== prevActive) {
      appendAudit('client_status_changed', `${active ? 'Activated' : 'Deactivated'} ${client.name} <${client.email}>`);
    }
    if (password) {
      appendAudit('client_password_reset', `Reset password for ${client.name} <${client.email}>`);
    }
    if (pipelineStage !== undefined && pipelineStage !== prevStage) {
      appendAudit('stage_changed', `${client.name} <${client.email}> moved from ${prevStage || 'none'} → ${pipelineStage}`);
      const webhookUrl = process.env.SLACK_WEBHOOK_URL;
      if (webhookUrl) {
        const stageLabels = { onboarding:'Onboarding', searching:'Searching', under_contract:'Under Contract', exchanged:'Unconditional', settlement:'Settled' };
        const stageEmoji = { onboarding:'📋', searching:'🔍', under_contract:'📝', exchanged:'✅', settlement:'🏠' };
        const fromLabel = stageLabels[prevStage] || prevStage || 'None';
        const toLabel = stageLabels[pipelineStage] || pipelineStage;
        fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: `${stageEmoji[pipelineStage] || '➡️'} *${client.name}* moved to *${toLabel}* (from ${fromLabel})` }),
        }).catch(err => console.error('Stage change Slack notify failed:', err?.message || err));
      }
    }
    return json({ ok: true });
  }

  if (req.method === 'DELETE') {
    const url = new URL(req.url);
    const id    = url.searchParams.get('id');
    const purgeEmail = url.searchParams.get('email');
    const { password } = await req.json().catch(() => ({}));
    if (!password || password !== process.env.ADMIN_PASSWORD) {
      return json({ error: 'Incorrect password' }, 403);
    }

    // Force-purge: hard-remove ALL entries with a given email (maintenance escape-hatch for stuck records)
    if (!id && purgeEmail) {
      const norm = purgeEmail.toLowerCase().trim();
      const toRemove = clients.filter(c => c.email?.toLowerCase() === norm);
      if (!toRemove.length) return json({ error: 'No entries found for that email' }, 404);
      const kept = clients.filter(c => c.email?.toLowerCase() !== norm);
      await store.setJSON('all', kept);
      await Promise.all(toRemove.flatMap(c => [
        getStore('fairway-questionnaires').delete(c.email.toLowerCase().replace(/[^a-z0-9]/g, '-')).catch(() => {}),
        getStore('fairway-briefs').delete(c.id).catch(() => {}),
        getStore('fairway-milestones').delete(c.id).catch(() => {}),
        getStore('fairway-purchases').delete(c.id).catch(() => {}),
        getStore('fairway-client-notes').delete(c.id).catch(() => {}),
      ]));
      appendAudit('client_purged', `Force-purged ${toRemove.length} stuck entr${toRemove.length !== 1 ? 'ies' : 'y'} for ${norm}`);
      return json({ ok: true, purged: toRemove.length });
    }

    if (!id) return json({ error: 'id required' }, 400);
    const toDelete = clients.find(c => c.id === id);
    if (!toDelete) return json({ error: 'Not found' }, 404);
    // Soft-delete: keep in the array so the email uniqueness check on re-creation works reliably,
    // regardless of any Netlify Blobs read consistency window between write and next request.
    toDelete.deleted = true;
    toDelete.active = false;
    toDelete.deletedAt = new Date().toISOString();
    await store.setJSON('all', clients);
    // Cascade: clean up all related data stores
    await Promise.all([
      getStore('fairway-questionnaires').delete(toDelete.email.toLowerCase().replace(/[^a-z0-9]/g, '-')).catch(() => {}),
      getStore('fairway-briefs').delete(toDelete.id).catch(() => {}),
      getStore('fairway-milestones').delete(toDelete.id).catch(() => {}),
      getStore('fairway-purchases').delete(toDelete.id).catch(() => {}),
      getStore('fairway-client-notes').delete(toDelete.id).catch(() => {}),
    ]);
    appendAudit('client_deleted', `Deleted client ${toDelete.name} <${toDelete.email}>`);
    return json({ ok: true });
  }

  return new Response('Method Not Allowed', { status: 405 });
};

export const config = {
  path: '/api/admin/clients',
  method: ['GET', 'POST', 'PUT', 'DELETE'],
};
