import { getStore } from '@netlify/blobs';
import crypto from 'crypto';
import { checkAdmin } from './_admin-auth.js';

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

export default async (req) => {
  if (!(await checkAdmin(req))) return json({ error: 'Unauthorized' }, 401);

  const store = getStore('fairway-referral-partners');

  if (req.method === 'GET') {
    const list = (await store.get('all', { type: 'json' })) || [];
    return json(list);
  }

  if (req.method === 'POST') {
    let body;
    try { body = await req.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
    const { name, email, phone, company, type, notes } = body;
    if (!name) return json({ error: 'Name required' }, 400);
    const list = (await store.get('all', { type: 'json' })) || [];
    const partner = {
      id: crypto.randomUUID(),
      name: name.trim(),
      email: email || null,
      phone: phone || null,
      company: company || null,
      type: type || null,
      notes: notes || null,
      createdAt: new Date().toISOString(),
    };
    list.push(partner);
    await store.setJSON('all', list);
    return json(partner, 201);
  }

  if (req.method === 'PUT') {
    let body;
    try { body = await req.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
    const { id, name, email, phone, company, type, notes } = body;
    if (!id) return json({ error: 'id required' }, 400);
    const list = (await store.get('all', { type: 'json' })) || [];
    const idx = list.findIndex(p => p.id === id);
    if (idx === -1) return json({ error: 'Not found' }, 404);
    list[idx] = {
      ...list[idx],
      name: name.trim(),
      email: email || null,
      phone: phone || null,
      company: company || null,
      type: type || null,
      notes: notes || null,
      updatedAt: new Date().toISOString(),
    };
    await store.setJSON('all', list);
    return json(list[idx]);
  }

  if (req.method === 'DELETE') {
    const id = new URL(req.url).searchParams.get('id');
    if (!id) return json({ error: 'id required' }, 400);
    const list = (await store.get('all', { type: 'json' })) || [];
    await store.setJSON('all', list.filter(p => p.id !== id));
    return json({ ok: true });
  }

  return json({ error: 'Method not allowed' }, 405);
};

export const config = {
  path: '/api/admin/referral-partners',
  method: ['GET', 'POST', 'PUT', 'DELETE'],
};
