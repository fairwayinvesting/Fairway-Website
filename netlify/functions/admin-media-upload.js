import { getStore } from '@netlify/blobs';
import crypto from 'crypto';

function checkAdmin(req) {
  const auth = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  return auth === process.env.ADMIN_PASSWORD;
}

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

export default async (req) => {
  if (!checkAdmin(req)) return json({ error: 'Unauthorized' }, 401);
  const { dataUrl, mimeType = 'image/jpeg' } = await req.json().catch(() => ({}));
  if (!dataUrl) return json({ error: 'dataUrl required' }, 400);
  const base64 = dataUrl.replace(/^data:[^;]+;base64,/, '');
  if (base64.length > 7_000_000) return json({ error: 'File too large (max ~5MB)' }, 413);
  const buffer = Buffer.from(base64, 'base64');
  const key = crypto.randomBytes(16).toString('hex');
  const store = getStore('fairway-media');
  await store.set(key, buffer, { metadata: { mimeType } });
  return json({ ok: true, url: `/api/media?key=${key}` });
};

export const config = { path: '/api/admin/media-upload', method: ['POST'] };
