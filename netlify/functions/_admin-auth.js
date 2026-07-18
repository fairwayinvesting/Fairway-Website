import crypto from 'crypto';

export function checkAdmin(req) {
  const cookie = req.headers.get('cookie') || '';
  const cookieMatch = cookie.match(/fw_admin=([^;]+)/);
  if (cookieMatch) {
    try {
      const [h, b, sig] = cookieMatch[1].split('.');
      const expected = crypto.createHmac('sha256', process.env.JWT_SECRET).update(`${h}.${b}`).digest('base64url');
      if (sig === expected) {
        const payload = JSON.parse(Buffer.from(b, 'base64url').toString());
        if (payload.role === 'admin' && payload.exp > Date.now() / 1000) return true;
      }
    } catch {}
  }
  return false;
}
