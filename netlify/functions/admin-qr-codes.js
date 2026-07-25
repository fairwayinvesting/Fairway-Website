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
    const { url, note } = body;
    if (!url) return json({ error: 'url required' }, 400);
    const list = (await store.get('all', { type: 'json' }).catch(() => null)) || [];
    const item = {
      id: crypto.randomUUID(),
      url: url.trim(),
      note: note?.trim() || null,
      createdAt: new Date().toISOString(),
    };
    list.unshift(item);
    await store.set('all', JSON.stringify(list));
    return json(item, 201);
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
  method: ['GET', 'POST', 'DELETE'],
};
