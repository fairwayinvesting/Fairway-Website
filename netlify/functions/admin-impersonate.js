import { getStore } from '@netlify/blobs';
import crypto from 'crypto';

function checkAdmin(req) {
  const auth = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  return auth === process.env.ADMIN_PASSWORD;
}

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

export default async (req) => {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
  if (!checkAdmin(req)) return json({ error: 'Unauthorized' }, 401);

  const { clientId } = await req.json().catch(() => ({}));
  if (!clientId) return json({ error: 'clientId required' }, 400);

  const store = getStore('fairway-clients');
  const clients = (await store.get('all', { type: 'json' })) || [];
  const client = clients.find(c => c.id === clientId);
  if (!client) return json({ error: 'Client not found' }, 404);
  if (!client.active) return json({ error: 'Client is inactive' }, 400);

  const ts = Date.now().toString(36);
  const key = (process.env.ADMIN_PASSWORD || '') + ':preview:' + (process.env.JWT_SECRET || '');
  const sig = crypto.createHmac('sha256', key).update(clientId + '.' + ts).digest('hex').slice(0, 40);
  const token = `cp.${clientId}.${ts}.${sig}`;

  return json({ url: `/api/client-preview?t=${token}` });
};

export const config = { path: '/api/admin/impersonate', method: ['POST'] };
