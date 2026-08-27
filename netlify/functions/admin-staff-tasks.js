import { getStore } from '@netlify/blobs';
import crypto from 'crypto';
import { Resend } from 'resend';
import { checkAdmin } from './_admin-auth.js';

const resend = new Resend(process.env.RESEND_API_KEY);

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

const VALID_URGENCY = ['high', 'medium', 'low'];

function buildTaskAssignedEmail(contractorName, title, urgency, dueDate, notes) {
  const urgLabel = { high: 'High', medium: 'Medium', low: 'Low' }[urgency] || urgency;
  const urgColor = { high: '#e07070', medium: '#e8a87c', low: 'rgba(250,246,241,0.4)' }[urgency] || '#e8a87c';
  const dateStr = dueDate
    ? new Date(dueDate + 'T00:00:00').toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : '';
  return `<!DOCTYPE html><html lang="en" style="background:#181614;"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>New task assigned</title>
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
    <p style="font-size:11px;font-weight:600;letter-spacing:0.2em;text-transform:uppercase;color:#B5715A;margin:0 0 16px;">New task</p>
    <h1 style="font-family:Georgia,'Times New Roman',serif;font-size:28px;font-weight:400;color:#FAF6F1;margin:0 0 16px;line-height:1.25;">You've been assigned a task.</h1>
    <p style="font-size:16px;color:rgba(250,246,241,0.6);margin:0 0 28px;line-height:1.65;">Hi ${contractorName} — Luke has assigned you a new task in the Fairway portal.</p>
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:rgba(250,246,241,0.04);border:1px solid rgba(250,246,241,0.09);border-radius:12px;margin:0 0 32px;">
      <tr><td style="padding:22px 26px;">
        <p style="font-size:16px;color:#FAF6F1;margin:0 0 14px;line-height:1.4;font-weight:500;">${title}</p>
        <table cellpadding="0" cellspacing="0" border="0"><tr>
          <td style="padding-right:16px;">
            <p style="font-size:10px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:rgba(250,246,241,0.35);margin:0 0 4px;">Urgency</p>
            <p style="font-size:13px;color:${urgColor};margin:0;font-weight:500;">${urgLabel}</p>
          </td>
          ${dateStr ? `<td>
            <p style="font-size:10px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:rgba(250,246,241,0.35);margin:0 0 4px;">Due</p>
            <p style="font-size:13px;color:rgba(250,246,241,0.7);margin:0;">${dateStr}</p>
          </td>` : ''}
        </tr></table>
        ${notes ? `<p style="font-size:13px;color:rgba(250,246,241,0.45);margin:14px 0 0;line-height:1.6;border-top:1px solid rgba(250,246,241,0.07);padding-top:14px;">${notes}</p>` : ''}
      </td></tr>
    </table>
    <table cellpadding="0" cellspacing="0" border="0"><tr>
      <td style="border-radius:100px;background:#B5715A;">
        <a href="https://fairwayinvesting.com.au/staff/portal.html" style="display:inline-block;font-size:15px;font-weight:500;color:#FAF6F1;text-decoration:none;padding:14px 32px;">View in portal &rarr;</a>
      </td>
    </tr></table>
  </td></tr>
  <tr><td style="padding:24px 0 0;text-align:center;">
    <p style="font-size:12px;color:rgba(250,246,241,0.25);margin:0;line-height:1.7;">Fairway Investing &middot; <a href="mailto:luke@fairwayinvesting.com.au" style="color:#B5715A;text-decoration:none;">luke@fairwayinvesting.com.au</a></p>
  </td></tr>
</table>
</td></tr></table></body></html>`;
}

export default async (req) => {
  if (!(await checkAdmin(req))) return json({ error: 'Unauthorized' }, 401);

  const store = getStore({ name: 'fairway-staff-tasks', consistency: 'strong' });
  const load = async () => (await store.get('all', { type: 'json' }).catch(() => null)) || [];
  const save = async (list) => store.set('all', JSON.stringify(list));

  if (req.method === 'GET') {
    const all = await load();
    return json(all.filter(t => !t.deletedAt));
  }

  if (req.method === 'POST') {
    const body = await req.json().catch(() => ({}));
    const { title, urgency, dueDate, assignedTo, assignedToName, notes } = body;
    if (!title?.trim()) return json({ error: 'title required' }, 400);
    if (!assignedTo)    return json({ error: 'assignedTo required' }, 400);
    const all = await load();
    const task = {
      id:              crypto.randomUUID(),
      title:           title.trim(),
      urgency:         VALID_URGENCY.includes(urgency) ? urgency : 'medium',
      dueDate:         dueDate || new Date().toISOString().slice(0, 10),
      notes:           notes?.trim() || '',
      completedAt:     null,
      deletedAt:       null,
      createdAt:       new Date().toISOString(),
      ownerId:         assignedTo,
      ownerName:       assignedToName || '',
      assignedTo:      assignedTo,
      assignedToName:  assignedToName || '',
      assignedByAdmin: true,
    };
    all.push(task);
    await save(all);

    // Look up contractor email and notify — fire and forget
    (async () => {
      try {
        const staffStore = getStore({ name: 'fairway-staff', consistency: 'strong' });
        const staffAll = (await staffStore.get('all', { type: 'json' }).catch(() => null)) || [];
        const contractor = staffAll.find(u => u.id === assignedTo && !u.deletedAt);
        if (contractor?.email) {
          await resend.emails.send({
            from: 'Fairway Portal <info@fairwayinvesting.com.au>',
            to: [contractor.email],
            subject: `New task from Luke — ${task.title}`,
            html: buildTaskAssignedEmail(contractor.name || assignedToName, task.title, task.urgency, task.dueDate, task.notes),
          });
        }
      } catch (err) {
        console.error('Task assignment email failed:', err?.message);
      }
    })();

    return json(task, 201);
  }

  if (req.method === 'PUT') {
    const body = await req.json().catch(() => ({}));
    const { id } = body;
    if (!id) return json({ error: 'id required' }, 400);
    const all = await load();
    const idx = all.findIndex(t => t.id === id);
    if (idx === -1) return json({ error: 'Not found' }, 404);
    const t = all[idx];
    if (body.title !== undefined)   t.title   = body.title.trim();
    if (body.urgency !== undefined && VALID_URGENCY.includes(body.urgency)) t.urgency = body.urgency;
    if (body.dueDate !== undefined) t.dueDate = body.dueDate;
    if (body.notes !== undefined)   t.notes   = body.notes?.trim() || '';
    all[idx] = t;
    await save(all);
    return json(t);
  }

  if (req.method === 'DELETE') {
    const id = new URL(req.url).searchParams.get('id');
    if (!id) return json({ error: 'id required' }, 400);
    const all = await load();
    const idx = all.findIndex(t => t.id === id);
    if (idx === -1) return json({ error: 'Not found' }, 404);
    all[idx].deletedAt = new Date().toISOString();
    await save(all);
    return json({ ok: true });
  }

  return new Response('Method Not Allowed', { status: 405 });
};

export const config = { path: '/api/admin/staff-tasks', method: ['GET', 'POST', 'PUT', 'DELETE'] };
