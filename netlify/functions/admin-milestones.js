import { getStore } from '@netlify/blobs';
import crypto from 'crypto';

function checkAdmin(req) {
  const cookie = req.headers.get('cookie') || '';
  const cookieMatch = cookie.match(/fw_admin=([^;]+)/);
  if (cookieMatch) {
    try {
      const [h, b, sig] = cookieMatch[1].split('.');
      const expected = crypto.createHmac('sha256', process.env.JWT_SECRET).update(`${h}.${b}`).digest('base64url');
      if (sig === expected) {
        const payload = JSON.parse(Buffer.from(b, 'base64url').toString());
        if (payload.role === 'admin' && payload.exp > Date.now() / 1000) return true;
      }
    } catch {}
  }
  const auth = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  return auth === process.env.ADMIN_PASSWORD;
}

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

export const MILESTONE_LABELS = {
  finance:      'Subject to Finance',
  building_pest:'Building & Pest',
  contracts:    'Contracts Exchanged',
  cooling_off:  'Cooling Off End',
  settlement:   'Settlement',
  preapproval:  'Pre-Approval Expiry',
  custom:       'Custom',
};

const store = () => getStore('fairway-milestones');

// ── Per-client helpers ───────────────────────────────────────────────────────
// Each client's milestones are stored under their own key (clientId).
// This means one client's writes can never overwrite another's.

async function getClientMilestones(clientId) {
  return (await store().get(clientId, { type: 'json' }).catch(() => null)) || [];
}

async function saveClientMilestones(clientId, milestones) {
  if (milestones.length === 0) {
    await store().delete(clientId).catch(() => {});
  } else {
    await store().setJSON(clientId, milestones);
  }
}

// ── One-time migration from old 'all' global array ───────────────────────────
// If a legacy 'all' key exists, split it into per-client keys then remove it.
async function maybeMigrate() {
  const legacy = await store().get('all', { type: 'json' }).catch(() => null);
  if (!legacy || !Array.isArray(legacy) || legacy.length === 0) {
    await store().delete('all').catch(() => {});
    return;
  }
  const byClient = {};
  for (const m of legacy) {
    if (!m.clientId) continue;
    (byClient[m.clientId] = byClient[m.clientId] || []).push(m);
  }
  await Promise.all(
    Object.entries(byClient).map(([cid, ms]) => store().setJSON(cid, ms))
  );
  await store().delete('all').catch(() => {});
}

// ── Assemble all milestones across all clients ────────────────────────────────
async function getAllMilestones() {
  const { blobs } = await store().list().catch(() => ({ blobs: [] }));
  const arrays = await Promise.all(
    blobs
      .filter(b => b.key !== 'all')
      .map(b => store().get(b.key, { type: 'json' }).catch(() => []))
  );
  return arrays.flat();
}

export default async (req) => {
  if (!checkAdmin(req)) return json({ error: 'Unauthorized' }, 401);

  // Run migration once if legacy data exists (no-op after first run)
  await maybeMigrate();

  // ── GET ──────────────────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    const clientId = new URL(req.url).searchParams.get('clientId');
    if (clientId) {
      return json(await getClientMilestones(clientId));
    }
    return json(await getAllMilestones());
  }

  // ── POST ─────────────────────────────────────────────────────────────────────
  if (req.method === 'POST') {
    const { clientId, clientName, type, label, date, notes } = await req.json().catch(() => ({}));
    if (!clientId || !type || !date) return json({ error: 'clientId, type and date required' }, 400);

    const clientMilestones = await getClientMilestones(clientId);
    const milestone = {
      id: crypto.randomUUID(),
      clientId,
      clientName: clientName || '',
      type,
      label: label || MILESTONE_LABELS[type] || type,
      date,
      notes: notes || '',
      completed: false,
      completedAt: null,
      createdAt: new Date().toISOString(),
    };
    clientMilestones.push(milestone);
    await saveClientMilestones(clientId, clientMilestones);
    return json({ ok: true, id: milestone.id }, 201);
  }

  // ── PUT ──────────────────────────────────────────────────────────────────────
  if (req.method === 'PUT') {
    const { id, clientId, date, notes, label, completed } = await req.json().catch(() => ({}));
    if (!id) return json({ error: 'id required' }, 400);

    // clientId required; without it we can't do an isolated read-modify-write
    if (!clientId) return json({ error: 'clientId required' }, 400);

    const clientMilestones = await getClientMilestones(clientId);
    const idx = clientMilestones.findIndex(m => m.id === id);
    if (idx === -1) return json({ error: 'Not found' }, 404);

    if (date      !== undefined) clientMilestones[idx].date      = date;
    if (notes     !== undefined) clientMilestones[idx].notes     = notes;
    if (label     !== undefined) clientMilestones[idx].label     = label;
    if (completed !== undefined) {
      clientMilestones[idx].completed  = completed;
      clientMilestones[idx].completedAt = completed ? new Date().toISOString() : null;
    }
    await saveClientMilestones(clientId, clientMilestones);
    return json({ ok: true });
  }

  // ── DELETE ───────────────────────────────────────────────────────────────────
  if (req.method === 'DELETE') {
    const url = new URL(req.url);
    const id       = url.searchParams.get('id');
    const clientId = url.searchParams.get('clientId');
    if (!id)       return json({ error: 'id required' }, 400);
    if (!clientId) return json({ error: 'clientId required' }, 400);

    const clientMilestones = await getClientMilestones(clientId);
    const updated = clientMilestones.filter(m => m.id !== id);
    if (updated.length === clientMilestones.length) return json({ error: 'Not found' }, 404);
    await saveClientMilestones(clientId, updated);
    return json({ ok: true });
  }

  return new Response('Method Not Allowed', { status: 405 });
};

export const config = {
  path: '/api/admin/milestones',
  method: ['GET', 'POST', 'PUT', 'DELETE'],
};
