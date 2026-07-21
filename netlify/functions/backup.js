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

async function getAllNotes() {
  const store = getStore('fairway-client-notes');
  const { blobs } = await store.list().catch(() => ({ blobs: [] }));
  const entries = await Promise.all(
    blobs.map(async b => ({ clientId: b.key, notes: await store.get(b.key, { type: 'json' }).catch(() => []) }))
  );
  return Object.fromEntries(entries.map(e => [e.clientId, e.notes]));
}

async function getAllPresentationViews() {
  const store = getStore('fairway-presentation-views');
  const { blobs } = await store.list().catch(() => ({ blobs: [] }));
  const entries = await Promise.all(
    blobs
      .filter(b => b.key !== '_migrated')
      .map(async b => ({ presId: b.key, views: await store.get(b.key, { type: 'json' }).catch(() => null) }))
  );
  return Object.fromEntries(entries.filter(e => e.views).map(e => [e.presId, e.views]));
}

export default async () => {
  const [
    clients, presentations, milestones, purchases,
    questionnaires, briefs, compliance, shortlist, notes, auditLog, presentationViews, referralPartners,
  ] = await Promise.all([
    getStore('fairway-clients').get('all', { type: 'json' }).catch(() => null),
    getStore('fairway-presentations').get('all', { type: 'json' }).catch(() => null),
    getAllMilestones(),
    getAllPurchases(),
    listAndFetchAll('fairway-questionnaires'),
    listAndFetchAll('fairway-briefs'),
    getStore('fairway-compliance').get('data', { type: 'json' }).catch(() => null),
    getStore('fairway-shortlist').get('all', { type: 'json' }).catch(() => null),
    getAllNotes(),
    getStore('fairway-audit-log').get('entries', { type: 'json' }).catch(() => null),
    getAllPresentationViews(),
    getStore('fairway-referral-partners').get('all', { type: 'json' }).catch(() => null),
  ]);

  const timestamp = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const backupStore = getStore('fairway-backups');

  const snapshot = {
    createdAt: new Date().toISOString(),
    clients:           clients           || [],
    presentations:     presentations     || [],
    milestones:        milestones        || [],
    purchases:         purchases         || [],
    questionnaires:    questionnaires    || {},
    briefs:            briefs            || {},
    compliance:        compliance        || {},
    shortlist:         shortlist         || [],
    notes:             notes             || {},
    auditLog:          auditLog          || [],
    presentationViews: presentationViews || {},
    referralPartners:  referralPartners  || [],
  };

  await backupStore.setJSON(`daily/${timestamp}`, snapshot);

  // Verify the write landed correctly
  const verify = await backupStore.get(`daily/${timestamp}`, { type: 'json' }).catch(() => null);
  const writeOk = verify?.createdAt && Array.isArray(verify.clients);
  if (!writeOk) {
    const msg = `⚠️ *Backup verification FAILED* for ${timestamp} — data may not have been written to Blobs correctly.`;
    console.error(msg);
    const slackUrl = process.env.SLACK_WEBHOOK_URL;
    if (slackUrl) {
      await fetch(slackUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: msg }),
      }).catch(() => {});
    }
    return;
  }

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
    `shortlist:${snapshot.shortlist.length} notes:${Object.keys(snapshot.notes).length} ` +
    `auditLog:${snapshot.auditLog.length} presentationViews:${Object.keys(snapshot.presentationViews).length} ` +
    `referralPartners:${snapshot.referralPartners.length}. Pruned: ${toDelete.length}`
  );
};

export const config = {
  schedule: '0 3 * * *', // 3am UTC daily (1pm AEST / 2pm AEDT)
};
