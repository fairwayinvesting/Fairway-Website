import { getStore } from '@netlify/blobs';
import crypto from 'crypto';
import { checkAdmin } from './_admin-auth.js';

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

const ALLOWED_TYPES = new Set(['bp-report', 'contract', 'rental-appraisal', 'pre-approval', 'other']);

export default async (req) => {
  if (!(await checkAdmin(req))) return json({ error: 'Unauthorized' }, 401);

  const store = getStore({ name: 'fairway-client-docs', consistency: 'strong' });
  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get('clientId');

  const getMeta  = async (cid) => (await store.get(`meta-${cid}`, { type: 'json' }).catch(() => null)) || [];
  const saveMeta = async (cid, meta) => store.set(`meta-${cid}`, JSON.stringify(meta));

  // ── GET: list metadata or stream file ──────────────────────────────────────
  if (req.method === 'GET') {
    if (!clientId) return json({ error: 'clientId required' }, 400);
    const docId = searchParams.get('docId');

    if (docId) {
      const meta = await getMeta(clientId);
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

    return json(await getMeta(clientId));
  }

  // ── POST: upload file (single or chunked) ──────────────────────────────────
  if (req.method === 'POST') {
    if (!clientId) return json({ error: 'clientId required' }, 400);
    let formData;
    try { formData = await req.formData(); } catch { return json({ error: 'Invalid form data' }, 400); }

    const file  = formData.get('file');
    const acqId = formData.get('acqId') || '';
    const type  = formData.get('type')  || 'other';

    if (!file || typeof file === 'string') return json({ error: 'file required' }, 400);
    if (!ALLOWED_TYPES.has(type)) return json({ error: 'Invalid type' }, 400);

    const chunkIndex  = formData.get('chunkIndex');
    const totalChunks = formData.get('totalChunks');

    // ── Chunked upload ──────────────────────────────────────────────────────
    if (chunkIndex !== null) {
      const idx    = parseInt(chunkIndex, 10);
      const total  = parseInt(totalChunks, 10);
      const docId  = formData.get('docId') || crypto.randomUUID();
      const buffer = await file.arrayBuffer();

      await store.set(`chunk-${docId}-${idx}`, buffer);

      if (idx < total - 1) {
        // More chunks to come — return docId for next request
        return json({ docId, chunk: idx });
      }

      // Final chunk — reassemble all chunks into one blob
      const parts = await Promise.all(
        Array.from({ length: total }, (_, i) =>
          store.get(`chunk-${docId}-${i}`, { type: 'arrayBuffer' })
        )
      );
      const totalBytes = parts.reduce((s, p) => s + p.byteLength, 0);
      const combined   = new Uint8Array(totalBytes);
      let offset = 0;
      for (const part of parts) { combined.set(new Uint8Array(part), offset); offset += part.byteLength; }

      await store.set(`file-${docId}`, combined.buffer);

      // Clean up chunk blobs (best-effort)
      Promise.all(
        Array.from({ length: total }, (_, i) => store.delete(`chunk-${docId}-${i}`).catch(() => {}))
      );

      const totalSize = parseInt(formData.get('totalSize') || '0', 10) || totalBytes;
      const meta      = await getMeta(clientId);
      const newDoc    = { id: docId, acqId, type, filename: file.name, size: totalSize, mimeType: file.type || 'application/octet-stream', uploadedAt: new Date().toISOString() };
      meta.push(newDoc);
      await saveMeta(clientId, meta);
      return json(newDoc, 201);
    }

    // ── Single upload ───────────────────────────────────────────────────────
    const docId  = crypto.randomUUID();
    const buffer = await file.arrayBuffer();
    await store.set(`file-${docId}`, buffer);

    const meta   = await getMeta(clientId);
    const newDoc = {
      id: docId,
      acqId,
      type,
      filename: file.name,
      size: file.size,
      mimeType: file.type || 'application/octet-stream',
      uploadedAt: new Date().toISOString(),
    };
    meta.push(newDoc);
    await saveMeta(clientId, meta);

    return json(newDoc, 201);
  }

  // ── DELETE: remove file (password protected) ────────────────────────────────
  if (req.method === 'DELETE') {
    if (!clientId) return json({ error: 'clientId required' }, 400);
    const docId = searchParams.get('docId');
    if (!docId) return json({ error: 'docId required' }, 400);

    const { password } = await req.json().catch(() => ({}));
    if (!password || password !== process.env.ADMIN_PASSWORD) {
      return json({ error: 'Incorrect password' }, 403);
    }

    const meta = await getMeta(clientId);
    const idx  = meta.findIndex(d => d.id === docId);
    if (idx === -1) return json({ error: 'Not found' }, 404);

    meta.splice(idx, 1);
    await Promise.all([saveMeta(clientId, meta), store.delete(`file-${docId}`).catch(() => {})]);

    return json({ ok: true });
  }

  return json({ error: 'Method not allowed' }, 405);
};

export const config = {
  path: '/api/admin/client-docs',
  method: ['GET', 'POST', 'DELETE'],
};
