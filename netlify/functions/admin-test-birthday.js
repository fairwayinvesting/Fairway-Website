// Manual trigger for birthday-reminders — lets you fire a test from the admin portal.
// Supports ?window=N to widen the birthday match (default 3, use 365 to catch everyone).

import { getStore } from '@netlify/blobs';
import { checkAdmin } from './_admin-auth.js';

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

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

function dayLabel(days) {
  if (days === 0) return '🎂 *Today!*';
  if (days === 1) return '🎂 *Tomorrow*';
  return `🎁 *In ${days} days*`;
}

async function sendSlack(webhookUrl, items, dateHeading, isTest) {
  const blocks = [
    {
      type: 'header',
      text: { type: 'plain_text', text: isTest ? '🧪 Birthday Reminders (TEST)' : '🎂 Birthday Reminders', emoji: true },
    },
    {
      type: 'context',
      elements: [{ type: 'mrkdwn', text: isTest ? `${dateHeading} — *This is a test run*` : dateHeading }],
    },
    { type: 'divider' },
  ];

  const todayItems    = items.filter(i => i.days === 0);
  const soonItems     = items.filter(i => i.days > 0 && i.days <= 2);
  const upcomingItems = items.filter(i => i.days > 2);

  if (todayItems.length) {
    blocks.push({ type: 'section', text: { type: 'mrkdwn', text: `🎂 *Today*\n${todayItems.map(i => `• ${i.line}`).join('\n')}` } });
    blocks.push({ type: 'divider' });
  }
  if (soonItems.length) {
    blocks.push({ type: 'section', text: { type: 'mrkdwn', text: `📍 *This week*\n${soonItems.map(i => `• ${i.line}`).join('\n')}` } });
    blocks.push({ type: 'divider' });
  }
  if (upcomingItems.length) {
    blocks.push({ type: 'section', text: { type: 'mrkdwn', text: `📋 *Coming up*\n${upcomingItems.map(i => `• ${i.line}`).join('\n')}` } });
    blocks.push({ type: 'divider' });
  }

  blocks.push({
    type: 'context',
    elements: [{ type: 'mrkdwn', text: `${items.length} birthday${items.length !== 1 ? 's' : ''} found` }],
  });

  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: `Birthday Reminders${isTest ? ' (TEST)' : ''} — ${items.map(i => i.line).join(' · ')}`, blocks }),
  });
}

export default async (req) => {
  if (!(await checkAdmin(req))) return json({ error: 'Unauthorized' }, 401);

  const slackUrl = process.env.SLACK_BIRTHDAY_WEBHOOK_URL;
  if (!slackUrl) return json({ error: 'SLACK_BIRTHDAY_WEBHOOK_URL not set in environment variables' }, 500);

  const url = new URL(req.url);
  const windowDays = parseInt(url.searchParams.get('window') || '365', 10); // default wide open for testing

  const today = todayAU();
  const dateHeading = new Date(today + 'T12:00:00Z').toLocaleDateString('en-AU', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  const clientStore = getStore('fairway-clients');
  const allClients  = (await clientStore.get('all', { type: 'json' }).catch(() => null)) || [];
  const active = allClients.filter(c => !c.deleted && (c.status || 'active') !== 'completed');

  if (!active.length) return json({ ok: true, sent: false, reason: 'No active clients' });

  const qStore = getStore('fairway-questionnaires');
  const items = [];
  const seen = new Set();

  await Promise.all(active.map(async (client) => {
    let q = null;
    try { q = await qStore.get(blobKey(client.email), { type: 'json' }); } catch { return; }
    if (!q) return;

    if (q.dob) {
      const days = daysUntilBirthday(q.dob, today);
      if (days !== null && days >= 0 && days <= windowDays) {
        const name = [q.firstName || client.name.split(' ')[0], q.lastName || ''].join(' ').trim();
        const key = `${name}:${q.dob}`;
        if (!seen.has(key)) {
          seen.add(key);
          items.push({ days, line: `${dayLabel(days)} — *${name}* (client) — ${fmtDob(q.dob)}` });
        }
      }
    }

    if (q.coInvestor === 'Yes' && q.p2Dob) {
      const days = daysUntilBirthday(q.p2Dob, today);
      if (days !== null && days >= 0 && days <= windowDays) {
        const partnerName = [q.p2FirstName, q.p2LastName].filter(Boolean).join(' ') || 'Partner';
        const key = `${partnerName}:${q.p2Dob}`;
        if (!seen.has(key)) {
          seen.add(key);
          const clientFirst = q.firstName || client.name.split(' ')[0];
          const relationship = q.p2Relationship || 'partner';
          items.push({ days, line: `${dayLabel(days)} — *${partnerName}* (${relationship.toLowerCase()} of ${clientFirst}) — ${fmtDob(q.p2Dob)}` });
        }
      }
    }
  }));

  if (!items.length) {
    return json({ ok: true, sent: false, reason: `No birthdays found within ${windowDays} days. Check that clients have submitted a questionnaire with a date of birth filled in.` });
  }

  items.sort((a, b) => a.days - b.days);

  try {
    await sendSlack(slackUrl, items, dateHeading, true);
    return json({ ok: true, sent: true, count: items.length, items: items.map(i => ({ days: i.days, text: i.line.replace(/\*/g, '') })) });
  } catch (err) {
    return json({ error: 'Slack send failed: ' + (err?.message || String(err)) }, 500);
  }
};

export const config = { path: '/api/admin/test-birthday', method: ['GET'] };
