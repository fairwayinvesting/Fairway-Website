import { getStore } from '@netlify/blobs';

// Runs nightly at 3am UTC. Snapshots all three data stores into fairway-backups.
// Keeps the last 30 daily snapshots — older ones are pruned automatically.

export default async () => {
  const [clients, presentations, milestones] = await Promise.all([
    getStore('fairway-clients').get('all', { type: 'json' }).catch(() => null),
    getStore('fairway-presentations').get('all', { type: 'json' }).catch(() => null),
    getStore('fairway-milestones').get('all', { type: 'json' }).catch(() => null),
  ]);

  const timestamp = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const backupStore = getStore('fairway-backups');

  const snapshot = {
    createdAt: new Date().toISOString(),
    clients: clients || [],
    presentations: presentations || [],
    milestones: milestones || [],
  };

  // Write today's snapshot
  await backupStore.setJSON(`daily/${timestamp}`, snapshot);

  // Read index of existing backups and prune anything older than 30 days
  const index = await backupStore.get('index', { type: 'json' }).catch(() => null) || { dates: [] };
  index.dates = [...new Set([...index.dates, timestamp])].sort().reverse();

  const toDelete = index.dates.splice(30); // keep newest 30, delete the rest
  await Promise.all(toDelete.map(d => backupStore.delete(`daily/${d}`).catch(() => {})));

  await backupStore.setJSON('index', index);

  console.log(`Backup complete: ${timestamp} — clients:${snapshot.clients.length} presentations:${snapshot.presentations.length} milestones:${snapshot.milestones.length}. Pruned: ${toDelete.length}`);
};

export const config = {
  schedule: '0 3 * * *', // 3am UTC daily (1pm AEST / 2pm AEDT)
};
