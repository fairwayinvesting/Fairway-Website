import { getStore } from '@netlify/blobs';
import crypto from 'crypto';

function verifyJWT(token, secret) {
  try {
    const [h, b, sig] = token.split('.');
    const expected = crypto.createHmac('sha256', secret).update(`${h}.${b}`).digest('base64url');
    const sa = Buffer.from(sig, 'base64url'), sb = Buffer.from(expected, 'base64url');
    if (sa.length !== sb.length || !crypto.timingSafeEqual(sa, sb)) return null;
    const payload = JSON.parse(Buffer.from(b, 'base64url').toString());
    if (payload.exp && payload.exp < Date.now() / 1000) return null;
    return payload;
  } catch { return null; }
}

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

export default async (req) => {
  const cookie = req.headers.get('cookie') || '';
  const match = cookie.match(/fw_session=([^;]+)/);
  if (!match) return json({ error: 'Not authenticated' }, 401);

  const payload = verifyJWT(match[1], process.env.JWT_SECRET);
  if (!payload) return json({ error: 'Session expired' }, 401);

  const acqId = new URL(req.url).searchParams.get('acq');
  const storeKey = acqId ? `${payload.sub}:${acqId}` : payload.sub;
  const store = getStore('fairway-briefs');
  const brief = await store.get(storeKey, { type: 'json' }).catch(() => null);

  if (!brief || brief.status !== 'published') return json({ published: false });

  // Strip any future internal-only fields before returning
  const { ...publicBrief } = brief;
  return json({ published: true, brief: publicBrief });
};

export const config = { path: '/api/brief', method: ['GET'] };
