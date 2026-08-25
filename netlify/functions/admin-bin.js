import { getStore } from '@netlify/blobs';
import { checkAdmin } from './_admin-auth.js';

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

function storeForType(type) {
  if (type === 'shortlist') return 'fairway-shortlist';
  if (type === 'presentation') return 'fairway-presentations';
  if (type === 'directory') return 'fairway-referral-partners';
  throw new Error(`Unknown bin type: ${type}`);
}

export default async (req) => {
  const isAdmin = await checkAdmin(req);
  if (!isAdmin) return json({ error: 'Unauthorized' }, 401);

  const binStore = getStore({ name: 'fairway-bin', consistency: 'strong' });

  if (req.method === 'GET') {
    const all = (await binStore.get('all', { type: 'json' }).catch(() => null)) || [];
    const sorted = [...all].sort((a, b) => new Date(b.deletedAt) - new Date(a.deletedAt));
    return json(sorted);
  }

  if (req.method === 'PUT') {
    let body;
    try { body = await req.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }

    const { action } = body;
    if (!action || !['reinstate', 'permanent-delete'].includes(action)) return json({ error: 'Invalid action' }, 400);

    // Support single id or array of ids
    const ids = body.ids ? body.ids : (body.id ? [body.id] : []);
    if (!ids.length) return json({ error: 'id or ids required' }, 400);

    let binAll = (await binStore.get('all', { type: 'json' }).catch(() => null)) || [];
    const records = ids.map(id => binAll.find(r => r.id === id)).filter(Boolean);
    if (!records.length) return json({ error: 'No matching bin records found' }, 404);

    const errors = [];

    if (action === 'reinstate') {
      // Group records by target store to minimise writes
      const byStore = {};
      for (const record of records) {
        try {
          const sName = storeForType(record.type);
          if (!byStore[sName]) byStore[sName] = [];
          byStore[sName].push(record);
        } catch {
          errors.push(`"${record.label}" has unknown type "${record.type}" — skipped`);
        }
      }

      for (const [storeName, recs] of Object.entries(byStore)) {
        const targetStore = getStore({ name: storeName, consistency: 'strong' });
        const targetAll = (await targetStore.get('all', { type: 'json' }).catch(() => null)) || [];
        for (const record of recs) {
          const exists = targetAll.some(i => i.id === record.data.id);
          if (exists) {
            errors.push(`"${record.label}" already exists — skipped`);
            // Still remove from bin
          } else {
            targetAll.push(record.data);
          }
        }
        await targetStore.setJSON('all', targetAll);
      }
    }

    // Remove all processed records from bin
    const processedIds = new Set(records.map(r => r.id));
    binAll = binAll.filter(r => !processedIds.has(r.id));
    await binStore.setJSON('all', binAll);

    return json({ ok: true, errors });
  }

  return new Response('Method Not Allowed', { status: 405 });
};

export const config = { path: '/api/admin/bin', method: ['GET', 'PUT'] };
