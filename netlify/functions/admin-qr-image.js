import { checkAdmin } from './_admin-auth.js';
import QRCode from 'qrcode';
import { PNG } from 'pngjs';

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
    const dr = parseInt(colorHex.slice(0, 2), 16);
    const dg = parseInt(colorHex.slice(2, 4), 16);
    const db = parseInt(colorHex.slice(4, 6), 16);

    // Get raw QR data matrix
    const qr = QRCode.create(url, { errorCorrectionLevel: 'H' });
    const moduleCount = qr.modules.size;
    const quietZone = 4; // modules of padding
    const totalModules = moduleCount + quietZone * 2;
    const moduleSize = Math.max(1, Math.floor(size / totalModules));
    const imgSize = totalModules * moduleSize;

    // Build RGBA PNG manually — light modules stay fully transparent
    const png = new PNG({ width: imgSize, height: imgSize, colorType: 6 });
    png.data = Buffer.alloc(imgSize * imgSize * 4, 0); // transparent by default

    for (let row = 0; row < moduleCount; row++) {
      for (let col = 0; col < moduleCount; col++) {
        if (!qr.modules.get(row, col)) continue; // light = transparent, skip
        const px = (quietZone + col) * moduleSize;
        const py = (quietZone + row) * moduleSize;
        for (let dy = 0; dy < moduleSize; dy++) {
          for (let dx = 0; dx < moduleSize; dx++) {
            const i = ((py + dy) * imgSize + (px + dx)) * 4;
            png.data[i]     = dr;
            png.data[i + 1] = dg;
            png.data[i + 2] = db;
            png.data[i + 3] = 255; // fully opaque
          }
        }
      }
    }

    const buffer = PNG.sync.write(png);

    const headers = {
      'Content-Type': 'image/png',
      'Cache-Control': isDownload ? 'no-store' : 'public, max-age=3600',
    };
    if (isDownload) {
      headers['Content-Disposition'] = `attachment; filename="${filename}.png"`;
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
