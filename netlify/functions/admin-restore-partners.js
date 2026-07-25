import { getStore } from '@netlify/blobs';
import { checkAdmin } from './_admin-auth.js';

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

export default async (req) => {
  if (!(await checkAdmin(req))) return json({ error: 'Unauthorized' }, 401);

  const backupStore = getStore({ name: 'fairway-backups', consistency: 'strong' });
  const partnersStore = getStore({ name: 'fairway-referral-partners', consistency: 'strong' });

  // GET — show what's in the latest backup vs current store
  if (req.method === 'GET') {
    const index = await backupStore.get('index', { type: 'json' }).catch(() => null);
    if (!index || !index.dates || !index.dates.length) return json({ error: 'No backups found' }, 404);

    const latest = index.dates[index.dates.length - 1];
    const backup = await backupStore.get(`daily/${latest}`, { type: 'json' }).catch(() => null);
    if (!backup) return json({ error: `Backup ${latest} not found` }, 404);

    const current = (await partnersStore.get('all', { type: 'json' }).catch(() => null)) || [];
    const currentIds = new Set(current.map(p => p.id));

    const inBackupOnly = (backup.referralPartners || []).filter(p => !currentIds.has(p.id));

    return json({
      backupDate: latest,
      backupCreatedAt: backup.createdAt,
      currentCount: current.length,
      backupCount: (backup.referralPartners || []).length,
      missingFromCurrent: inBackupOnly,
    });
  }

  // POST — restore the missing contacts identified by the GET
  if (req.method === 'POST') {
    const index = await backupStore.get('index', { type: 'json' }).catch(() => null);
    if (!index || !index.dates || !index.dates.length) return json({ error: 'No backups found' }, 404);

    const latest = index.dates[index.dates.length - 1];
    const backup = await backupStore.get(`daily/${latest}`, { type: 'json' }).catch(() => null);
    if (!backup) return json({ error: `Backup ${latest} not found` }, 404);

    const current = (await partnersStore.get('all', { type: 'json' }).catch(() => null)) || [];
    const currentIds = new Set(current.map(p => p.id));

    const toRestore = (backup.referralPartners || []).filter(p => !currentIds.has(p.id));
    if (!toRestore.length) return json({ ok: true, restored: 0, message: 'Nothing to restore — all backup contacts already exist in current store.' });

    const merged = [...current, ...toRestore];
    await partnersStore.set('all', JSON.stringify(merged));

    return json({ ok: true, restored: toRestore.length, restoredNames: toRestore.map(p => p.name) });
  }

  return json({ error: 'Method not allowed' }, 405);
};

export const config = {
  path: '/api/admin/restore-partners',
  method: ['GET', 'POST'],
};
