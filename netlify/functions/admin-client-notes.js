import { getStore } from '@netlify/blobs';
import crypto from 'crypto';
import { appendAudit } from './_audit.js';
import { checkAdmin } from './_admin-auth.js';

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });


export default async (req) => {
  if (!(await checkAdmin(req))) return json({ error: 'Unauthorized' }, 401);

  const url = new URL(req.url);
  const clientId = url.searchParams.get('clientId');
  if (!clientId) return json({ error: 'clientId required' }, 400);

  const store = getStore('fairway-client-notes');

  if (req.method === 'GET') {
    const notes = (await store.get(clientId, { type: 'json' }).catch(() => null)) || [];
    return json(notes);
  }

  if (req.method === 'POST') {
    const { text } = await req.json().catch(() => ({}));
    if (!text || !text.trim()) return json({ error: 'text required' }, 400);

    const notes = (await store.get(clientId, { type: 'json' }).catch(() => null)) || [];
    const note = { id: crypto.randomUUID(), text: text.trim(), createdAt: new Date().toISOString() };
    notes.unshift(note);
    await store.setJSON(clientId, notes);

    const clientsStore = getStore('fairway-clients');
    const clients = (await clientsStore.get('all', { type: 'json' })) || [];
    const client = clients.find(c => c.id === clientId);
    if (client) appendAudit('note_added', `Added note for ${client.name} <${client.email}>`);

    return json(note, 201);
  }

  if (req.method === 'DELETE') {
    const noteId = url.searchParams.get('noteId');
    if (!noteId) return json({ error: 'noteId required' }, 400);

    const notes = (await store.get(clientId, { type: 'json' }).catch(() => null)) || [];
    const updated = notes.filter(n => n.id !== noteId);
    if (updated.length === notes.length) return json({ error: 'Not found' }, 404);
    await store.setJSON(clientId, updated);
    return json({ ok: true });
  }

  return new Response('Method Not Allowed', { status: 405 });
};

export const config = {
  path: '/api/admin/client-notes',
  method: ['GET', 'POST', 'DELETE'],
};
