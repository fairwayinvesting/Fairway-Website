import { getStore } from '@netlify/blobs';

export default async (req) => {
  const key = new URL(req.url).searchParams.get('key');
  if (!key) return new Response('Not found', { status: 404 });
  const store = getStore('fairway-media');
  const result = await store.getWithMetadata(key, { type: 'arrayBuffer' });
  if (!result?.data) return new Response('Not found', { status: 404 });
  return new Response(result.data, {
    headers: {
      'Content-Type': result.metadata?.mimeType || 'image/jpeg',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
};

export const config = { path: '/api/media', method: ['GET'] };
