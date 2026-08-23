import { getStore } from '@netlify/blobs';
import crypto from 'crypto';
import { checkAdmin } from './_admin-auth.js';

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

const VALID_URGENCY = ['high', 'medium', 'low'];

export default async (req) => {
  if (!(await checkAdmin(req))) return json({ error: 'Unauthorized' }, 401);

  const store = getStore({ name: 'fairway-staff-tasks', consistency: 'strong' });
  const load = async () => (await store.get('all', { type: 'json' }).catch(() => null)) || [];
  const save = async (list) => store.set('all', JSON.stringify(list));

  if (req.method === 'GET') {
    const all = await load();
    return json(all.filter(t => !t.deletedAt));
  }

  if (req.method === 'POST') {
    const body = await req.json().catch(() => ({}));
    const { title, urgency, dueDate, assignedTo, assignedToName, notes } = body;
    if (!title?.trim()) return json({ error: 'title required' }, 400);
    if (!assignedTo)    return json({ error: 'assignedTo required' }, 400);
    const all = await load();
    const task = {
      id:              crypto.randomUUID(),
      title:           title.trim(),
      urgency:         VALID_URGENCY.includes(urgency) ? urgency : 'medium',
      dueDate:         dueDate || new Date().toISOString().slice(0, 10),
      notes:           notes?.trim() || '',
      completedAt:     null,
      deletedAt:       null,
      createdAt:       new Date().toISOString(),
      ownerId:         assignedTo,
      ownerName:       assignedToName || '',
      assignedTo:      assignedTo,
      assignedToName:  assignedToName || '',
      assignedByAdmin: true,
    };
    all.push(task);
    await save(all);
    return json(task, 201);
  }

  if (req.method === 'PUT') {
    const body = await req.json().catch(() => ({}));
    const { id } = body;
    if (!id) return json({ error: 'id required' }, 400);
    const all = await load();
    const idx = all.findIndex(t => t.id === id);
    if (idx === -1) return json({ error: 'Not found' }, 404);
    const t = all[idx];
    if (body.title !== undefined)   t.title   = body.title.trim();
    if (body.urgency !== undefined && VALID_URGENCY.includes(body.urgency)) t.urgency = body.urgency;
    if (body.dueDate !== undefined) t.dueDate = body.dueDate;
    if (body.notes !== undefined)   t.notes   = body.notes?.trim() || '';
    all[idx] = t;
    await save(all);
    return json(t);
  }

  if (req.method === 'DELETE') {
    const id = new URL(req.url).searchParams.get('id');
    if (!id) return json({ error: 'id required' }, 400);
    const all = await load();
    const idx = all.findIndex(t => t.id === id);
    if (idx === -1) return json({ error: 'Not found' }, 404);
    all[idx].deletedAt = new Date().toISOString();
    await save(all);
    return json({ ok: true });
  }

  return new Response('Method Not Allowed', { status: 405 });
};

export const config = { path: '/api/admin/staff-tasks', method: ['GET', 'POST', 'PUT', 'DELETE'] };
