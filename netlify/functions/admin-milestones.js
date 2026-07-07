import { getStore } from '@netlify/blobs';
import crypto from 'crypto';

function checkAdmin(req) {
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

export default async (req) => {
  if (!checkAdmin(req)) return json({ error: 'Unauthorized' }, 401);

  const store = getStore('fairway-milestones');
  const milestones = (await store.get('all', { type: 'json' })) || [];

  if (req.method === 'GET') {
    const clientId = new URL(req.url).searchParams.get('clientId');
    return json(clientId ? milestones.filter(m => m.clientId === clientId) : milestones);
  }

  if (req.method === 'POST') {
    const { clientId, clientName, type, label, date, notes } = await req.json().catch(() => ({}));
    if (!clientId || !type || !date) return json({ error: 'clientId, type and date required' }, 400);
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
    milestones.push(milestone);
    await store.setJSON('all', milestones);
    return json({ ok: true, id: milestone.id }, 201);
  }

  if (req.method === 'PUT') {
    const { id, date, notes, label, completed } = await req.json().catch(() => ({}));
    const idx = milestones.findIndex(m => m.id === id);
    if (idx === -1) return json({ error: 'Not found' }, 404);
    if (date !== undefined) milestones[idx].date = date;
    if (notes !== undefined) milestones[idx].notes = notes;
    if (label !== undefined) milestones[idx].label = label;
    if (completed !== undefined) {
      milestones[idx].completed = completed;
      milestones[idx].completedAt = completed ? new Date().toISOString() : null;
    }
    await store.setJSON('all', milestones);
    return json({ ok: true });
  }

  if (req.method === 'DELETE') {
    const id = new URL(req.url).searchParams.get('id');
    if (!id) return json({ error: 'id required' }, 400);
    const updated = milestones.filter(m => m.id !== id);
    if (updated.length === milestones.length) return json({ error: 'Not found' }, 404);
    await store.setJSON('all', updated);
    return json({ ok: true });
  }

  return new Response('Method Not Allowed', { status: 405 });
};

export const config = {
  path: '/api/admin/milestones',
  method: ['GET', 'POST', 'PUT', 'DELETE'],
};
