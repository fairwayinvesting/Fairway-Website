import { getStore } from '@netlify/blobs';
import crypto from 'crypto';

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

export default async (req) => {
  const key = req.headers.get('x-agent-key') || '';
  if (!process.env.AGENT_SUBMIT_KEY || key !== process.env.AGENT_SUBMIT_KEY)
    return json({ error: 'Unauthorized' }, 401);

  const { dataUrl, mimeType = 'image/jpeg' } = await req.json().catch(() => ({}));
  if (!dataUrl) return json({ error: 'dataUrl required' }, 400);
  const base64 = dataUrl.replace(/^data:[^;]+;base64,/, '');
  if (base64.length > 10_000_000) return json({ error: 'File too large (max ~7MB)' }, 413);
  const buffer = Buffer.from(base64, 'base64');
  const k = crypto.randomBytes(16).toString('hex');
  await getStore('fairway-media').set(k, buffer, { metadata: { mimeType } });
  return json({ ok: true, url: `/api/media?key=${k}` });
};

export const config = { path: '/api/agent-media', method: ['POST'] };
