import { getStore } from '@netlify/blobs';
import crypto from 'crypto';
import { Resend } from 'resend';
import { appendAudit } from './_audit.js';

const resend = new Resend(process.env.RESEND_API_KEY);

function checkAdmin(req) {
  const cookie = req.headers.get('cookie') || '';
  const cookieMatch = cookie.match(/fw_admin=([^;]+)/);
  if (cookieMatch) {
    try {
      const [h, b, sig] = cookieMatch[1].split('.');
      const expected = crypto.createHmac('sha256', process.env.JWT_SECRET).update(`${h}.${b}`).digest('base64url');
      if (sig === expected) {
        const payload = JSON.parse(Buffer.from(b, 'base64url').toString());
        if (payload.role === 'admin' && payload.exp > Date.now() / 1000) return true;
      }
    } catch {}
  }
  const auth = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  return auth === process.env.ADMIN_PASSWORD;
}

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

export const MILESTONE_LABELS = {
  finance:       'Subject to Finance',
  building_pest: 'Building & Pest',
  bp_inspection: 'B&P Inspection Date',
  contracts:     'Contracts Exchanged',
  cooling_off:   'Cooling Off End',
  settlement:    'Settlement',
  preapproval:   'Pre-Approval Expiry',
  custom:        'Custom',
};

// ── Store helpers ────────────────────────────────────────────────────────────

const msStore = () => getStore('fairway-milestones');

async function getClientMilestones(clientId) {
  return (await msStore().get(clientId, { type: 'json' }).catch(() => null)) || [];
}

async function saveClientMilestones(clientId, milestones) {
  if (milestones.length === 0) {
    await msStore().delete(clientId).catch(() => {});
    return;
  }
  // Write the data
  await msStore().setJSON(clientId, milestones);
  // Verify the write landed — retry once if count mismatches
  const verify = await msStore().get(clientId, { type: 'json' }).catch(() => null);
  if (!verify || verify.length !== milestones.length) {
    await msStore().setJSON(clientId, milestones);
  }
}


// ── Global view ───────────────────────────────────────────────────────────────
async function getAllMilestones() {
  const { blobs } = await msStore().list().catch(() => ({ blobs: [] }));
  const arrays = await Promise.all(
    blobs
      .filter(b => b.key !== 'all')
      .map(b => msStore().get(b.key, { type: 'json' }).catch(() => []))
  );
  return arrays.flat();
}

