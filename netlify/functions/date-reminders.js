// Runs daily at 10 PM UTC = 8 AM AEST (9 AM AEDT during daylight saving).
// Sends a digest to Slack + email whenever there are upcoming or overdue dates.
// No message is sent on days with nothing in the 14-day window.

import { getStore } from '@netlify/blobs';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// ── Data helpers ─────────────────────────────────────────────────────────────

async function getAllMilestones() {
  const store = getStore('fairway-milestones');
  const { blobs } = await store.list().catch(() => ({ blobs: [] }));
  const arrays = await Promise.all(
    blobs
      .filter(b => b.key !== 'all')
      .map(b => store.get(b.key, { type: 'json' }).catch(() => []))
  );
  return arrays.flat();
}

async function getActiveClientIds() {
  const store = getStore('fairway-clients');
  const clients = (await store.get('all', { type: 'json' }).catch(() => null)) || [];
  return new Set(clients.filter(c => (c.status || 'active') !== 'completed').map(c => c.id));
}

// ── Date utilities ────────────────────────────────────────────────────────────

function daysUntil(dateStr) {
  // Compute days relative to today's date in Sydney time.
  // The cron fires at 10 PM UTC = 8 AM AEST, so new Date() is still the previous
  // UTC calendar day — we must derive the Australian date explicitly.
  const todayAU = new Date().toLocaleDateString('en-CA', { timeZone: 'Australia/Sydney' }); // YYYY-MM-DD
  const today  = new Date(todayAU  + 'T00:00:00');
  const target = new Date(dateStr  + 'T00:00:00');
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

// ── Slack ─────────────────────────────────────────────────────────────────────

function slackMilestoneLines(items) {
  return items.map(m =>
    `• *${m.clientName}* — ${m.label} — ${fmtDate(m.date)} _[${urgencyLabel(m.days)}]_`
  ).join('\n');
}

async function sendSlack(webhookUrl, dateHeading, overdue, thisWeek, comingUp) {
  const blocks = [
    {
      type: 'header',
      text: { type: 'plain_text', text: '📅 Daily Date Digest', emoji: true },
    },
    {
      type: 'context',
      elements: [{ type: 'mrkdwn', text: dateHeading }],
    },
  ];

  if (overdue.length) {
    blocks.push({ type: 'divider' });
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `🚨 *ACTION REQUIRED — Overdue*\n${slackMilestoneLines(overdue)}`,
      },
    });
  }

  if (thisWeek.length) {
    blocks.push({ type: 'divider' });
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `📍 *This Week*\n${slackMilestoneLines(thisWeek)}`,
      },
    });
  }

  if (comingUp.length) {
    blocks.push({ type: 'divider' });
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `📋 *Coming Up (8–14 days)*\n${slackMilestoneLines(comingUp)}`,
      },
    });
  }

  const total = overdue.length + thisWeek.length + comingUp.length;
  const clientCount = new Set([...overdue, ...thisWeek, ...comingUp].map(m => m.clientId)).size;
  blocks.push({ type: 'divider' });
  blocks.push({
    type: 'context',
    elements: [{
      type: 'mrkdwn',
      text: `${total} active date${total !== 1 ? 's' : ''} across ${clientCount} client${clientCount !== 1 ? 's' : ''}`,
    }],
  });

  const fallbackText = [
    overdue.length  ? `🚨 ${overdue.length} overdue`         : null,
    thisWeek.length ? `📍 ${thisWeek.length} this week`       : null,
    comingUp.length ? `📋 ${comingUp.length} coming up`       : null,
  ].filter(Boolean).join(' · ');

  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: `Daily Date Digest — ${fallbackText}`, blocks }),
  });
}

// ── Email ─────────────────────────────────────────────────────────────────────

