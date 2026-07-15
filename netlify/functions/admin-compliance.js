import { getStore } from '@netlify/blobs';
import crypto from 'crypto';

function checkAdmin(req) {
  const auth = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  return auth === process.env.ADMIN_PASSWORD;
}

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

const defaultData = () => ({
  items: [],
  cpd: { year: new Date().getFullYear(), required: 12, completed: 0 },
});

export default async (req) => {
  if (!checkAdmin(req)) return json({ error: 'Unauthorized' }, 401);

  const store = getStore('fairway-compliance');
  const data = (await store.get('data', { type: 'json' }).catch(() => null)) || defaultData();

  if (req.method === 'GET') return json(data);

  if (req.method === 'PUT') {
    const body = await req.json().catch(() => ({}));
    if (body.items !== undefined) data.items = body.items;
    if (body.cpd  !== undefined) data.cpd  = { ...data.cpd, ...body.cpd };
    await store.setJSON('data', data);
    return json({ ok: true, data });
  }

  return new Response('Method Not Allowed', { status: 405 });
};

export const config = { path: '/api/admin/compliance', method: ['GET', 'PUT'] };
