// Runs daily at 10 PM UTC = 8 AM AEST (9 AM AEDT during daylight saving).
// Checks all active clients' questionnaire data for upcoming birthdays (within 7 days)
// and sends a digest to SLACK_BIRTHDAY_WEBHOOK_URL.

import { getStore } from '@netlify/blobs';

// ── Helpers ───────────────────────────────────────────────────────────────────

function blobKey(email) {
  return (email || '').toLowerCase().replace(/[^a-z0-9]/g, '-');
}

// Returns today's date string (YYYY-MM-DD) in Sydney time.
function todayAU() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Australia/Sydney' });
}

// Given a DOB string (YYYY-MM-DD), returns how many days until the next birthday
// from todayStr (YYYY-MM-DD). Returns 0 on the birthday, negative if already passed
// this year (next occurrence is next year — we ignore those for the 7-day window).
function daysUntilBirthday(dob, todayStr) {
  if (!dob || !dob.match(/^\d{4}-\d{2}-\d{2}$/)) return null;
  const [, mm, dd] = dob.split('-');
  const [yr] = todayStr.split('-');
  const thisYear = new Date(`${yr}-${mm}-${dd}T00:00:00`);
  const today    = new Date(`${todayStr}T00:00:00`);
  let days = Math.round((thisYear - today) / 86400000);
  // If birthday already passed this year, check next year
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

// ── Slack ─────────────────────────────────────────────────────────────────────

async function sendSlack(webhookUrl, items, dateHeading) {
  const blocks = [
    {
      type: 'header',
      text: { type: 'plain_text', text: '🎂 Birthday Reminders', emoji: true },
    },
    {
      type: 'context',
      elements: [{ type: 'mrkdwn', text: dateHeading }],
    },
    { type: 'divider' },
  ];

  const todayItems  = items.filter(i => i.days === 0);
  const soonItems   = items.filter(i => i.days > 0 && i.days <= 2);
  const upcomingItems = items.filter(i => i.days > 2);

  if (todayItems.length) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `🎂 *Today*\n${todayItems.map(i => `• ${i.line}`).join('\n')}`,
      },
    });
    blocks.push({ type: 'divider' });
  }

  if (soonItems.length) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `📍 *This week*\n${soonItems.map(i => `• ${i.line}`).join('\n')}`,
      },
    });
    blocks.push({ type: 'divider' });
  }

  if (upcomingItems.length) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `📋 *Coming up*\n${upcomingItems.map(i => `• ${i.line}`).join('\n')}`,
      },
    });
    blocks.push({ type: 'divider' });
  }

  blocks.push({
    type: 'context',
    elements: [{
      type: 'mrkdwn',
      text: `${items.length} birthday${items.length !== 1 ? 's' : ''} in the next 7 days`,
    }],
  });

  const fallback = items.map(i => i.line).join(' · ');
  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: `Birthday Reminders — ${fallback}`, blocks }),
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default async () => {
  const slackUrl = process.env.SLACK_BIRTHDAY_WEBHOOK_URL;
  if (!slackUrl) {
    console.warn('birthday-reminders: SLACK_BIRTHDAY_WEBHOOK_URL not set — skipping');
    return;
  }

  const today = todayAU();
  const dateHeading = new Date(today + 'T12:00:00Z').toLocaleDateString('en-AU', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  // Load all active clients
  const clientStore = getStore('fairway-clients');
  const allClients  = (await clientStore.get('all', { type: 'json' }).catch(() => null)) || [];
  const active = allClients.filter(c => !c.deleted && (c.status || 'active') !== 'completed');

  if (!active.length) return;

  // For each active client, load their questionnaire
  const qStore = getStore('fairway-questionnaires');
  const items = [];
  const seen = new Set(); // deduplicate by name:dob in case of duplicate client records

  await Promise.all(active.map(async (client) => {
    let q = null;
    try {
      q = await qStore.get(blobKey(client.email), { type: 'json' });
    } catch { return; }
    if (!q) return;

    // Client birthday
    if (q.dob) {
      const days = daysUntilBirthday(q.dob, today);
      if (days !== null && days >= 0 && days <= 3) {
        const name = [q.firstName || client.name.split(' ')[0], q.lastName || ''].join(' ').trim();
        const key = `${name}:${q.dob}`;
        if (!seen.has(key)) {
          seen.add(key);
          items.push({ days, line: `${dayLabel(days)} — *${name}* (client) — ${fmtDob(q.dob)}` });
        }
      }
    }

    // Partner birthday
    if (q.coInvestor === 'Yes' && q.p2Dob) {
      const days = daysUntilBirthday(q.p2Dob, today);
      if (days !== null && days >= 0 && days <= 3) {
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
    console.log('birthday-reminders: no birthdays in next 7 days');
    return;
  }

  // Sort: today first, then by days ascending
  items.sort((a, b) => a.days - b.days);

  try {
    await sendSlack(slackUrl, items, dateHeading);
    console.log(`birthday-reminders: sent ${items.length} item(s) to Slack`);
  } catch (err) {
    console.error('birthday-reminders: Slack send failed:', err?.message || err);
  }
};

export const config = {
  schedule: '0 22 * * *', // 10 PM UTC = 8 AM AEST daily
};