function urgencyChipColor(days) {
  if (days < 0)  return { bg: 'rgba(220,80,80,0.15)',  border: 'rgba(220,80,80,0.4)',  text: '#e07070' };
  if (days === 0) return { bg: 'rgba(220,80,80,0.1)',   border: 'rgba(220,80,80,0.3)',  text: '#e07070' };
  if (days <= 3)  return { bg: 'rgba(232,168,124,0.15)', border: 'rgba(232,168,124,0.4)', text: '#e8a87c' };
  if (days <= 7)  return { bg: 'rgba(240,192,96,0.12)', border: 'rgba(240,192,96,0.35)', text: '#d4aa50' };
  return               { bg: 'rgba(109,191,123,0.12)', border: 'rgba(109,191,123,0.3)', text: '#6dbf7b' };
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

function buildEmail(dateHeading, overdue, thisWeek, comingUp) {
  const total = overdue.length + thisWeek.length + comingUp.length;
  const clientCount = new Set([...overdue, ...thisWeek, ...comingUp].map(m => m.clientId)).size;

  const overdueWarning = overdue.length ? `
  <div style="background:rgba(220,80,80,0.08);border:1px solid rgba(220,80,80,0.25);border-radius:10px;padding:12px 18px;margin-bottom:8px;">
    <p style="font-size:13.5px;font-weight:500;color:#e07070;margin:0;">⚠️ ${overdue.length} overdue date${overdue.length !== 1 ? 's' : ''} — action required</p>
  </div>` : '';

  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Daily Date Digest — Fairway</title>
<style>@media only screen and (max-width:600px){.ew{padding:28px 20px!important;border-radius:14px!important;} td{display:block!important;text-align:left!important;padding:8px 16px!important;}}</style>
</head>
<body style="margin:0;padding:0;background:#181614;font-family:Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#181614"><tr><td align="center" style="padding:40px 16px;">
<table width="580" cellpadding="0" cellspacing="0" border="0" style="max-width:580px;width:100%;">
  <tr><td class="ew" style="background:#1C1815;border-radius:20px;border:1px solid rgba(181,113,90,0.2);padding:36px 40px;">
    <p style="margin:0 0 28px;padding-bottom:24px;border-bottom:1px solid rgba(250,246,241,0.08);display:flex;align-items:center;gap:10px;">
      <img src="https://fairwayinvesting.com.au/logo-icon.png" width="26" height="26" alt="" style="display:inline-block;border:0;vertical-align:middle;margin-right:8px;">
      <img src="https://fairwayinvesting.com.au/logo-word.png" width="140" height="21" alt="Fairway Investing" style="display:inline-block;border:0;vertical-align:middle;">
    </p>

    <p style="font-size:11px;font-weight:600;letter-spacing:0.2em;text-transform:uppercase;color:#B5715A;margin:0 0 6px;">Daily digest</p>
    <h1 style="font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:400;color:#FAF6F1;margin:0 0 4px;line-height:1.2;">Upcoming dates</h1>
    <p style="font-size:13px;color:rgba(250,246,241,0.35);margin:0 0 20px;">${dateHeading} &nbsp;·&nbsp; ${total} date${total !== 1 ? 's' : ''} across ${clientCount} client${clientCount !== 1 ? 's' : ''}</p>

    ${overdueWarning}
    ${emailSection('Action Required — Overdue', '🚨', overdue)}
    ${emailSection('This Week', '📍', thisWeek)}
    ${emailSection('Coming Up (8–14 days)', '📋', comingUp)}

    <p style="font-size:12px;color:rgba(250,246,241,0.2);margin:24px 0 0;line-height:1.6;">Emails are sent at the 10, 5, 3 and 1-day marks, plus immediately for any overdue dates. Log in to the <a href="https://fairwayinvesting.com.au/admin/" style="color:#B5715A;text-decoration:none;">admin portal</a> to manage dates.</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}

// ── Scheduled handler ─────────────────────────────────────────────────────────

export default async () => {
  const [allMilestones, activeClientIds] = await Promise.all([getAllMilestones(), getActiveClientIds()]);
  const active = allMilestones
    .filter(m => !m.completed && activeClientIds.has(m.clientId))
    .map(m => ({ ...m, days: daysUntil(m.date) }));

  const overdue   = active.filter(m => m.days < 0)               .sort((a, b) => a.days - b.days);
  const thisWeek  = active.filter(m => m.days >= 0 && m.days <= 7) .sort((a, b) => a.days - b.days);
  const comingUp  = active.filter(m => m.days > 7 && m.days <= 14) .sort((a, b) => a.days - b.days);

  if (!overdue.length && !thisWeek.length && !comingUp.length) {
    console.log('date-reminders: no upcoming dates in 14-day window — skipping');
    return;
  }

  const dateHeading = new Date().toLocaleDateString('en-AU', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Australia/Sydney',
  });

  const errors = [];

  // ── Slack: daily digest of everything in 14-day window ────────────────────
  const slackUrl = process.env.SLACK_WEBHOOK_URL;
  if (slackUrl) {
    try {
      await sendSlack(slackUrl, dateHeading, overdue, thisWeek, comingUp);
      console.log('date-reminders: Slack sent');
    } catch (err) {
      errors.push(`Slack: ${err.message}`);
      console.error('date-reminders: Slack failed', err.message);
    }
  } else {
    console.warn('date-reminders: SLACK_WEBHOOK_URL not set — skipping Slack');
  }

  // ── Email: only on trigger days (10, 5, 3, 1) or when overdue ────────────
  // Overdue milestones always trigger an email — a missed date needs immediate attention.
  const EMAIL_TRIGGER_DAYS = [10, 5, 3, 1];
  const emailTriggers = active.filter(m => m.days < 0 || EMAIL_TRIGGER_DAYS.includes(m.days));

  if (emailTriggers.length) {
    try {
      const triggerDaysList = [...new Set(emailTriggers.map(m => m.days < 0 ? 'overdue' : `${m.days}d`))].join(', ');
      const subject = overdue.length
        ? `⚠️ ${overdue.length} overdue date${overdue.length !== 1 ? 's' : ''} — Fairway`
        : `📅 Date reminder (${triggerDaysList}) — Fairway`;

      await resend.emails.send({
        from: 'Fairway Digest <info@fairwayinvesting.com.au>',
        to: ['luke@fairwayinvesting.com.au'],
        subject,
        html: buildEmail(dateHeading, overdue, thisWeek, comingUp),
      });
      console.log(`date-reminders: email sent — triggers: ${triggerDaysList}`);
    } catch (err) {
      errors.push(`Email: ${err.message}`);
      console.error('date-reminders: email failed', err.message);
    }
  } else {
    console.log('date-reminders: no email triggers today — skipping email');
  }

  if (errors.length) {
    throw new Error(`date-reminders completed with errors: ${errors.join('; ')}`);
  }
};

export const config = {
  schedule: '0 22 * * *', // 10 PM UTC = 8 AM AEST (9 AM AEDT during daylight saving)
};
