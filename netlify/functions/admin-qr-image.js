import { checkAdmin } from './_admin-auth.js';
import QRCode from 'qrcode';

export default async (req) => {
  if (!(await checkAdmin(req))) return new Response('Unauthorized', { status: 401 });

  const { searchParams } = new URL(req.url);
  const url = searchParams.get('url');
  const size = Math.min(Math.max(parseInt(searchParams.get('size') || '300'), 100), 3000);
  const colorHex = (searchParams.get('color') || '0d2137').replace(/[^0-9a-fA-F]/g, '').slice(0, 6) || '0d2137';
  const isDownload = searchParams.get('download') === '1';
  const filename = (searchParams.get('filename') || 'qr-code').replace(/[^a-z0-9_-]/gi, '-').slice(0, 80);

  if (!url) return new Response('url required', { status: 400 });

  try {
    const buffer = await QRCode.toBuffer(url, {
      type: 'png',
      width: size,
      margin: 2,
      errorCorrectionLevel: 'H',
      color: {
        dark: `#${colorHex}`,
        light: '#00000000',
      },
    });

    const headers = {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=3600',
    };
    if (isDownload) {
      headers['Content-Disposition'] = `attachment; filename="${filename}.png"`;
      headers['Cache-Control'] = 'no-store';
    }

    return new Response(buffer, { headers });
  } catch (err) {
    console.error('QR generation failed:', err?.message || err);
    return new Response('QR generation failed', { status: 502 });
  }
};

export const config = {
  path: '/api/admin/qr-image',
  method: ['GET'],
};
