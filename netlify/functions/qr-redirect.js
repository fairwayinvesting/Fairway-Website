import { getStore } from '@netlify/blobs';

export default async (req) => {
  const id = new URL(req.url).pathname.split('/').filter(Boolean).pop();
  if (!id) return new Response('Not found', { status: 404 });

  try {
    const store = getStore({ name: 'fairway-qr-codes', consistency: 'strong' });
    const list = (await store.get('all', { type: 'json' })) || [];
    const item = list.find(q => q.id === id);
    if (!item) return new Response('QR code not found', { status: 404 });
    const dest = item.destinationUrl || item.url;
    if (!dest) return new Response('No destination configured', { status: 404 });
    return Response.redirect(dest, 302);
  } catch (err) {
    console.error('qr-redirect failed:', err?.message || err);
    return new Response('Error', { status: 500 });
  }
};

export const config = {
  path: '/go/*',
  method: ['GET'],
};
