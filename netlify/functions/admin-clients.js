import { getStore } from '@netlify/blobs';
import crypto from 'crypto';
import { Resend } from 'resend';

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

async function appendAudit(action, detail) {
  try {
    const store = getStore('fairway-audit-log');
    const entries = (await store.get('entries', { type: 'json' }).catch(() => null)) || [];
    entries.unshift({ ts: new Date().toISOString(), action, detail });
    if (entries.length > 200) entries.length = 200;
    await store.setJSON('entries', entries);
  } catch { /* best-effort */ }
}

function checkAdmin(req) {
  const auth = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  return auth === process.env.ADMIN_PASSWORD;
}

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

export default async (req) => {
  if (!checkAdmin(req)) return json({ error: 'Unauthorized' }, 401);

  const store = getStore('fairway-clients');
  const clients = (await store.get('all', { type: 'json' })) || [];

  if (req.method === 'GET') {
    return json(clients.map(({ id, name, email, markets, active, createdAt, setupToken }) =>
      ({ id, name, email, markets, active, createdAt, hasSetupToken: !!setupToken })
    ));
  }

  if (req.method === 'POST') {
    const { name, email, password, markets, sendEmail = true } = await req.json().catch(() => ({}));
    if (!name || !email) return json({ error: 'name and email required' }, 400);
    if (clients.some(c => c.email.toLowerCase() === email.toLowerCase())) return json({ error: 'Email already exists' }, 409);

    const salt = crypto.randomBytes(16).toString('hex');
    const setupToken = crypto.randomBytes(24).toString('hex');
    const setupTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    // If admin sets a password, hash it; otherwise use a random placeholder (client must use setup link)
    const effectivePassword = password || crypto.randomBytes(32).toString('hex');

    const client = {
      id: crypto.randomUUID(),
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash: await pbkdf2Hash(effectivePassword, salt),
      passwordSalt: salt,
      markets: Array.isArray(markets) ? markets : [],
      active: true,
      createdAt: new Date().toISOString(),
      setupToken,
      setupTokenExpiry,
    };
    clients.push(client);
    await store.setJSON('all', clients);

    if (sendEmail) {
      try {
        await resend.emails.send({
          from: 'Luke at Fairway <info@fairwayinvesting.com.au>',
          to: [client.email],
          reply_to: 'luke@fairwayinvesting.com.au',
          subject: 'Welcome to Fairway — set up your portal access',
          html: buildWelcomeEmail(client.name, client.email, setupToken),
        });
      } catch (err) {
        console.error('Welcome email failed:', err?.message || err);
      }
    }

    appendAudit('client_created', `Created client ${client.name} <${client.email}>`);
    return json({ ok: true, id: client.id }, 201);
  }

  if (req.method === 'PUT') {
    const body = await req.json().catch(() => ({}));
    const { id, name, markets, active, password, action, datesArchived } = body;
    const idx = clients.findIndex(c => c.id === id);
    if (idx === -1) return json({ error: 'Client not found' }, 404);

    if (action === 'notify-markets') {
      const client = clients[idx];
      if (!client.markets || client.markets.length === 0) return json({ error: 'No markets assigned to this client' }, 400);
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

    if (name !== undefined) client.name = name.trim();
    if (markets !== undefined) client.markets = markets;
    if (active !== undefined) client.active = active;
    if (datesArchived !== undefined) client.datesArchived = datesArchived;
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
    return json({ ok: true });
  }

  if (req.method === 'DELETE') {
    const id = new URL(req.url).searchParams.get('id');
    if (!id) return json({ error: 'id required' }, 400);
    const toDelete = clients.find(c => c.id === id);
    const updated = clients.filter(c => c.id !== id);
    if (updated.length === clients.length) return json({ error: 'Not found' }, 404);
    await store.setJSON('all', updated);
    if (toDelete) {
      // Clean up questionnaire submission so email can be reused cleanly
      try {
        const qStore = getStore('fairway-questionnaires');
        const qKey = toDelete.email.toLowerCase().replace(/[^a-z0-9]/g, '-');
        await qStore.delete(qKey);
      } catch { /* best-effort */ }
      appendAudit('client_deleted', `Deleted client ${toDelete.name} <${toDelete.email}>`);
    }
    return json({ ok: true });
  }

  return new Response('Method Not Allowed', { status: 405 });
};

export const config = {
  path: '/api/admin/clients',
  method: ['GET', 'POST', 'PUT', 'DELETE'],
};
