import { getStore } from '@netlify/blobs';

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
  }});

export default async (req) => {
  const url = new URL(req.url);
  const shareId = url.searchParams.get('id');
  if (!shareId) return json({ error: 'id required' }, 400);

  const store = getStore({ name: 'fairway-ep-shares', consistency: 'strong' });
  const data = await store.get(`share:${shareId}`, { type: 'json' }).catch(() => null);

  if (!data) return json({ error: 'Not found' }, 404);
  return json(data);
};

export const config = { path: '/api/ep/view' };
