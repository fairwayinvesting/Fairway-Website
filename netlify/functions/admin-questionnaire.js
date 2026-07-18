import { getStore } from '@netlify/blobs';
import { checkAdmin } from './_admin-auth.js';

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

function blobKey(email) {
  return email.toLowerCase().replace(/[^a-z0-9]/g, '-');
}

export default async (req) => {
  if (!checkAdmin(req)) return json({ error: 'Unauthorized' }, 401);

  const clientId = new URL(req.url).searchParams.get('clientId');
  if (!clientId) return json({ error: 'clientId required' }, 400);

  // Look up client email from client record
  const clientsStore = getStore('fairway-clients');
  const clients = (await clientsStore.get('all', { type: 'json' })) || [];
  const client = clients.find(c => c.id === clientId);
  if (!client) return json({ error: 'Client not found' }, 404);

  const qStore = getStore('fairway-questionnaires');
  const data = await qStore.get(blobKey(client.email), { type: 'json' }).catch(() => null);
  if (!data) return json(null);
  return json(data);
};

export const config = {
  path: '/api/admin/questionnaire',
  method: ['GET'],
};