// ── Share email ───────────────────────────────────────────────────────────────
function buildShareEmail(clientName, milestones, note, recipientName) {
  const firstName = recipientName ? recipientName.split(' ')[0] : 'there';

  const urgencyColor = (date) => {
    const days = Math.round((new Date(date) - new Date()) / 86400000);
    if (days < 0)  return '#e07070';
    if (days <= 7) return '#e8a87c';
    if (days <= 14) return '#f0c060';
    return '#6dbf7b';
  };

  const urgencyLabel = (date) => {
    const days = Math.round((new Date(date) - new Date()) / 86400000);
    if (days < 0)    return `${Math.abs(days)}d overdue`;
    if (days === 0)  return 'Today';
    if (days === 1)  return 'Tomorrow';
    if (days <= 14)  return `${days} days`;
    return `${Math.ceil(days / 7)} weeks`;
  };

  const formatDate = (d) => new Date(d).toLocaleDateString('en-AU', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  const rows = milestones
    .filter(m => !m.completed)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .map(m => `
      <tr>
        <td style="padding:14px 20px;border-bottom:1px solid rgba(250,246,241,0.06);">
          <span style="display:inline-block;font-size:10px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;background:rgba(250,246,241,0.07);color:${urgencyColor(m.date)};border:1px solid ${urgencyColor(m.date)}40;border-radius:100px;padding:3px 10px;margin-bottom:6px;">${urgencyLabel(m.date)}</span><br>
          <span style="font-size:15px;font-weight:500;color:#FAF6F1;">${m.label}</span>
          ${m.notes ? `<span style="display:block;font-size:12px;color:rgba(250,246,241,0.4);margin-top:3px;">${m.notes}</span>` : ''}
        </td>
        <td style="padding:14px 20px;border-bottom:1px solid rgba(250,246,241,0.06);text-align:right;white-space:nowrap;">
          <span style="font-size:14px;color:rgba(250,246,241,0.65);">${formatDate(m.date)}</span>
        </td>
      </tr>`).join('');

  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Upcoming dates — ${clientName}</title>
<style>@media only screen and (max-width:600px){.ew{padding:28px 20px!important;border-radius:14px!important;}.eh1{font-size:22px!important;}.date-td{display:block!important;text-align:left!important;padding-top:0!important;padding-bottom:14px!important;}}</style>
</head>
<body style="margin:0;padding:0;background:#181614;font-family:Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#181614"><tr><td align="center" style="padding:40px 16px;background:#181614;">
<table width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;">
  <tr><td class="ew" style="background:#1C1815;border-radius:20px;border:1px solid rgba(181,113,90,0.2);padding:40px 44px;">
    <p style="margin:0 0 32px;padding-bottom:28px;border-bottom:1px solid rgba(250,246,241,0.08);text-align:center;">
      <img src="https://fairwayinvesting.com.au/logo-icon.png" width="28" height="28" alt="" style="display:inline-block;border:0;vertical-align:middle;margin-right:10px;">
      <img src="https://fairwayinvesting.com.au/logo-word.png" width="160" height="24" alt="Fairway Investing" style="display:inline-block;border:0;vertical-align:middle;max-width:160px;">
    </p>
    <p style="font-size:11px;font-weight:600;letter-spacing:0.2em;text-transform:uppercase;color:#B5715A;margin:0 0 12px;">Key dates</p>
    <h1 class="eh1" style="font-family:Georgia,'Times New Roman',serif;font-size:26px;font-weight:400;color:#FAF6F1;margin:0 0 8px;line-height:1.2;">Hi ${firstName},</h1>
    <p style="font-size:15px;color:rgba(250,246,241,0.55);margin:0 0 28px;line-height:1.65;">Here are the upcoming key dates${clientName ? ` for <strong style="color:#FAF6F1;font-weight:500;">${clientName}</strong>` : ''}. Please keep these front of mind — missing any of these dates can have significant consequences.</p>
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:rgba(250,246,241,0.04);border:1px solid rgba(250,246,241,0.08);border-radius:12px;overflow:hidden;margin-bottom:24px;">
      ${rows || '<tr><td style="padding:20px;font-size:14px;color:rgba(250,246,241,0.3);text-align:center;">No upcoming dates.</td></tr>'}
    </table>
    ${note ? `<div style="background:rgba(181,113,90,0.08);border:1px solid rgba(181,113,90,0.2);border-radius:10px;padding:16px 20px;margin-bottom:24px;"><p style="font-size:13px;color:rgba(250,246,241,0.55);margin:0 0 4px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;font-size:10px;">Note from Luke</p><p style="font-size:14px;color:#FAF6F1;margin:0;line-height:1.6;">${note.replace(/\n/g, '<br>')}</p></div>` : ''}
    <p style="font-size:13px;color:rgba(250,246,241,0.3);margin:0;line-height:1.6;">Any questions, reply to this email or call 0416 184 333.</p>
  </td></tr>
  <tr><td style="padding:20px 0 0;text-align:center;">
    <p style="font-size:12px;color:rgba(250,246,241,0.2);margin:0;line-height:1.7;">Fairway Investing &middot; Suite 211, Level 2/5 Alexander Street, Crows Nest NSW 2065<br>
    <a href="mailto:info@fairwayinvesting.com.au" style="color:#B5715A;text-decoration:none;">info@fairwayinvesting.com.au</a> &middot; 0416 184 333</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}

// ── Handler ───────────────────────────────────────────────────────────────────

export default async (req) => {
  if (!checkAdmin(req)) return json({ error: 'Unauthorized' }, 401);

  // ── GET ────────────────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    const clientId = new URL(req.url).searchParams.get('clientId');
    if (clientId) return json(await getClientMilestones(clientId));
    return json(await getAllMilestones());
  }

  // ── POST ───────────────────────────────────────────────────────────────────
  if (req.method === 'POST') {
    const body = await req.json().catch(() => ({}));
    const { clientId, action } = body;
    if (!clientId) return json({ error: 'clientId required' }, 400);

    // Share action — email upcoming dates to specified recipients
    if (action === 'share') {
      const { recipients, note, clientName } = body;
      if (!recipients?.length) return json({ error: 'recipients required' }, 400);

      const clientMilestones = await getClientMilestones(clientId);
      const upcoming = clientMilestones.filter(m => !m.completed);
      if (!upcoming.length) return json({ error: 'No upcoming dates to share' }, 400);

      const toList = recipients.map(r => r.email).filter(Boolean);
      if (!toList.length) return json({ error: 'No valid recipient emails' }, 400);

      try {
        await resend.emails.send({
          from: 'Luke at Fairway <info@fairwayinvesting.com.au>',
          to: toList,
          reply_to: 'luke@fairwayinvesting.com.au',
          subject: `Upcoming key dates — ${clientName || 'your property'}`,
          html: buildShareEmail(clientName || '', clientMilestones, note, recipients[0]?.name),
        });
      } catch (err) {
        console.error('Share email failed:', err?.message || err);
        return json({ error: 'Email failed to send' }, 500);
      }

      await appendAudit('milestones_shared',
        `Shared ${upcoming.length} date(s) for ${clientName} to: ${toList.join(', ')}`);
      return json({ ok: true });
    }

    // Create milestone
    const { clientName, type, label, date, notes } = body;
    if (!type || !date) return json({ error: 'type and date required' }, 400);

    const clientMilestones = await getClientMilestones(clientId);
    const milestone = {
      id: crypto.randomUUID(),
      clientId,
      clientName: clientName || '',
      type,
      label: label || MILESTONE_LABELS[type] || type,
      date,
      notes: notes || '',
      completed: false,
      completedAt: null,
      createdAt: new Date().toISOString(),
    };
    clientMilestones.push(milestone);
    await saveClientMilestones(clientId, clientMilestones);
    await appendAudit('milestone_created',
      `Added "${milestone.label}" (${milestone.date}) for ${clientName}`,
      null, milestone);
    return json({ ok: true, id: milestone.id }, 201);
  }

  // ── PUT ────────────────────────────────────────────────────────────────────
  if (req.method === 'PUT') {
    const { id, clientId, date, notes, label, completed } = await req.json().catch(() => ({}));
    if (!id)       return json({ error: 'id required' }, 400);
    if (!clientId) return json({ error: 'clientId required' }, 400);

    const clientMilestones = await getClientMilestones(clientId);
    const idx = clientMilestones.findIndex(m => m.id === id);
    if (idx === -1) return json({ error: 'Not found' }, 404);

    const before = { ...clientMilestones[idx] };
    if (date      !== undefined) clientMilestones[idx].date      = date;
    if (notes     !== undefined) clientMilestones[idx].notes     = notes;
    if (label     !== undefined) clientMilestones[idx].label     = label;
    if (completed !== undefined) {
      clientMilestones[idx].completed   = completed;
      clientMilestones[idx].completedAt = completed ? new Date().toISOString() : null;
    }
    const after = { ...clientMilestones[idx] };
    await saveClientMilestones(clientId, clientMilestones);
    await appendAudit(
      completed ? 'milestone_completed' : 'milestone_updated',
      `"${after.label}" for ${after.clientName}`,
      before, after
    );
    return json({ ok: true });
  }

  // ── DELETE ─────────────────────────────────────────────────────────────────
  if (req.method === 'DELETE') {
    const url = new URL(req.url);
    const id       = url.searchParams.get('id');
    const clientId = url.searchParams.get('clientId');
    if (!id)       return json({ error: 'id required' }, 400);
    if (!clientId) return json({ error: 'clientId required' }, 400);

    const clientMilestones = await getClientMilestones(clientId);
    const toDelete = clientMilestones.find(m => m.id === id);
    if (!toDelete) return json({ error: 'Not found' }, 404);

    const updated = clientMilestones.filter(m => m.id !== id);
    await saveClientMilestones(clientId, updated);
    await appendAudit('milestone_deleted',
      `Deleted "${toDelete.label}" (${toDelete.date}) for ${toDelete.clientName}`,
      toDelete, null);
    return json({ ok: true });
  }

  return new Response('Method Not Allowed', { status: 405 });
};

export const config = {
  path: '/api/admin/milestones',
  method: ['GET', 'POST', 'PUT', 'DELETE'],
};
