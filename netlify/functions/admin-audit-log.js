import { getStore } from '@netlify/blobs';
import { checkAdmin } from './_admin-auth.js';

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

export default async (req) => {
  if (!checkAdmin(req)) return json({ error: 'Unauthorized' }, 401);
  const store = getStore('fairway-audit-log');
  const entries = (await store.get('entries', { type: 'json' }).catch(() => null)) || [];
  return json(entries);
};

export const config = { path: '/api/admin/audit-log', method: ['GET'] };
