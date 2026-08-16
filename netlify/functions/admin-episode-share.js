import { getStore } from '@netlify/blobs';
import crypto from 'crypto';
import { checkAdmin } from './_admin-auth.js';

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

export default async (req) => {
  if (!(await checkAdmin(req))) return json({ error: 'Unauthorized' }, 401);
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  let body;
  try { body = await req.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }

  const { contentId, title, guestName, hook, topicBlocks, talkingPoints, cta } = body;
  if (!contentId) return json({ error: 'contentId required' }, 400);

  const store = getStore({ name: 'fairway-ep-shares', consistency: 'strong' });

  // Reuse existing shareId if one exists for this content item
  const shareMap = await store.get('content-share-map', { type: 'json' }).catch(() => null) || {};
  let shareId = shareMap[contentId];
  if (!shareId) {
    shareId = crypto.randomBytes(6).toString('base64url');
    shareMap[contentId] = shareId;
    await store.set('content-share-map', JSON.stringify(shareMap));
  }

  const shareData = {
    shareId,
    contentId,
    title: title || 'Untitled Episode',
    guestName: guestName || '',
    hook: hook || '',
    topicBlocks: topicBlocks || [],
    talkingPoints: talkingPoints || [],
    cta: cta || '',
    updatedAt: new Date().toISOString(),
  };

  await store.set(`share:${shareId}`, JSON.stringify(shareData));

  return json({ shareId, shareUrl: `https://fairwayinvesting.com.au/ep/${shareId}` });
};

export const config = { path: '/api/admin/episode-share', method: ['POST'] };
