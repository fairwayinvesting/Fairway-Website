import { getStore } from '@netlify/blobs';
import crypto from 'crypto';
import { checkAdmin } from './_admin-auth.js';

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

const VALID_URGENCY = ['high', 'medium', 'low'];
const VALID_DOMAINS = ['health', 'business'];
const VALID_STREAMS = ['fitness', 'luna', 'self', 'clients', 'prospecting', 'content'];
const VALID_RECURRENCE = ['none', 'daily', 'weekdays', 'custom_days'];

export default async (req) => {
  if (!(await checkAdmin(req))) return json({ error: 'Unauthorized' }, 401);

  const store = getStore({ name: 'fairway-tasks', consistency: 'strong' });
  const load = async () => (await store.get('all', { type: 'json' }).catch(() => null)) || [];
  const save = async (list) => store.set('all', JSON.stringify(list));

  if (req.method === 'GET') {
    return json(await load());
  }

  if (req.method === 'POST') {
    let body;
    try { body = await req.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
    const { title, urgency, dueDate, domain, stream, recurrence, recurrenceDays, recurrenceTime, scheduledTime } = body;
    if (!title?.trim()) return json({ error: 'title required' }, 400);
    const list = await load();
    const item = {
      id: crypto.randomUUID(),
      title: title.trim(),
      urgency: VALID_URGENCY.includes(urgency) ? urgency : 'medium',
      dueDate: dueDate || new Date().toISOString().slice(0, 10),
      completedAt: null,
      deletedAt: null,
      createdAt: new Date().toISOString(),
      domain: VALID_DOMAINS.includes(domain) ? domain : 'business',
      stream: VALID_STREAMS.includes(stream) ? stream : 'clients',
      recurrence: VALID_RECURRENCE.includes(recurrence) ? recurrence : 'none',
      recurrenceDays: Array.isArray(recurrenceDays) ? recurrenceDays.filter(d => Number.isInteger(d) && d >= 0 && d <= 6) : [],
      recurrenceTime: recurrenceTime || null,
      scheduledTime: scheduledTime || null,
      completedOn: [],
    };
    list.push(item);
    await save(list);
    return json(item, 201);
  }

  if (req.method === 'PUT') {
    let body;
    try { body = await req.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
    const { id } = body;
    if (!id) return json({ error: 'id required' }, 400);
    const list = await load();
    const idx = list.findIndex(t => t.id === id);
    if (idx === -1) return json({ error: 'Not found' }, 404);

    if ('completedAt' in body) list[idx].completedAt = body.completedAt;
    if (body.title !== undefined) list[idx].title = body.title.trim();
    if (body.urgency !== undefined && VALID_URGENCY.includes(body.urgency)) list[idx].urgency = body.urgency;
    if (body.dueDate !== undefined) list[idx].dueDate = body.dueDate;
    if (body.domain !== undefined && VALID_DOMAINS.includes(body.domain)) list[idx].domain = body.domain;
    if (body.stream !== undefined && VALID_STREAMS.includes(body.stream)) list[idx].stream = body.stream;
    if (body.recurrence !== undefined && VALID_RECURRENCE.includes(body.recurrence)) list[idx].recurrence = body.recurrence;
    if (body.recurrenceDays !== undefined && Array.isArray(body.recurrenceDays)) {
      list[idx].recurrenceDays = body.recurrenceDays.filter(d => Number.isInteger(d) && d >= 0 && d <= 6);
    }
    if (body.recurrenceTime !== undefined) list[idx].recurrenceTime = body.recurrenceTime || null;
    if (body.scheduledTime !== undefined) list[idx].scheduledTime = body.scheduledTime || null;

    // Append a completed date for a recurring task check-off
    if (body.completedOnDate) {
      const date = body.completedOnDate;
      if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        if (!Array.isArray(list[idx].completedOn)) list[idx].completedOn = [];
        if (!list[idx].completedOn.includes(date)) list[idx].completedOn.push(date);
      }
    }

    // Remove a completed date (uncheck a recurring task)
    if (body.removeCompletedOnDate) {
      const date = body.removeCompletedOnDate;
      if (Array.isArray(list[idx].completedOn)) {
        list[idx].completedOn = list[idx].completedOn.filter(d => d !== date);
      }
    }

    await save(list);
    return json(list[idx]);
  }

  if (req.method === 'DELETE') {
    const id = new URL(req.url).searchParams.get('id');
    if (!id) return json({ error: 'id required' }, 400);
    const list = await load();
    const idx = list.findIndex(t => t.id === id);
    if (idx === -1) return json({ error: 'Not found' }, 404);
    list[idx].deletedAt = new Date().toISOString();
    await save(list);
    return json({ ok: true });
  }

  return json({ error: 'Method not allowed' }, 405);
};

export const config = {
  path: '/api/admin/tasks',
  method: ['GET', 'POST', 'PUT', 'DELETE'],
};
