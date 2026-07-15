// Manual trigger for date-reminders — lets you fire a test digest from the admin portal.
// Identical logic to the scheduled function, just HTTP-triggered.

import { getStore } from '@netlify/blobs';
import { Resend } from 'resend';
import crypto from 'crypto';

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

async function getAllMilestones() {
  const store = getStore('fairway-milestones');
  const { blobs } = await store.list().catch(() => ({ blobs: [] }));
  const arrays = await Promise.all(
    blobs.filter(b => b.key !== 'all').map(b => store.get(b.key, { type: 'json' }).catch(() => []))
  );
  return arrays.flat();
}

function daysUntil(dateStr) {
  const today = new Date();
  today.setUTCHours(10, 0, 0, 0);
  const target = new Date(dateStr + 'T00:00:00Z');
  return Math.round((target - today) / 86400000);
}

function fmtDate(dateStr) {
  return new Date(dateStr + 'T12:00:00Z').toLocaleDateString('en-AU', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });
}

function urgencyLabel(days) {
  if (days < -1) return `${Math.abs(days)} days overdue`;
  if (days === -1) return '1 day overdue';
  if (days === 0)  return 'Today';
  if (days === 1)  return 'Tomorrow';
  return `${days} days`;
}

function slackMilestoneLines(items) {
  return items.map(m =>
    `• *${m.clientName}* — ${m.label} — ${fmtDate(m.date)} _[${urgencyLabel(m.days)}]_`
  ).join('\n');
}

async function sendSlack(webhookUrl, dateHeading, overdue, thisWeek, comingUp, isTest) {
  const blocks = [
    {
      type: 'header',
      text: { type: 'plain_text', text: isTest ? '🧪 Test Digest — Daily Dates' : '📅 Daily Date Digest', emoji: true },
    },
    { type: 'context', elements: [{ type: 'mrkdwn', text: dateHeading + (isTest ? ' · _Test send_' : '') }] },
  ];

  if (overdue.length) {
    blocks.push({ type: 'divider' });
    blocks.push({ type: 'section', text: { type: 'mrkdwn', text: `🚨 *ACTION REQUIRED — Overdue*\n${slackMilestoneLines(overdue)}` } });
  }
  if (thisWeek.length) {
    blocks.push({ type: 'divider' });
    blocks.push({ type: 'section', text: { type: 'mrkdwn', text: `📍 *This Week*\n${slackMilestoneLines(thisWeek)}` } });
  }
  if (comingUp.length) {
    blocks.push({ type: 'divider' });
    blocks.push({ type: 'section', text: { type: 'mrkdwn', text: `📋 *Coming Up (8–14 days)*\n${slackMilestoneLines(comingUp)}` } });
  }

  const total = overdue.length + thisWeek.length + comingUp.length;
  const clientCount = new Set([...overdue, ...thisWeek, ...comingUp].map(m => m.clientId)).size;
  blocks.push({ type: 'divider' });
  blocks.push({ type: 'context', elements: [{ type: 'mrkdwn', text: `${total} active date${total !== 1 ? 's' : ''} across ${clientCount} client${clientCount !== 1 ? 's' : ''}` }] });

  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: isTest ? `[TEST] Daily Date Digest` : 'Daily Date Digest',
      blocks,
    }),
  });
}

function urgencyChipColor(days) {
  if (days < 0)   return { bg: 'rgba(220,80,80,0.15)',   border: 'rgba(220,80,80,0.4)',   text: '#e07070' };
  if (days === 0) return { bg: 'rgba(220,80,80,0.1)',    border: 'rgba(220,80,80,0.3)',   text: '#e07070' };
  if (days <= 3)  return { bg: 'rgba(232,168,124,0.15)', border: 'rgba(232,168,124,0.4)', text: '#e8a87c' };
  if (days <= 7)  return { bg: 'rgba(240,192,96,0.12)',  border: 'rgba(240,192,96,0.35)', text: '#d4aa50' };
  return               { bg: 'rgba(109,191,123,0.12)',  border: 'rgba(109,191,123,0.3)', text: '#6dbf7b' };
}

function emailMilestoneRows(items) {
  return items.map(m => {
    const c = urgencyChipColor(m.days);
    return `
    <tr>
      <td style="padding:12px 20px;border-bottom:1px solid rgba(250,246,241,0.05);vertical-align:middle;">
        <span style="display:inline-block;font-size:10px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;background:${c.bg};color:${c.text};border:1px solid ${c.border};border-radius:100px;padding:2px 9px;margin-bottom:5px;">${urgencyLabel(m.days)}</span><br>
        <span style="font-size:14px;font-weight:500;color:#FAF6F1;">${m.clientName}</span>
        <span style="font-size:13px;color:rgba(250,246,241,0.45);"> — ${m.label}</span>
        ${m.notes ? `<span style="display:block;font-size:11.5px;color:rgba(250,246,241,0.3);margin-top:2px;">${m.notes}</span>` : ''}
      </td>
      <td style="padding:12px 20px;border-bottom:1px solid rgba(250,246,241,0.05);text-align:right;white-space:nowrap;vertical-align:middle;">
        <span style="font-size:13px;color:rgba(250,246,241,0.5);">${fmtDate(m.date)}</span>
      </td>
    </tr>`;
  }).join('');
}

