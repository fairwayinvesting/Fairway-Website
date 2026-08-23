import { getStore } from '@netlify/blobs';
import crypto from 'crypto';
import { getStaffPayload, hasModule } from './_staff-auth.js';

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

const VALID_URGENCY = ['high', 'medium', 'low'];

export default async (req) => {
  const payload = await getStaffPayload(req);
  if (!payload) return json({ error: 'Unauthorized' }, 401);
  if (!hasModule(payload, 'tasks')) return json({ error: 'Access denied' }, 403);

  const store = getStore({ name: 'fairway-staff-tasks', consistency: 'strong' });
  const load = async () => (await store.get('all', { type: 'json' }).catch(() => null)) || [];
  const save = async (list) => store.set('all', JSON.stringify(list));

  if (req.method === 'GET') {
    const all = await load();
    // Return own tasks + tasks assigned to this contractor
    const mine = all.filter(t =>
      !t.deletedAt && (t.ownerId === payload.userId || t.assignedTo === payload.userId)
    );
    return json(mine);
  }

  if (req.method === 'POST') {
    const body = await req.json().catch(() => ({}));
    const { title, urgency, dueDate, notes } = body;
    if (!title?.trim()) return json({ error: 'title required' }, 400);
    const all = await load();
    const task = {
      id:          crypto.randomUUID(),
      title:       title.trim(),
      urgency:     VALID_URGENCY.includes(urgency) ? urgency : 'medium',
      dueDate:     dueDate || new Date().toISOString().slice(0, 10),
      notes:       notes?.trim() || '',
      completedAt: null,
      deletedAt:   null,
      createdAt:   new Date().toISOString(),
      ownerId:     payload.userId,
      ownerName:   payload.name,
      assignedTo:  null,
      assignedByAdmin: false,
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
    // Contractor can toggle completion on own or assigned tasks
    // But can only edit title/urgency/date on own tasks
    const isOwn = t.ownerId === payload.userId;
    const isAssigned = t.assignedTo === payload.userId;
    if (!isOwn && !isAssigned) return json({ error: 'Access denied' }, 403);

    if ('completedAt' in body) t.completedAt = body.completedAt;
    if (isOwn) {
      if (body.title !== undefined) t.title = body.title.trim();
      if (body.urgency !== undefined && VALID_URGENCY.includes(body.urgency)) t.urgency = body.urgency;
      if (body.dueDate !== undefined) t.dueDate = body.dueDate;
      if (body.notes !== undefined) t.notes = body.notes?.trim() || '';
    }
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
    if (all[idx].ownerId !== payload.userId) return json({ error: 'Access denied' }, 403);
    all[idx].deletedAt = new Date().toISOString();
    await save(all);
    return json({ ok: true });
  }

  return new Response('Method Not Allowed', { status: 405 });
};

export const config = { path: '/api/staff/tasks', method: ['GET', 'POST', 'PUT', 'DELETE'] };
