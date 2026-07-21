import { getStore } from '@netlify/blobs';

const AUDIT_CAP = 500;

export async function appendAudit(action, detail, before = null, after = null, actor = null) {
  try {
    const store = getStore('fairway-audit-log');
    const entries = (await store.get('entries', { type: 'json' }).catch(() => null)) || [];
    entries.unshift({
      ts: new Date().toISOString(),
      action,
      detail,
      ...(actor !== null ? { actor } : {}),
      ...(before !== null ? { before } : {}),
      ...(after  !== null ? { after  } : {}),
    });
    if (entries.length > AUDIT_CAP) entries.length = AUDIT_CAP;
    await store.setJSON('entries', entries);
  } catch { /* best-effort — never block a user action */ }
}
