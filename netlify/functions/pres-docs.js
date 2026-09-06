import { getStore } from '@netlify/blobs';
import crypto from 'crypto';
import { checkAdmin } from './_admin-auth.js';
import { getStaffPayload, hasModule } from './_staff-auth.js';

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

async function authenticate(req) {
  const adminOk = await checkAdmin(req);
  if (adminOk) return { role: 'admin' };
  const payload = await getStaffPayload(req);
  if (payload && hasModule(payload, 'presentations')) return { role: 'staff', userId: payload.userId, name: payload.name };
  return null;
}

export default async (req) => {
  const actor = await authenticate(req);
  if (!actor) return json({ error: 'Unauthorized' }, 401);

  const store = getStore({ name: 'fairway-pres-docs', consistency: 'strong' });
  const { searchParams } = new URL(req.url);
  const presId = searchParams.get('presId');

  const getMeta  = async (pid) => (await store.get(`meta-${pid}`, { type: 'json' }).catch(() => null)) || [];
  const saveMeta = async (pid, meta) => store.set(`meta-${pid}`, JSON.stringify(meta));

  // ── GET: list metadata or stream file ─────────────────────────────────────
  if (req.method === 'GET') {
    if (!presId) return json({ error: 'presId required' }, 400);
    const docId = searchParams.get('docId');
    if (docId) {
      const meta = await getMeta(presId);
      const doc  = meta.find(d => d.id === docId);
      if (!doc) return json({ error: 'Not found' }, 404);
      const data = await store.get(`file-${docId}`, { type: 'arrayBuffer' }).catch(() => null);
      if (!data) return json({ error: 'File not found' }, 404);
      const isPdf = doc.mimeType === 'application/pdf';
      return new Response(data, {
        headers: {
          'Content-Type': doc.mimeType || 'application/octet-stream',
          'Content-Disposition': `${isPdf ? 'inline' : 'attachment'}; filename="${encodeURIComponent(doc.filename)}"`,
          'Cache-Control': 'no-store',
        },
      });
    }
    return json(await getMeta(presId));
  }

  // ── POST: upload file (single or chunked) ─────────────────────────────────
  if (req.method === 'POST') {
    let formData;
    try { formData = await req.formData(); } catch { return json({ error: 'Invalid form data' }, 400); }
    const resolvedPresId = presId || formData.get('presId') || null;
    if (!resolvedPresId) return json({ error: 'presId required' }, 400);

    const file  = formData.get('file');
    if (!file || typeof file === 'string') return json({ error: 'file required' }, 400);

    const chunkIndex  = formData.get('chunkIndex');
    const totalChunks = formData.get('totalChunks');

    if (chunkIndex !== null) {
      const idx    = parseInt(chunkIndex, 10);
      const total  = parseInt(totalChunks, 10);
      const docId  = formData.get('docId') || crypto.randomUUID();
      const buffer = await file.arrayBuffer();
      await store.set(`chunk-${docId}-${idx}`, buffer);
      if (idx < total - 1) return json({ docId, chunk: idx });
      const parts = await Promise.all(
        Array.from({ length: total }, (_, i) => store.get(`chunk-${docId}-${i}`, { type: 'arrayBuffer' }))
      );
      const totalBytes = parts.reduce((s, p) => s + p.byteLength, 0);
      const combined   = new Uint8Array(totalBytes);
      let offset = 0;
      for (const part of parts) { combined.set(new Uint8Array(part), offset); offset += part.byteLength; }
      await store.set(`file-${docId}`, combined.buffer);
      Promise.all(Array.from({ length: total }, (_, i) => store.delete(`chunk-${docId}-${i}`).catch(() => {})));
      const totalSize = parseInt(formData.get('totalSize') || '0', 10) || totalBytes;
      const meta = await getMeta(resolvedPresId);
      const newDoc = { id: docId, filename: file.name, size: totalSize, mimeType: file.type || 'application/octet-stream', uploadedBy: actor.name || actor.role, uploadedAt: new Date().toISOString() };
      meta.push(newDoc);
      await saveMeta(resolvedPresId, meta);
      return json(newDoc, 201);
    }

    const docId  = crypto.randomUUID();
    const buffer = await file.arrayBuffer();
    await store.set(`file-${docId}`, buffer);
    const meta   = await getMeta(resolvedPresId);
    const newDoc = { id: docId, filename: file.name, size: file.size, mimeType: file.type || 'application/octet-stream', uploadedBy: actor.name || actor.role, uploadedAt: new Date().toISOString() };
    meta.push(newDoc);
    await saveMeta(resolvedPresId, meta);
    return json(newDoc, 201);
  }

  // ── DELETE ─────────────────────────────────────────────────────────────────
  if (req.method === 'DELETE') {
    if (!presId) return json({ error: 'presId required' }, 400);
    const docId = searchParams.get('docId');
    if (!docId) return json({ error: 'docId required' }, 400);
    const meta = await getMeta(presId);
    const idx  = meta.findIndex(d => d.id === docId);
    if (idx === -1) return json({ error: 'Not found' }, 404);
    meta.splice(idx, 1);
    await Promise.all([saveMeta(presId, meta), store.delete(`file-${docId}`).catch(() => {})]);
    return json({ ok: true });
  }

  return json({ error: 'Method not allowed' }, 405);
};

export const config = {
  path: '/api/pres-docs',
  method: ['GET', 'POST', 'DELETE'],
};
