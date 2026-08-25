import { getStore } from '@netlify/blobs';

// Cron: 10pm UTC daily = 8am AEST (UTC+10)
export const config = { schedule: '0 22 * * *' };

const MILESTONE_LABELS = {
  finance:                   'Subject to Finance',
  building_pest:             'Building & Pest',
  bp_inspection:             'B&P Inspection Date',
  contracts:                 'Contracts Exchanged',
  cooling_off:               'Cooling Off End',
  pre_settlement_inspection: 'Pre-Settlement Inspection',
  settlement:                'Settlement',
  preapproval:               'Pre-Approval Expiry',
  custom:                    'Custom',
};

function localDateStr(d) {
  return d.toISOString().slice(0, 10);
}

function daysFromToday(dateStr) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + 'T00:00:00');
  return Math.round((target - today) / 86400000);
}

function urgEmoji(days) {
  if (days < 0)  return '🔴'; // overdue
  if (days === 0) return '🚨'; // today
  if (days <= 3)  return '🔴';
  if (days <= 7)  return '🟠';
  return '🟡';
}

function dayLabel(days) {
  if (days < 0)  return `${Math.abs(days)}d overdue`;
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  return `In ${days}d`;
}

export default async () => {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) {
    console.error('SLACK_WEBHOOK_URL not set — skipping digest');
    return new Response('skipped', { status: 200 });
  }

  const msStore = getStore({ name: 'fairway-milestones', consistency: 'strong' });
  const clientStore = getStore({ name: 'fairway-clients', consistency: 'strong' });

  const [allMs, allClients] = await Promise.all([
    msStore.get('all', { type: 'json' }).catch(() => []),
    clientStore.get('all', { type: 'json' }).catch(() => []),
  ]);

  const milestones = Array.isArray(allMs) ? allMs : [];
  const clients = Array.isArray(allClients) ? allClients : [];

  const clientMap = {};
  clients.forEach(c => { clientMap[c.id] = c.name; });

  const today = localDateStr(new Date());

  // Include overdue + due within 14 days, not completed
  const upcoming = milestones
    .filter(m => !m.completed && m.date)
    .map(m => ({ ...m, days: daysFromToday(m.date) }))
    .filter(m => m.days <= 14)
    .sort((a, b) => a.days - b.days);

  if (!upcoming.length) {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: '☀️ *Fairway morning briefing* — No upcoming dates in the next 14 days. All clear.' }),
    });
    return new Response('ok', { status: 200 });
  }

  const overdue  = upcoming.filter(m => m.days < 0);
  const todayMs  = upcoming.filter(m => m.days === 0);
  const soon     = upcoming.filter(m => m.days > 0 && m.days <= 3);
  const later    = upcoming.filter(m => m.days > 3 && m.days <= 14);

  const fmtRow = m => {
    const clientName = clientMap[m.clientId] || 'Unknown client';
    const label = m.label || MILESTONE_LABELS[m.type] || m.type || 'Milestone';
    return `${urgEmoji(m.days)} *${clientName}* — ${label} · ${dayLabel(m.days)}`;
  };

  const sections = [];

  if (overdue.length) {
    sections.push({ type: 'section', text: { type: 'mrkdwn', text: `*🔴 Overdue (${overdue.length})*\n` + overdue.map(fmtRow).join('\n') } });
  }
  if (todayMs.length) {
    sections.push({ type: 'section', text: { type: 'mrkdwn', text: `*🚨 Due today (${todayMs.length})*\n` + todayMs.map(fmtRow).join('\n') } });
  }
  if (soon.length) {
    sections.push({ type: 'section', text: { type: 'mrkdwn', text: `*🟠 Due in 1–3 days (${soon.length})*\n` + soon.map(fmtRow).join('\n') } });
  }
  if (later.length) {
    sections.push({ type: 'section', text: { type: 'mrkdwn', text: `*🟡 Due in 4–14 days (${later.length})*\n` + later.map(fmtRow).join('\n') } });
  }

  const totalLabel = `${upcoming.length} date${upcoming.length !== 1 ? 's' : ''} requiring attention`;
  const payload = {
    blocks: [
      { type: 'header', text: { type: 'plain_text', text: '☀️ Fairway — Morning Briefing' } },
      { type: 'context', elements: [{ type: 'mrkdwn', text: `${today} · ${totalLabel}` }] },
      { type: 'divider' },
      ...sections,
      { type: 'divider' },
      { type: 'context', elements: [{ type: 'mrkdwn', text: '<https://fairwayinvesting.com.au/admin/|Open admin portal>' }] },
    ],
  };

  const r = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  console.log('Slack digest sent:', r.status, `(${upcoming.length} milestones)`);
  return new Response('ok', { status: 200 });
};
