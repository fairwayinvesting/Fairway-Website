import { getStore } from '@netlify/blobs';
import crypto from 'crypto';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

function buildWelcomeEmail(name, email, password) {
  const firstName = name.split(' ')[0];
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"><style>:root{color-scheme:light;}[data-ogsc] body,[data-ogsc] .email-outer{background-color:#FAF6F1!important;}[data-ogsc] .dark-card{background-color:#1C1815!important;}</style><title>Welcome to Fairway</title></head>
<body style="margin:0;padding:0;background:#FAF6F1;font-family:Helvetica,Arial,sans-serif;" class="email-outer">
<table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#FAF6F1" class="email-outer"><tr><td align="center" style="padding:48px 24px 40px;">
<table width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;">
  <tr><td style="background:#1C1815;border-radius:18px;padding:44px 48px 44px;" class="dark-card">
    <p style="margin:0 0 36px;padding-bottom:32px;border-bottom:1px solid rgba(250,246,241,0.08);text-align:center;">
      <img src="https://fairwayinvesting.com.au/logo-word.png" width="200" height="30" alt="Fairway Investing" style="display:inline-block;border:0;max-width:200px;">
    </p>
    <p style="font-size:11px;font-weight:600;letter-spacing:0.2em;text-transform:uppercase;color:#B5715A;margin:0 0 16px;">Client portal</p>
    <h1 style="font-family:Georgia,'Times New Roman',serif;font-size:36px;font-weight:400;color:#FAF6F1;margin:0 0 12px;line-height:1.15;">Welcome, ${firstName}.</h1>
    <p style="font-size:16px;color:rgba(250,246,241,0.6);margin:0 0 36px;line-height:1.65;">Your Fairway client portal is live. Use the details below to sign in and access your market research reports.</p>
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:rgba(250,246,241,0.06);border:1px solid rgba(250,246,241,0.1);border-radius:12px;margin:0 0 36px;">
      <tr><td style="padding:28px 32px;">
        <p style="font-size:11px;font-weight:600;letter-spacing:0.18em;text-transform:uppercase;color:#B5715A;margin:0 0 20px;">Your login details</p>
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr><td style="padding:0 0 14px;">
            <span style="font-size:11px;color:rgba(250,246,241,0.4);display:block;margin-bottom:4px;">LOGIN URL</span>
            <a href="https://fairwayinvesting.com.au/clients/" style="font-size:14px;color:#B5715A;text-decoration:none;">fairwayinvesting.com.au/clients</a>
          </td></tr>
          <tr><td style="padding:14px 0;border-top:1px solid rgba(250,246,241,0.07);">
            <span style="font-size:11px;color:rgba(250,246,241,0.4);display:block;margin-bottom:4px;">EMAIL</span>
            <span style="font-size:14px;color:#FAF6F1;font-family:Courier,monospace;">${email}</span>
          </td></tr>
          <tr><td style="padding:14px 0 0;border-top:1px solid rgba(250,246,241,0.07);">
            <span style="font-size:11px;color:rgba(250,246,241,0.4);display:block;margin-bottom:4px;">PASSWORD</span>
            <span style="font-size:14px;color:#FAF6F1;font-family:Courier,monospace;">${password}</span>
          </td></tr>
        </table>
      </td></tr>
    </table>
    <table cellpadding="0" cellspacing="0" border="0"><tr>
      <td style="border-radius:100px;background:#B5715A;">
        <a href="https://fairwayinvesting.com.au/clients/" style="display:inline-block;font-size:15px;font-weight:500;color:#FAF6F1;text-decoration:none;padding:15px 34px;">Access your portal &rarr;</a>
      </td>
    </tr></table>
    <p style="font-size:13px;color:rgba(250,246,241,0.3);margin:28px 0 0;line-height:1.6;">Any questions, reply to this email or call 0416 184 333.</p>
  </td></tr>
  <tr><td style="padding:28px 0 0;text-align:center;">
    <p style="font-size:12px;color:rgba(28,24,21,0.4);margin:0;line-height:1.7;">Fairway Investing &middot; Suite 211, Level 2/5 Alexander Street, Crows Nest NSW 2065<br>
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
    return json(clients.map(({ id, name, email, markets, active, createdAt }) =>
      ({ id, name, email, markets, active, createdAt })
    ));
  }

  if (req.method === 'POST') {
    const { name, email, password, markets } = await req.json().catch(() => ({}));
    if (!name || !email || !password) return json({ error: 'name, email and password required' }, 400);
    if (clients.some(c => c.email.toLowerCase() === email.toLowerCase())) return json({ error: 'Email already exists' }, 409);
    const salt = crypto.randomBytes(16).toString('hex');
    const client = {
      id: crypto.randomUUID(),
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash: await pbkdf2Hash(password, salt),
      passwordSalt: salt,
      markets: Array.isArray(markets) ? markets : [],
      active: true,
      createdAt: new Date().toISOString(),
    };
    clients.push(client);
    await store.setJSON('all', clients);

    resend.emails.send({
      from: 'Luke at Fairway <info@fairwayinvesting.com.au>',
      to: [client.email],
      replyTo: 'luke@fairwayinvesting.com.au',
      subject: 'Welcome to Fairway — your portal is ready',
      html: buildWelcomeEmail(client.name, client.email, password),
    }).catch(err => console.error('Welcome email failed:', err));

    return json({ ok: true, id: client.id }, 201);
  }

  if (req.method === 'PUT') {
    const { id, name, markets, active, password } = await req.json().catch(() => ({}));
    const idx = clients.findIndex(c => c.id === id);
    if (idx === -1) return json({ error: 'Client not found' }, 404);
    if (name !== undefined) clients[idx].name = name.trim();
    if (markets !== undefined) clients[idx].markets = markets;
    if (active !== undefined) clients[idx].active = active;
    if (password) {
      const salt = crypto.randomBytes(16).toString('hex');
      clients[idx].passwordHash = await pbkdf2Hash(password, salt);
      clients[idx].passwordSalt = salt;
    }
    await store.setJSON('all', clients);
    return json({ ok: true });
  }

  if (req.method === 'DELETE') {
    const id = new URL(req.url).searchParams.get('id');
    if (!id) return json({ error: 'id required' }, 400);
    const updated = clients.filter(c => c.id !== id);
    if (updated.length === clients.length) return json({ error: 'Not found' }, 404);
    await store.setJSON('all', updated);
    return json({ ok: true });
  }

  return new Response('Method Not Allowed', { status: 405 });
};

export const config = {
  path: '/api/admin/clients',
  method: ['GET', 'POST', 'PUT', 'DELETE'],
};
