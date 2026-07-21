// Runs Sunday 10 PM UTC = Monday 8 AM AEST (9 AM AEDT during daylight saving).
// Posts a weekly pipeline snapshot to SLACK_WEBHOOK_URL.

import { getStore } from '@netlify/blobs';

function todayAU() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Australia/Sydney' });
}

function daysFromDate(dateStr, fromStr) {
  const a = new Date(fromStr + 'T00:00:00');
  const b = new Date(dateStr + 'T00:00:00');
  return Math.round((b - a) / 86400000);
}

async function getAllMilestones() {
  const store = getStore('fairway-milestones');
  const { blobs } = await store.list().catch(() => ({ blobs: [] }));
  const arrays = await Promise.all(
    blobs.filter(b => b.key !== 'all').map(b => store.get(b.key, { type: 'json' }).catch(() => []))
  );
  return arrays.flat();
}

const STAGE_LABELS = {
  onboarding:     'Onboarding',
  searching:      'Searching',
  under_contract: 'Under Contract',
  exchanged:      'Unconditional',
  settlement:     'Settled',
};
const STAGE_ORDER = ['onboarding', 'searching', 'under_contract', 'exchanged', 'settlement'];

export default async () => {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn('weekly-summary: SLACK_WEBHOOK_URL not set — skipping');
    return;
  }

  const clientStore = getStore('fairway-clients');
  const allClients = (await clientStore.get('all', { type: 'json' }).catch(() => null)) || [];
  const active = allClients.filter(c => !c.deleted && c.active && (c.status || 'active') !== 'completed');

  if (!active.length) {
    console.log('weekly-summary: no active clients');
    return;
  }

  // Pipeline breakdown
  const stageCounts = {};
  for (const c of active) {
    const stage = c.pipelineStage || 'onboarding';
    stageCounts[stage] = (stageCounts[stage] || 0) + 1;
  }

  const pipelineLines = STAGE_ORDER
    .filter(s => stageCounts[s])
    .map(s => `• *${STAGE_LABELS[s]}:* ${stageCounts[s]}`);

  // Upcoming dates in next 14 days
  const today = todayAU();
  const activeIds = new Set(active.map(c => c.id));
  const allMs = await getAllMilestones();
  const upcoming = allMs
    .filter(m => !m.completed && activeIds.has(m.clientId))
    .map(m => ({ ...m, days: daysFromDate(m.date, today) }))
    .filter(m => m.days >= 0 && m.days <= 14)
    .sort((a, b) => a.days - b.days);

  // Clients needing attention: under_contract or exchanged
  const needsAttention = active.filter(c => c.pipelineStage === 'under_contract' || c.pipelineStage === 'exchanged');

  const today_au = new Date(today + 'T12:00:00+10:00').toLocaleDateString('en-AU', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  const blocks = [
    {
      type: 'header',
      text: { type: 'plain_text', text: '📊 Weekly Pipeline Summary', emoji: true },
    },
    {
      type: 'context',
      elements: [{ type: 'mrkdwn', text: `${today_au} &nbsp;·&nbsp; ${active.length} active client${active.length !== 1 ? 's' : ''}` }],
    },
    { type: 'divider' },
    {
      type: 'section',
      text: { type: 'mrkdwn', text: `*Pipeline*\n${pipelineLines.join('\n') || '—'}` },
    },
  ];

  if (needsAttention.length) {
    blocks.push({ type: 'divider' });
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Needs attention*\n${needsAttention.map(c => {
          const stageLabel = STAGE_LABELS[c.pipelineStage] || c.pipelineStage;
          return `• *${c.name}* — ${stageLabel}`;
        }).join('\n')}`,
      },
    });
  }

  if (upcoming.length) {
    blocks.push({ type: 'divider' });
    const dateLines = upcoming.slice(0, 8).map(m => {
      const label = m.days === 0 ? 'today' : m.days === 1 ? 'tomorrow' : `in ${m.days} days`;
      return `• *${m.clientName}* — ${m.label} (${label})`;
    });
    if (upcoming.length > 8) dateLines.push(`_…and ${upcoming.length - 8} more_`);
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: `*Upcoming dates (14 days)*\n${dateLines.join('\n')}` },
    });
  } else {
    blocks.push({ type: 'divider' });
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: '_No dates in the next 14 days_' },
    });
  }

  blocks.push({ type: 'divider' });
  blocks.push({
    type: 'context',
    elements: [{ type: 'mrkdwn', text: '<https://fairwayinvesting.com.au/admin/|Open admin portal>' }],
  });

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: `Weekly summary — ${active.length} active clients`, blocks }),
    });
    console.log('weekly-summary: posted to Slack');
  } catch (err) {
    console.error('weekly-summary: Slack post failed:', err?.message || err);
  }
};

export const config = {
  schedule: '0 22 * * 0', // Sunday 10 PM UTC = Monday 8 AM AEST
};
