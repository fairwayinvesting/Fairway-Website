import { getStore } from '@netlify/blobs';

export default async function (request) {
  const url = new URL(request.url);
  const id = url.pathname.replace(/^\/go\//, '').split('/')[0];

  if (!id) return new Response('Not found', { status: 404 });

  try {
    const store = getStore({ name: 'fairway-qr-codes', consistency: 'strong' });
    const list = (await store.get('all', { type: 'json' }).catch(() => null)) || [];
    const item = list.find(q => q.id === id);

    if (!item) return new Response('Not found', { status: 404 });

    let dest = item.destinationUrl || item.url || '';
    if (!dest) return new Response('No destination configured', { status: 404 });
    if (!/^https?:\/\//i.test(dest)) dest = 'https://' + dest;

    return Response.redirect(dest, 302);
  } catch (err) {
    return new Response('Error', { status: 500 });
  }
}
