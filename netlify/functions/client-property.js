import { getStore } from '@netlify/blobs';
import crypto from 'crypto';

function verifyJWT(token, secret) {
  try {
    const [h, b, sig] = token.split('.');
    const expected = crypto.createHmac('sha256', secret).update(`${h}.${b}`).digest('base64url');
    if (sig !== expected) return null;
    const payload = JSON.parse(Buffer.from(b, 'base64url').toString());
    if (payload.exp && payload.exp < Date.now() / 1000) return null;
    return payload;
  } catch { return null; }
}

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

// Fields a client is permitted to update on their own purchase records
const CLIENT_EDITABLE = ['loanAmount', 'interestRate', 'loanTerm', 'loanType'];

export default async (req) => {
  const cookie = req.headers.get('cookie') || '';
  const match = cookie.match(/fw_session=([^;]+)/);
  if (!match) return json({ error: 'Not authenticated' }, 401);

  const payload = verifyJWT(match[1], process.env.JWT_SECRET);
  if (!payload) return json({ error: 'Session expired' }, 401);

  const clientsStore = getStore('fairway-clients');
  const clients = (await clientsStore.get('all', { type: 'json' })) || [];
  const client = clients.find(c => c.id === payload.sub);
  if (!client || !client.active) return json({ error: 'Account not found' }, 401);

  const purchasesStore = getStore('fairway-purchases');

  // GET — return all purchases for this client
  if (req.method === 'GET') {
    const purchases = (await purchasesStore.get(client.id, { type: 'json' }).catch(() => null)) || [];
    return json(purchases);
  }

  // PUT — client can only update finance fields on their own purchase
  if (req.method === 'PUT') {
    const body = await req.json().catch(() => ({}));
    const { id, ...fields } = body;
    if (!id) return json({ error: 'id required' }, 400);

    const purchases = (await purchasesStore.get(client.id, { type: 'json' }).catch(() => null)) || [];
    const idx = purchases.findIndex(p => p.id === id);
    if (idx === -1) return json({ error: 'Purchase not found' }, 404);

    CLIENT_EDITABLE.forEach(f => {
      if (fields[f] !== undefined) purchases[idx][f] = typeof fields[f] === 'string' ? fields[f].trim() : fields[f];
    });
    purchases[idx].updatedAt = new Date().toISOString();
    await purchasesStore.setJSON(client.id, purchases);
    return json({ ok: true, purchase: purchases[idx] });
  }

  return new Response('Method Not Allowed', { status: 405 });
};

export const config = {
  path: '/api/client/properties',
  method: ['GET', 'PUT'],
};
