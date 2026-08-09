import crypto from 'crypto';

export async function checkEditor(req) {
  const cookie = req.headers.get('cookie') || '';
  const match = cookie.match(/fw_editor=([^;]+)/);
  if (!match) return false;
  try {
    const [h, b, sig] = match[1].split('.');
    const expected = crypto.createHmac('sha256', process.env.JWT_SECRET).update(`${h}.${b}`).digest('base64url');
    const sa = Buffer.from(sig, 'base64url'), sb = Buffer.from(expected, 'base64url');
    if (sa.length !== sb.length || !crypto.timingSafeEqual(sa, sb)) return false;
    const payload = JSON.parse(Buffer.from(b, 'base64url').toString());
    if (payload.role !== 'editor' || payload.exp <= Date.now() / 1000) return false;
    return true;
  } catch { return false; }
}
