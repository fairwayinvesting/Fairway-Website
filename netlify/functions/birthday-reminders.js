// Runs daily at 10 PM UTC = 8 AM AEST (9 AM AEDT during daylight saving).
//
// Two notification modes:
//  1. Milestone alerts (every day) — fires when a birthday is exactly 0, 1, 3, 5, or 7 days away.
//  2. Weekly digest (Mondays only) — lists all birthdays in the next 14 days.
//
// Requires env var: SLACK_BIRTHDAY_WEBHOOK_URL

import { getStore } from '@netlify/blobs';

const MILESTONE_DAYS = new Set([0, 1, 3, 5, 7]);
const WEEKLY_LOOKAHEAD = 14;

// ── Helpers ───────────────────────────────────────────────────────────────────

function blobKey(email) {
  return (email || '').toLowerCase().replace(/[^a-z0-9]/g, '-');
}

function todayAU() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Australia/Sydney' });
}

function dayOfWeekAU() {
  return new Date().toLocaleDateString('en-AU', { timeZone: 'Australia/Sydney', weekday: 'long' });
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

// ── Slack ─────────────────────────────────────────────────────────────────────

// One combined message for all milestone hits today — sections per milestone day.
async function sendMilestoneAlert(webhookUrl, items) {
  const blocks = [
    {
      type: 'header',
      text: { type: 'plain_text', text: '🎂 Birthday Reminder', emoji: true },
    },
    { type: 'divider' },
  ];

  for (const days of [0, 1, 3, 5, 7]) {
    const group = items.filter(i => i.days === days);
    if (!group.length) continue;

    const emoji = days === 0 ? '🎂' : '🎁';
    const when  = days === 0 ? 'Today'
                : days === 1 ? 'Tomorrow'
                : `In ${days} days`;

    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `${emoji} *${when}*\n${group.map(i => `• *${i.name}* ${i.role} — ${i.dateStr}`).join('\n')}`,
      },
    });
    blocks.push({ type: 'divider' });
  }

  blocks.push({
    type: 'context',
    elements: [{ type: 'mrkdwn', text: `${items.length} birthday reminder${items.length !== 1 ? 's' : ''} today` }],
  });

  const fallback = items.map(i => `${i.name} (${i.days === 0 ? 'today' : `in ${i.days}d`})`).join(', ');
  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: `Birthday reminder — ${fallback}`, blocks }),
  });
}

// Monday digest — all birthdays in the next 14 days.
async function sendWeeklyDigest(webhookUrl, items, dateHeading) {
  const blocks = [
    {
      type: 'header',
      text: { type: 'plain_text', text: '📅 Upcoming Birthdays — Next 2 Weeks', emoji: true },
    },
    {
      type: 'context',
      elements: [{ type: 'mrkdwn', text: dateHeading }],
    },
    { type: 'divider' },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: items.map(i => {
          const when = i.days === 0 ? '_Today_'
                     : i.days === 1 ? '_Tomorrow_'
                     : `_${i.days} days_`;
          return `• *${i.name}* ${i.role} — ${i.dateStr} ${when}`;
        }).join('\n'),
      },
    },
    { type: 'divider' },
    {
      type: 'context',
      elements: [{
        type: 'mrkdwn',
        text: `${items.length} birthday${items.length !== 1 ? 's' : ''} in the next ${WEEKLY_LOOKAHEAD} days · You'll get individual reminders at 7, 5, 3, and 1 day out`,
      }],
    },
  ];

  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: `Upcoming birthdays — ${items.length} in the next ${WEEKLY_LOOKAHEAD} days`, blocks }),
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default async () => {
  const slackUrl = process.env.SLACK_BIRTHDAY_WEBHOOK_URL;
  if (!slackUrl) {
    console.warn('birthday-reminders: SLACK_BIRTHDAY_WEBHOOK_URL not set — skipping');
    return;
  }

  const today   = todayAU();
  const dayName = dayOfWeekAU();
  const dateHeading = new Date(today + 'T12:00:00Z').toLocaleDateString('en-AU', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  const clientStore = getStore('fairway-clients');
  const allClients  = (await clientStore.get('all', { type: 'json' }).catch(() => null)) || [];
  const active = allClients.filter(c => !c.deleted && (c.status || 'active') !== 'completed');
  if (!active.length) return;

  const qStore = getStore('fairway-questionnaires');
  const allItems = [];
  const seen = new Set();

  const addItem = (dob, name, role) => {
    const days = daysUntilBirthday(dob, today);
    if (days === null || days < 0 || days > WEEKLY_LOOKAHEAD) return;
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

  allItems.sort((a, b) => a.days - b.days);

  // 1. Milestone alerts — fires any day a birthday lands on exactly 0/1/3/5/7 days out
  const milestoneItems = allItems.filter(i => MILESTONE_DAYS.has(i.days));
  if (milestoneItems.length) {
    try {
      await sendMilestoneAlert(slackUrl, milestoneItems);
      console.log(`birthday-reminders: sent milestone alert for ${milestoneItems.length} item(s)`);
    } catch (err) {
      console.error('birthday-reminders: milestone alert failed:', err?.message || err);
    }
  }

  // 2. Weekly digest — Mondays only, all birthdays in next 14 days
  if (dayName === 'Monday') {
    if (allItems.length) {
      try {
        await sendWeeklyDigest(slackUrl, allItems, dateHeading);
        console.log(`birthday-reminders: sent Monday digest with ${allItems.length} item(s)`);
      } catch (err) {
        console.error('birthday-reminders: weekly digest failed:', err?.message || err);
      }
    } else {
      console.log('birthday-reminders: Monday — no birthdays in next 14 days');
    }
  }

  if (!milestoneItems.length && dayName !== 'Monday') {
    console.log('birthday-reminders: no milestone birthdays today, not Monday — nothing sent');
  }
};

export const config = {
  schedule: '0 22 * * *', // 10 PM UTC = 8 AM AEST daily
};
