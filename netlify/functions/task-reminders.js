import { getStore } from '@netlify/blobs';

// Fires daily at 8 AM AEST and sends a task digest to Slack.
// Requires env var: SLACK_TASK_WEBHOOK_URL

const STREAM_LABELS = {
  fitness: 'Fitness', luna: 'Luna', self: 'Self',
  clients: 'Clients', prospecting: 'Prospecting', content: 'Content',
};

function todayAEST() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Australia/Sydney' });
}

function dayOfWeekAEST() {
  // 0=Sun 1=Mon ... 6=Sat
  return new Date().toLocaleDateString('en-US', { timeZone: 'Australia/Sydney', weekday: 'short' });
}

function dowIndex() {
  const map = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return map[dayOfWeekAEST()] ?? new Date().getDay();
}

function isWeekday() {
  const d = dowIndex();
  return d >= 1 && d <= 5;
}

function taskFiresToday(t) {
  if (t.deletedAt) return false;
  if (t.recurrence === 'none' || !t.recurrence) return false;
  if (t.recurrence === 'daily') return true;
  if (t.recurrence === 'weekdays') return isWeekday();
  if (t.recurrence === 'custom_days') {
    return Array.isArray(t.recurrenceDays) && t.recurrenceDays.includes(dowIndex());
  }
  return false;
}

function isRecurringDoneToday(t) {
  const today = todayAEST();
  return Array.isArray(t.completedOn) && t.completedOn.includes(today);
}

export default async () => {
  const webhookUrl = process.env.SLACK_TASK_WEBHOOK_URL;
  if (!webhookUrl) {
    console.error('task-reminders: SLACK_TASK_WEBHOOK_URL not set');
    return;
  }

  const store = getStore({ name: 'fairway-tasks', consistency: 'strong' });
  const tasks = (await store.get('all', { type: 'json' }).catch(() => null)) || [];
  const today = todayAEST();

  // Non-recurring tasks that are overdue or due today and not completed
  const nonRecurringDue = tasks.filter(t => {
    if (t.deletedAt || t.completedAt) return false;
    if (t.recurrence && t.recurrence !== 'none') return false;
    return t.dueDate <= today;
  });

  // Recurring tasks that fire today and haven't been checked off yet
  const recurringDue = tasks.filter(t => {
    if (t.deletedAt) return false;
    return taskFiresToday(t) && !isRecurringDoneToday(t);
  });

  const allDue = [...nonRecurringDue, ...recurringDue];
  if (!allDue.length) return;

  // Group: Health → stream, Business → stream
  const groups = {};
  allDue.forEach(t => {
    const domain = t.domain || 'business';
    const stream = t.stream || 'clients';
    const key = `${domain}:${stream}`;
    if (!groups[key]) groups[key] = { domain, stream, items: [] };
    groups[key].items.push(t);
  });

  const urgencyEmoji = { high: '🔴', medium: '🟡', low: '🟢' };
  const dayName = new Date().toLocaleDateString('en-AU', {
    timeZone: 'Australia/Sydney', weekday: 'long', day: 'numeric', month: 'long',
  });

  let text = `*Fairway — Task Digest for ${dayName}*\n\n`;

  // Health first, then Business
  ['health', 'business'].forEach(domain => {
    const domainGroups = Object.values(groups).filter(g => g.domain === domain);
    if (!domainGroups.length) return;
    text += `*${domain === 'health' ? '🏃 Health' : '💼 Business'}*\n`;
    domainGroups.forEach(g => {
      text += `  _${STREAM_LABELS[g.stream] || g.stream}_\n`;
      g.items.forEach(t => {
        const emoji = urgencyEmoji[t.urgency] || '⚪';
        const overdue = !t.recurrence || t.recurrence === 'none'
          ? (t.dueDate < today ? ` _(overdue: ${t.dueDate})_` : '')
          : '';
        const recurIcon = t.recurrence && t.recurrence !== 'none' ? ' ↻' : '';
        text += `  ${emoji} ${t.title}${recurIcon}${overdue}\n`;
      });
    });
    text += '\n';
  });

  text += `_${allDue.length} task${allDue.length !== 1 ? 's' : ''} remaining today_`;

  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  }).catch(err => console.error('task-reminders Slack send failed:', err?.message || err));
};

export const config = {
  schedule: '0 22 * * *', // 10 PM UTC = 8 AM AEST
};
