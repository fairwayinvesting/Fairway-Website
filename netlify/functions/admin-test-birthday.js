// Manual trigger for birthday-reminders — fires a test message to Slack.
// Query params:
//   ?window=N   — how many days out to scan (default 365, to catch everyone)
//   ?mode=daily — simulate a daily milestone alert (only includes 0/1/3/5/7 day hits)
//   ?mode=weekly — simulate a Monday digest (all within window)
//   (default: shows all found as a digest)

import { getStore } from '@netlify/blobs';
import { checkAdmin } from './_admin-auth.js';

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

const MILESTONE_DAYS = new Set([0, 1, 3, 5, 7]);

function blobKey(email) {
  return (email || '').toLowerCase().replace(/[^a-z0-9]/g, '-');
}

function todayAU() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Australia/Sydney' });
}

function daysUntilBirthday(dob, todayStr) {
  if (!dob || !dob.match(/^\d{4}-\d{2}-\d{2}$/)) return null;
  const [, mm, dd] = dob.split('-');
  const [yr] = todayStr.split('-');
  const thisYear = new Date(`${yr}-${mm}-${dd}T00:00:00`);
  const today    = new Date(`${todayStr}T00:00:00`);
  let days = Math.round((thisYear - today) / 86400000);
  if (days < 0) {
    const nextYear = new Date(`${Number(yr) + 1}-${mm}-${dd}T00:00:00`);
    days = Math.round((nextYear - today) / 86400000);
  }
  return days;
}

function fmtDob(dob) {
  if (!dob) return '';
  const [, mm, dd] = dob.split('-');
  return new Date(`2000-${mm}-${dd}T12:00:00Z`).toLocaleDateString('en-AU', { day: 'numeric', month: 'long' });
}

async function sendMilestoneAlert(webhookUrl, items, isTest) {
  const blocks = [
    {
      type: 'header',
      text: { type: 'plain_text', text: isTest ? '🧪 Birthday Reminder (TEST)' : '🎂 Birthday Reminder', emoji: true },
    },
    { type: 'divider' },
  ];

  for (const days of [0, 1, 3, 5, 7]) {
    const group = items.filter(i => i.days === days);
    if (!group.length) continue;
    const emoji = days === 0 ? '🎂' : '🎁';
    const when  = days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `In ${days} days`;
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: `${emoji} *${when}*\n${group.map(i => `• *${i.name}* ${i.role} — ${i.dateStr}`).join('\n')}` },
    });
    blocks.push({ type: 'divider' });
  }

  if (isTest) {
    blocks.push({
      type: 'context',
      elements: [{ type: 'mrkdwn', text: `${items.length} reminder${items.length !== 1 ? 's' : ''} · *This is a test run*` }],
    });
  }

  const fallback = items.map(i => `${i.name} (${i.days === 0 ? 'today' : `in ${i.days}d`})`).join(', ');
  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: `${isTest ? '[TEST] ' : ''}Birthday reminder — ${fallback}`, blocks }),
  });
}

async function sendWeeklyDigest(webhookUrl, items, dateHeading, isTest) {
  const blocks = [
    {
      type: 'header',
      text: { type: 'plain_text', text: isTest ? '🧪 Upcoming Birthdays (TEST)' : '📅 Upcoming Birthdays — Next 2 Weeks', emoji: true },
    },
    {
      type: 'context',
      elements: [{ type: 'mrkdwn', text: isTest ? `${dateHeading} — *This is a test run*` : dateHeading }],
    },
    { type: 'divider' },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: items.map(i => {
          const when = i.days === 0 ? '_Today_' : i.days === 1 ? '_Tomorrow_' : `_${i.days} days_`;
          return `• *${i.name}* ${i.role} — ${i.dateStr} ${when}`;
        }).join('\n'),
      },
    },
    { type: 'divider' },
    {
      type: 'context',
      elements: [{
        type: 'mrkdwn',
        text: `${items.length} birthday${items.length !== 1 ? 's' : ''} found · Individual reminders fire at 7, 5, 3 and 1 day out`,
      }],
    },
  ];

  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: `${isTest ? '[TEST] ' : ''}Upcoming birthdays — ${items.length} found`, blocks }),
  });
}

export default async (req) => {
  if (!(await checkAdmin(req))) return json({ error: 'Unauthorized' }, 401);

  const slackUrl = process.env.SLACK_BIRTHDAY_WEBHOOK_URL;
  if (!slackUrl) return json({ error: 'SLACK_BIRTHDAY_WEBHOOK_URL not set in environment variables' }, 500);

  const url = new URL(req.url);
  const windowDays = parseInt(url.searchParams.get('window') || '365', 10);
  const mode = url.searchParams.get('mode') || 'weekly'; // 'daily' or 'weekly'

  const today = todayAU();
  const dateHeading = new Date(today + 'T12:00:00Z').toLocaleDateString('en-AU', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  const clientStore = getStore('fairway-clients');
  const allClients  = (await clientStore.get('all', { type: 'json' }).catch(() => null)) || [];
  const active = allClients.filter(c => !c.deleted && (c.status || 'active') !== 'completed');

  if (!active.length) return json({ ok: true, sent: false, reason: 'No active clients' });

  const qStore = getStore('fairway-questionnaires');
  const allItems = [];
  const seen = new Set();

  const addItem = (dob, name, role) => {
    const days = daysUntilBirthday(dob, today);
    if (days === null || days < 0 || days > windowDays) return;
    const key = `${name}:${dob}`;
    if (seen.has(key)) return;
    seen.add(key);
    allItems.push({ days, name, role, dateStr: fmtDob(dob) });
  };

  await Promise.all(active.map(async (client) => {
    let q = null;
    try { q = await qStore.get(blobKey(client.email), { type: 'json' }); } catch { return; }
    if (!q) return;

    if (q.dob) {
      const name = [q.firstName || client.name.split(' ')[0], q.lastName || ''].join(' ').trim();
      addItem(q.dob, name, '(client)');
    }
    if (q.coInvestor === 'Yes' && q.p2Dob) {
      const partnerName = [q.p2FirstName, q.p2LastName].filter(Boolean).join(' ') || 'Partner';
      const clientFirst = q.firstName || client.name.split(' ')[0];
      const relationship = q.p2Relationship || 'partner';
      addItem(q.p2Dob, partnerName, `(${relationship.toLowerCase()} of ${clientFirst})`);
    }
  }));

  if (!allItems.length) {
    return json({ ok: true, sent: false, reason: `No birthdays found within ${windowDays} days. Check that clients have submitted a questionnaire with a date of birth filled in.` });
  }

  allItems.sort((a, b) => a.days - b.days);

  const itemsToSend = mode === 'daily'
    ? allItems.filter(i => MILESTONE_DAYS.has(i.days))
    : allItems;

  if (!itemsToSend.length) {
    return json({ ok: true, sent: false, reason: `mode=daily: no birthdays fall on exactly 0/1/3/5/7 days within the window. Use mode=weekly or widen the window.` });
  }

  try {
    if (mode === 'daily') {
      await sendMilestoneAlert(slackUrl, itemsToSend, true);
    } else {
      await sendWeeklyDigest(slackUrl, itemsToSend, dateHeading, true);
    }
    return json({
      ok: true, sent: true, mode, count: itemsToSend.length,
      items: itemsToSend.map(i => ({ days: i.days, name: i.name, date: i.dateStr })),
    });
  } catch (err) {
    return json({ error: 'Slack send failed: ' + (err?.message || String(err)) }, 500);
  }
};

export const config = { path: '/api/admin/test-birthday', method: ['GET'] };
