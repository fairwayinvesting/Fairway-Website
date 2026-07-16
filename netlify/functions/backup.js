import { getStore } from '@netlify/blobs';

// Runs nightly at 3am UTC. Snapshots all data stores into fairway-backups.
// Keeps the last 30 daily snapshots — older ones are pruned automatically.

async function listAndFetchAll(storeName, excludeKeys = []) {
  const store = getStore(storeName);
  const { blobs } = await store.list().catch(() => ({ blobs: [] }));
  const entries = await Promise.all(
    blobs
      .filter(b => !excludeKeys.includes(b.key))
      .map(async b => ({ key: b.key, data: await store.get(b.key, { type: 'json' }).catch(() => null) }))
  );
  return Object.fromEntries(entries.filter(e => e.data !== null).map(e => [e.key, e.data]));
}

async function getAllMilestones() {
  const store = getStore('fairway-milestones');
  const { blobs } = await store.list().catch(() => ({ blobs: [] }));
  const arrays = await Promise.all(
    blobs.filter(b => b.key !== 'all').map(b => store.get(b.key, { type: 'json' }).catch(() => []))
  );
  return arrays.flat();
}

async function getAllPurchases() {
  const store = getStore('fairway-purchases');
  const { blobs } = await store.list().catch(() => ({ blobs: [] }));
  const arrays = await Promise.all(
    blobs.map(b => store.get(b.key, { type: 'json' }).catch(() => []))
  );
  return arrays.flat();
}

export default async () => {
  const [
    clients, presentations, milestones, purchases,
    questionnaires, briefs, compliance, shortlist,
  ] = await Promise.all([
    getStore('fairway-clients').get('all', { type: 'json' }).catch(() => null),
    getStore('fairway-presentations').get('all', { type: 'json' }).catch(() => null),
    getAllMilestones(),
    getAllPurchases(),
    listAndFetchAll('fairway-questionnaires'),
    listAndFetchAll('fairway-briefs'),
    getStore('fairway-compliance').get('data', { type: 'json' }).catch(() => null),
    getStore('fairway-shortlist').get('all', { type: 'json' }).catch(() => null),
  ]);

  const timestamp = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const backupStore = getStore('fairway-backups');

  const snapshot = {
    createdAt: new Date().toISOString(),
    clients:        clients        || [],
    presentations:  presentations  || [],
    milestones:     milestones     || [],
    purchases:      purchases      || [],
    questionnaires: questionnaires || {},
    briefs:         briefs         || {},
    compliance:     compliance     || {},
    shortlist:      shortlist      || [],
  };

  await backupStore.setJSON(`daily/${timestamp}`, snapshot);

  const index = await backupStore.get('index', { type: 'json' }).catch(() => null) || { dates: [] };
  index.dates = [...new Set([...index.dates, timestamp])].sort().reverse();

  const toDelete = index.dates.splice(30);
  await Promise.all(toDelete.map(d => backupStore.delete(`daily/${d}`).catch(() => {})));
  await backupStore.setJSON('index', index);

  console.log(
    `Backup complete: ${timestamp} — ` +
    `clients:${snapshot.clients.length} presentations:${snapshot.presentations.length} ` +
    `milestones:${snapshot.milestones.length} purchases:${snapshot.purchases.length} ` +
    `questionnaires:${Object.keys(snapshot.questionnaires).length} briefs:${Object.keys(snapshot.briefs).length} ` +
    `shortlist:${snapshot.shortlist.length}. Pruned: ${toDelete.length}`
  );
};

export const config = {
  schedule: '0 3 * * *', // 3am UTC daily (1pm AEST / 2pm AEDT)
};
