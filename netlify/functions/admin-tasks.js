import { getStore } from '@netlify/blobs';
import crypto from 'crypto';
import { checkAdmin } from './_admin-auth.js';

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

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
    const { title, urgency, dueDate } = body;
    if (!title?.trim()) return json({ error: 'title required' }, 400);
    const list = await load();
    const item = {
      id: crypto.randomUUID(),
      title: title.trim(),
      urgency: ['high', 'medium', 'low'].includes(urgency) ? urgency : 'medium',
      dueDate: dueDate || new Date().toISOString().slice(0, 10),
      completedAt: null,
      deletedAt: null,
      createdAt: new Date().toISOString(),
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
    if (body.urgency !== undefined && ['high', 'medium', 'low'].includes(body.urgency)) list[idx].urgency = body.urgency;
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
