import { getStore } from '@netlify/blobs';

export default async (req) => {
  const { pathname, searchParams } = new URL(req.url);

  // When invoked via the netlify.toml rewrite rule:
  //   /go/<uuid>  →  /.netlify/functions/qr-redirect/<uuid>
  // The UUID lands as the last path segment.
  // Fallback: ?id= query param (kept for compatibility).
  const id = pathname.split('/').filter(Boolean).pop()
          || searchParams.get('id');

  if (!id || id === 'qr-redirect') {
    return new Response('Not found', { status: 404 });
  }

  try {
    const store = getStore({ name: 'fairway-qr-codes', consistency: 'strong' });
    const list = (await store.get('all', { type: 'json' }).catch(() => null)) || [];
    const item = list.find(q => q.id === id);

    if (!item) return new Response('QR code not found', { status: 404 });

    let dest = item.destinationUrl || item.url || '';
    if (!dest) return new Response('No destination configured', { status: 404 });

    // Ensure absolute URL — add https:// if user typed a bare domain
    if (!/^https?:\/\//i.test(dest)) dest = 'https://' + dest;

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
