import { checkAdmin } from './_admin-auth.js';

export default async (req) => {
  if (!(await checkAdmin(req))) return new Response('Unauthorized', { status: 401 });

  const { searchParams } = new URL(req.url);
  const url = searchParams.get('url');
  const size = Math.min(Math.max(parseInt(searchParams.get('size') || '300'), 100), 3000);
  const color = (searchParams.get('color') || '0d2137').replace(/[^0-9a-fA-F]/g, '').slice(0, 6) || '0d2137';
  const bgcolor = (searchParams.get('bgcolor') || 'ffffff').replace(/[^0-9a-fA-F]/g, '').slice(0, 6) || 'ffffff';

  if (!url) return new Response('url required', { status: 400 });

  try {
    const apiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}&ecc=H&margin=2&format=png&color=${color}&bgcolor=${bgcolor}`;
    const res = await fetch(apiUrl);
    if (!res.ok) return new Response('QR generation failed', { status: 502 });
    const buffer = await res.arrayBuffer();
    return new Response(buffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (err) {
    console.error('QR image proxy failed:', err?.message || err);
    return new Response('QR generation failed', { status: 502 });
  }
};

export const config = {
  path: '/api/admin/qr-image',
  method: ['GET'],
};
