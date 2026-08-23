import { getStore } from '@netlify/blobs';
import crypto from 'crypto';
import { Resend } from 'resend';
import { checkAdmin } from './_admin-auth.js';

const resend = new Resend(process.env.RESEND_API_KEY);

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

const DEFAULT_MODULES = ['tasks', 'clients', 'pipeline', 'presentations', 'dates', 'shortlist', 'directory', 'my-deals'];
const ALL_MODULES     = ['tasks', 'clients', 'pipeline', 'presentations', 'dates', 'shortlist', 'directory', 'my-deals', 'reports', 'prospects', 'content', 'life', 'proposal'];
const DIR_PROFESSIONS = ['property-manager','conveyancer','sales-agent','mortgage-broker','accountant','building-pest','financial-planner','buyers-agent','trade','other'];

async function pbkdf2Hash(password, salt) {
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(password, salt, 100000, 32, 'sha256', (err, key) =>
      err ? reject(err) : resolve(key.toString('hex'))
    );
  });
}

function buildInviteEmail(name, email, setupToken) {
  const firstName = name.split(' ')[0];
  const setupLink = `https://fairwayinvesting.com.au/staff/setup.html?token=${setupToken}`;
  return `<!DOCTYPE html><html lang="en" style="background:#181614;"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Welcome to Fairway — Staff Portal</title>
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
    <p style="font-size:11px;font-weight:600;letter-spacing:0.2em;text-transform:uppercase;color:#B5715A;margin:0 0 16px;">Staff portal</p>
    <h1 class="eh1" style="font-family:Georgia,'Times New Roman',serif;font-size:36px;font-weight:400;color:#FAF6F1;margin:0 0 12px;line-height:1.15;">Welcome to Fairway, ${firstName}.</h1>
    <p style="font-size:16px;color:rgba(250,246,241,0.6);margin:0 0 32px;line-height:1.65;">Luke has set up your staff portal access. Click below to set your password and get started.</p>
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:rgba(250,246,241,0.06);border:1px solid rgba(250,246,241,0.1);border-radius:12px;margin:0 0 32px;">
      <tr><td style="padding:28px 32px;">
        <p style="font-size:11px;font-weight:600;letter-spacing:0.18em;text-transform:uppercase;color:#B5715A;margin:0 0 16px;">Your login</p>
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr><td style="padding:0 0 14px;">
            <span style="font-size:11px;color:rgba(250,246,241,0.4);display:block;margin-bottom:4px;">PORTAL URL</span>
            <a href="https://fairwayinvesting.com.au/staff/" style="font-size:14px;color:#B5715A;text-decoration:none;">fairwayinvesting.com.au/staff</a>
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
    <p style="font-size:12px;color:rgba(250,246,241,0.25);margin:20px 0 0;line-height:1.6;">This link expires in 7 days. Contact Luke if it has expired.</p>
  </td></tr>
  <tr><td style="padding:24px 0 0;text-align:center;">
    <p style="font-size:12px;color:rgba(250,246,241,0.25);margin:0;line-height:1.7;">Fairway Investing &middot; Suite 211, Level 2/5 Alexander Street, Crows Nest NSW 2065<br>
    <a href="mailto:info@fairwayinvesting.com.au" style="color:#B5715A;text-decoration:none;">info@fairwayinvesting.com.au</a> &middot; 0416 184 333</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}

function safeUser(u) {
  const { passwordHash, passwordSalt, setupToken, setupTokenExpiry, ...rest } = u;
  return {
    ...rest,
    pending: !!u.setupToken,
  };
}

export default async (req) => {
  if (!(await checkAdmin(req))) return json({ error: 'Unauthorized' }, 401);

  const store = getStore({ name: 'fairway-staff', consistency: 'strong' });
  const load = async () => (await store.get('all', { type: 'json' }).catch(() => null)) || [];
  const save = async (list) => store.set('all', JSON.stringify(list));

  // ── GET /api/admin/staff ──────────────────────────────────────────────────
  if (req.method === 'GET') {
    const all = await load();
    return json(all.filter(u => !u.deletedAt).map(safeUser));
  }

  // ── POST /api/admin/staff — create staff member ───────────────────────────
  if (req.method === 'POST') {
    let body;
    try { body = await req.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }

    const { name, email, role = 'contractor' } = body;
    if (!name?.trim()) return json({ error: 'name required' }, 400);
    if (!email?.trim()) return json({ error: 'email required' }, 400);

    const emailNorm = email.toLowerCase().trim();
    const all = await load();
    if (all.find(u => !u.deletedAt && u.email?.toLowerCase() === emailNorm)) {
      return json({ error: 'A staff account with this email already exists' }, 409);
    }

    const setupToken = crypto.randomBytes(32).toString('hex');
    const user = {
      id: crypto.randomUUID(),
      name: name.trim(),
      email: emailNorm,
      role: role === 'employee' ? 'employee' : 'contractor',
      active: true,
      passwordHash: null,
      passwordSalt: null,
      setupToken,
      setupTokenExpiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      modules: [...DEFAULT_MODULES],
      assignedClients: [],
      directoryAccess: {
        categories: [...DIR_PROFESSIONS],
        hiddenContacts: [],
      },
      permissions: {
        canViewCommissions: false,
        canEditDates: false,
      },
      createdAt: new Date().toISOString(),
    };

    all.push(user);
    await save(all);

    try {
      await resend.emails.send({
        from: 'Fairway Portal <info@fairwayinvesting.com.au>',
        to: [emailNorm],
        subject: 'Welcome to Fairway — set up your staff portal access',
        html: buildInviteEmail(user.name, emailNorm, setupToken),
      });
    } catch (err) {
      console.error('Staff invite email failed:', err?.message || err);
    }

    return json(safeUser(user), 201);
  }

  // ── PUT /api/admin/staff — update staff member ────────────────────────────
  if (req.method === 'PUT') {
    let body;
    try { body = await req.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }

    const { id, action } = body;
    if (!id) return json({ error: 'id required' }, 400);

    const all = await load();
    const idx = all.findIndex(u => u.id === id && !u.deletedAt);
    if (idx === -1) return json({ error: 'Staff member not found' }, 404);

    // activate / deactivate
    if (action === 'activate') {
      all[idx].active = true;
      all[idx].updatedAt = new Date().toISOString();
      await save(all);
      return json(safeUser(all[idx]));
    }
    if (action === 'deactivate') {
      all[idx].active = false;
      all[idx].updatedAt = new Date().toISOString();
      await save(all);
      return json(safeUser(all[idx]));
    }

    // resend invite
    if (action === 'resend-invite') {
      const token = crypto.randomBytes(32).toString('hex');
      all[idx].setupToken = token;
      all[idx].setupTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      all[idx].updatedAt = new Date().toISOString();
      await save(all);
      try {
        await resend.emails.send({
          from: 'Fairway Portal <info@fairwayinvesting.com.au>',
          to: [all[idx].email],
          subject: 'Your Fairway staff portal invite (updated)',
          html: buildInviteEmail(all[idx].name, all[idx].email, token),
        });
      } catch (err) {
        console.error('Resend invite failed:', err?.message || err);
      }
      return json({ ok: true });
    }

    // update modules
    if (action === 'set-modules') {
      const modules = Array.isArray(body.modules) ? body.modules.filter(m => ALL_MODULES.includes(m)) : [];
      all[idx].modules = modules;
      all[idx].updatedAt = new Date().toISOString();
      await save(all);
      return json(safeUser(all[idx]));
    }

    // assign clients
    if (action === 'set-clients') {
      all[idx].assignedClients = Array.isArray(body.assignedClients) ? body.assignedClients : [];
      all[idx].updatedAt = new Date().toISOString();
      await save(all);
      return json(safeUser(all[idx]));
    }

    // update directory access
    if (action === 'set-directory') {
      const categories = Array.isArray(body.categories) ? body.categories.filter(c => DIR_PROFESSIONS.includes(c)) : [];
      const hiddenContacts = Array.isArray(body.hiddenContacts) ? body.hiddenContacts : [];
      all[idx].directoryAccess = { categories, hiddenContacts };
      all[idx].updatedAt = new Date().toISOString();
      await save(all);
      return json(safeUser(all[idx]));
    }

    // update individual permissions
    if (action === 'set-permissions') {
      if (typeof body.permissions === 'object' && body.permissions !== null) {
        all[idx].permissions = { ...all[idx].permissions, ...body.permissions };
      }
      all[idx].updatedAt = new Date().toISOString();
      await save(all);
      return json(safeUser(all[idx]));
    }

    // general field updates
    if (body.name !== undefined) all[idx].name = body.name.trim();
    if (body.email !== undefined) all[idx].email = body.email.toLowerCase().trim();
    if (body.role !== undefined && ['contractor','employee'].includes(body.role)) all[idx].role = body.role;
    all[idx].updatedAt = new Date().toISOString();
    await save(all);
    return json(safeUser(all[idx]));
  }

  // ── DELETE /api/admin/staff — soft delete ─────────────────────────────────
  if (req.method === 'DELETE') {
    const id = new URL(req.url).searchParams.get('id');
    if (!id) return json({ error: 'id required' }, 400);
    const all = await load();
    const idx = all.findIndex(u => u.id === id && !u.deletedAt);
    if (idx === -1) return json({ error: 'Staff member not found' }, 404);
    all[idx].deletedAt = new Date().toISOString();
    all[idx].active = false;
    await save(all);
    return json({ ok: true });
  }

  return json({ error: 'Method not allowed' }, 405);
};

export const config = {
  path: '/api/admin/staff',
  method: ['GET', 'POST', 'PUT', 'DELETE'],
};