function emailSection(title, emoji, items) {
  if (!items.length) return '';
  return `
  <p style="font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:rgba(250,246,241,0.35);margin:24px 0 8px;">${emoji} ${title}</p>
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:rgba(250,246,241,0.04);border:1px solid rgba(250,246,241,0.08);border-radius:10px;overflow:hidden;">
    ${emailMilestoneRows(items)}
  </table>`;
}

function buildEmail(dateHeading, overdue, thisWeek, comingUp, isTest) {
  const total = overdue.length + thisWeek.length + comingUp.length;
  const clientCount = new Set([...overdue, ...thisWeek, ...comingUp].map(m => m.clientId)).size;
  const testBanner = isTest ? `<div style="background:rgba(189,122,112,0.1);border:1px solid rgba(189,122,112,0.3);border-radius:8px;padding:10px 16px;margin-bottom:16px;font-size:12.5px;color:#bd7a70;text-align:center;">🧪 This is a test send — the real digest fires at 8 AM AEST daily</div>` : '';
  const overdueWarning = overdue.length ? `<div style="background:rgba(220,80,80,0.08);border:1px solid rgba(220,80,80,0.25);border-radius:10px;padding:12px 18px;margin-bottom:8px;"><p style="font-size:13.5px;font-weight:500;color:#e07070;margin:0;">⚠️ ${overdue.length} overdue date${overdue.length !== 1 ? 's' : ''} — action required</p></div>` : '';

  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Daily Date Digest — Fairway</title></head>
<body style="margin:0;padding:0;background:#181614;font-family:Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#181614"><tr><td align="center" style="padding:40px 16px;">
<table width="580" cellpadding="0" cellspacing="0" border="0" style="max-width:580px;width:100%;">
  <tr><td style="background:#1C1815;border-radius:20px;border:1px solid rgba(181,113,90,0.2);padding:36px 40px;">
    <p style="margin:0 0 28px;padding-bottom:24px;border-bottom:1px solid rgba(250,246,241,0.08);text-align:center;">
      <img src="https://fairwayinvesting.com.au/logo-icon.png" width="26" height="26" alt="" style="display:inline-block;border:0;vertical-align:middle;margin-right:8px;">
      <img src="https://fairwayinvesting.com.au/logo-word.png" width="140" height="21" alt="Fairway Investing" style="display:inline-block;border:0;vertical-align:middle;">
    </p>
    ${testBanner}
    <p style="font-size:11px;font-weight:600;letter-spacing:0.2em;text-transform:uppercase;color:#B5715A;margin:0 0 6px;">Daily digest</p>
    <h1 style="font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:400;color:#FAF6F1;margin:0 0 4px;">Upcoming dates</h1>
    <p style="font-size:13px;color:rgba(250,246,241,0.35);margin:0 0 20px;">${dateHeading} &nbsp;·&nbsp; ${total} date${total !== 1 ? 's' : ''} across ${clientCount} client${clientCount !== 1 ? 's' : ''}</p>
    ${overdueWarning}
    ${emailSection('Action Required — Overdue', '🚨', overdue)}
    ${emailSection('This Week', '📍', thisWeek)}
    ${emailSection('Coming Up (8–14 days)', '📋', comingUp)}
    <p style="font-size:12px;color:rgba(250,246,241,0.2);margin:24px 0 0;line-height:1.6;">Log in to <a href="https://fairwayinvesting.com.au/admin/" style="color:#B5715A;text-decoration:none;">admin portal</a> to manage dates.</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}

export default async (req) => {
  if (!checkAdmin(req)) return json({ error: 'Unauthorized' }, 401);

  const allMilestones = await getAllMilestones();
  const active = allMilestones
    .filter(m => !m.completed)
    .map(m => ({ ...m, days: daysUntil(m.date) }));

  const overdue  = active.filter(m => m.days < 0)                .sort((a, b) => a.days - b.days);
  const thisWeek = active.filter(m => m.days >= 0 && m.days <= 7) .sort((a, b) => a.days - b.days);
  const comingUp = active.filter(m => m.days > 7 && m.days <= 14) .sort((a, b) => a.days - b.days);

  if (!overdue.length && !thisWeek.length && !comingUp.length) {
    return json({ ok: true, message: 'No upcoming dates in 14-day window — nothing to send.' });
  }

  const dateHeading = new Date().toLocaleDateString('en-AU', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Australia/Sydney',
  });

  const results = { slack: null, email: null };

  const slackUrl = process.env.SLACK_WEBHOOK_URL;
  if (slackUrl) {
    try {
      await sendSlack(slackUrl, dateHeading, overdue, thisWeek, comingUp, true);
      results.slack = 'sent';
    } catch (err) {
      results.slack = `failed: ${err.message}`;
    }
  } else {
    results.slack = 'skipped — SLACK_WEBHOOK_URL not set';
  }

  try {
    await resend.emails.send({
      from: 'Fairway Digest <info@fairwayinvesting.com.au>',
      to: ['luke@fairwayinvesting.com.au'],
      subject: `🧪 [Test] Upcoming dates digest`,
      html: buildEmail(dateHeading, overdue, thisWeek, comingUp, true),
    });
    results.email = 'sent';
  } catch (err) {
    results.email = `failed: ${err.message}`;
  }

  return json({ ok: true, results, counts: { overdue: overdue.length, thisWeek: thisWeek.length, comingUp: comingUp.length } });
};

export const config = { path: '/api/admin/test-reminders', method: ['POST'] };
