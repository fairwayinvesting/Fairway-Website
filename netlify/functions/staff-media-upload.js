import { getStore } from '@netlify/blobs';
import crypto from 'crypto';
import { getStaffPayload } from './_staff-auth.js';

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

export default async (req) => {
  const payload = await getStaffPayload(req);
  if (!payload) return json({ error: 'Unauthorized' }, 401);
  const { dataUrl, mimeType = 'image/jpeg' } = await req.json().catch(() => ({}));
  if (!dataUrl) return json({ error: 'dataUrl required' }, 400);
  const base64 = dataUrl.replace(/^data:[^;]+;base64,/, '');
  if (base64.length > 20_000_000) return json({ error: 'File too large (max ~15 MB)' }, 413);
  const buffer = Buffer.from(base64, 'base64');
  const key = crypto.randomBytes(16).toString('hex');
  const store = getStore('fairway-media');
  await store.set(key, buffer, { metadata: { mimeType } });
  return json({ ok: true, url: `/api/media?key=${key}` });
};

export const config = { path: '/api/staff/media-upload', method: ['POST'] };
