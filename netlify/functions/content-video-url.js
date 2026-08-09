import { getStore } from '@netlify/blobs';
import crypto from 'crypto';
import { checkAdmin } from './_admin-auth.js';
import { checkEditor } from './_editor-auth.js';
import { validateVideoFilename, presignPut, presignGet, sanitizeFilename, r2Configured } from './_r2.js';

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

async function authCheck(req) {
  return (await checkAdmin(req)) || (await checkEditor(req));
}

async function loadContent() {
  const store = getStore({ name: 'fairway-content', consistency: 'strong' });
  return (await store.get('all', { type: 'json' }).catch(() => null)) || [];
}

async function saveContent(list) {
  const store = getStore({ name: 'fairway-content', consistency: 'strong' });
  await store.set('all', JSON.stringify(list));
}

export default async (req) => {
  if (!(await authCheck(req))) return json({ error: 'Unauthorized' }, 401);

  const url = new URL(req.url);

  // GET /api/content-video/upload-url?contentId=X&filename=Y
  if (req.method === 'GET' && url.pathname === '/api/content-video/upload-url') {
    if (!r2Configured()) return json({ error: 'Video storage not configured yet' }, 503);
    const contentId = url.searchParams.get('contentId');
    const filename = url.searchParams.get('filename');
    if (!contentId || !filename) return json({ error: 'contentId and filename required' }, 400);
    const validated = validateVideoFilename(filename);
    if (!validated) return json({ error: 'File type not allowed. Accepted: mp4, mov, avi, mkv, wmv, webm, m4v' }, 400);
    const safeFilename = sanitizeFilename(filename);
    const key = `content/${contentId}/${Date.now()}_${safeFilename}`;
    const { url: uploadUrl, contentType } = presignPut(key, validated.contentType);
    return json({ uploadUrl, key, contentType, filename });
  }

  // POST /api/content-video/confirm — call after successful upload to save key to content item
  if (req.method === 'POST' && url.pathname === '/api/content-video/confirm') {
    let body;
    try { body = await req.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
    const { contentId, key, filename } = body;
    if (!contentId || !key) return json({ error: 'contentId and key required' }, 400);
    const list = await loadContent();
    const idx = list.findIndex(c => c.id === contentId);
    if (idx === -1) return json({ error: 'Content item not found' }, 404);
    list[idx].videoKey = key;
    list[idx].videoFilename = filename || key.split('/').pop();
    list[idx].videoUploadedAt = new Date().toISOString();
    list[idx].updatedAt = new Date().toISOString();
    await saveContent(list);
    return json(list[idx]);
  }

  // GET /api/content-video/download-url?contentId=X
  if (req.method === 'GET' && url.pathname === '/api/content-video/download-url') {
    if (!r2Configured()) return json({ error: 'Video storage not configured yet' }, 503);
    const contentId = url.searchParams.get('contentId');
    if (!contentId) return json({ error: 'contentId required' }, 400);
    const list = await loadContent();
    const item = list.find(c => c.id === contentId);
    if (!item) return json({ error: 'Not found' }, 404);
    if (!item.videoKey) return json({ error: 'No video uploaded for this item' }, 404);
    const downloadUrl = presignGet(item.videoKey, item.videoFilename);
    return json({ downloadUrl, filename: item.videoFilename });
  }

  return json({ error: 'Not found' }, 404);
};

export const config = {
  path: ['/api/content-video/upload-url', '/api/content-video/confirm', '/api/content-video/download-url'],
  method: ['GET', 'POST'],
};
