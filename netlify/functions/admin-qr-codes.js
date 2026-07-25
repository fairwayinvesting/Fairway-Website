import { getStore } from '@netlify/blobs';
import crypto from 'crypto';
import { checkAdmin } from './_admin-auth.js';

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

export default async (req) => {
  if (!(await checkAdmin(req))) return json({ error: 'Unauthorized' }, 401);

  const store = getStore({ name: 'fairway-qr-codes', consistency: 'strong' });

  if (req.method === 'GET') {
    const list = (await store.get('all', { type: 'json' }).catch(() => null)) || [];
    return json(list);
  }

  if (req.method === 'POST') {
    let body;
    try { body = await req.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
    const { destinationUrl, note } = body;
    if (!destinationUrl) return json({ error: 'destinationUrl required' }, 400);
    const list = (await store.get('all', { type: 'json' }).catch(() => null)) || [];
    const item = {
      id: crypto.randomUUID(),
      destinationUrl: destinationUrl.trim(),
      note: note?.trim() || null,
      createdAt: new Date().toISOString(),
    };
    list.unshift(item);
    await store.set('all', JSON.stringify(list));
    return json(item, 201);
  }

  if (req.method === 'PUT') {
    let body;
    try { body = await req.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
    const { id, destinationUrl } = body;
    if (!id) return json({ error: 'id required' }, 400);
    if (!destinationUrl) return json({ error: 'destinationUrl required' }, 400);
    const list = (await store.get('all', { type: 'json' }).catch(() => null)) || [];
    const idx = list.findIndex(i => i.id === id);
    if (idx === -1) return json({ error: 'Not found' }, 404);
    list[idx] = { ...list[idx], destinationUrl: destinationUrl.trim(), updatedAt: new Date().toISOString() };
    await store.set('all', JSON.stringify(list));
    return json(list[idx]);
  }

  if (req.method === 'DELETE') {
    const id = new URL(req.url).searchParams.get('id');
    if (!id) return json({ error: 'id required' }, 400);
    const list = (await store.get('all', { type: 'json' }).catch(() => null)) || [];
    await store.set('all', JSON.stringify(list.filter(i => i.id !== id)));
    return json({ ok: true });
  }

  return json({ error: 'Method not allowed' }, 405);
};

export const config = {
  path: '/api/admin/qr-codes',
  method: ['GET', 'POST', 'PUT', 'DELETE'],
};
