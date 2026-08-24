import { getStore } from '@netlify/blobs';
import { checkAdmin } from './_admin-auth.js';

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

export default async (req) => {
  const isAdmin = await checkAdmin(req);
  if (!isAdmin) return json({ error: 'Unauthorized' }, 401);

  const binStore = getStore({ name: 'fairway-bin', consistency: 'strong' });

  if (req.method === 'GET') {
    const all = (await binStore.get('all', { type: 'json' }).catch(() => null)) || [];
    // Sort newest first
    const sorted = [...all].sort((a, b) => new Date(b.deletedAt) - new Date(a.deletedAt));
    return json(sorted);
  }

  if (req.method === 'PUT') {
    let body;
    try { body = await req.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }

    const { id, action } = body;
    if (!id || !action) return json({ error: 'id and action required' }, 400);
    if (!['reinstate', 'permanent-delete'].includes(action)) return json({ error: 'Invalid action' }, 400);

    const binAll = (await binStore.get('all', { type: 'json' }).catch(() => null)) || [];
    const record = binAll.find(r => r.id === id);
    if (!record) return json({ error: 'Bin record not found' }, 404);

    if (action === 'reinstate') {
      // Determine target store
      let storeName;
      if (record.type === 'shortlist') storeName = 'fairway-shortlist';
      else if (record.type === 'presentation') storeName = 'fairway-presentations';
      else storeName = 'fairway-referral-partners';

      const targetStore = getStore({ name: storeName, consistency: 'strong' });
      const targetAll = (await targetStore.get('all', { type: 'json' }).catch(() => null)) || [];

      // Check for id collision (in case item was recreated)
      const exists = targetAll.some(i => i.id === record.data.id);
      if (exists) return json({ error: 'An item with this ID already exists in the store. Cannot reinstate.' }, 409);

      targetAll.push(record.data);
      await targetStore.setJSON('all', targetAll);
    }

    // Remove from bin regardless of action
    const updatedBin = binAll.filter(r => r.id !== id);
    await binStore.setJSON('all', updatedBin);

    return json({ ok: true });
  }

  return new Response('Method Not Allowed', { status: 405 });
};

export const config = { path: '/api/admin/bin', method: ['GET', 'PUT'] };
