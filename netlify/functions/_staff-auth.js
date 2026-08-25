import crypto from 'crypto';
import { getStore } from '@netlify/blobs';

async function verifyStaffToken(req) {
  const cookie = req.headers.get('cookie') || '';
  const match = cookie.match(/fw_staff=([^;]+)/);
  if (!match) return null;
  try {
    const [h, b, sig] = match[1].split('.');
    if (!h || !b || !sig) return null;
    const expected = crypto.createHmac('sha256', process.env.JWT_SECRET).update(`${h}.${b}`).digest('base64url');
    const sa = Buffer.from(sig, 'base64url'), sb = Buffer.from(expected, 'base64url');
    if (sa.length !== sb.length || !crypto.timingSafeEqual(sa, sb)) return null;
    const payload = JSON.parse(Buffer.from(b, 'base64url').toString());
    if (payload.role !== 'contractor' || payload.exp <= Date.now() / 1000) return null;
    // Always read live user data — modules and assignedClients must reflect
    // current admin settings, not what was baked into the JWT at login time
    try {
      const store = getStore({ name: 'fairway-staff', consistency: 'strong' });
      const all = (await store.get('all', { type: 'json' }).catch(() => { throw new Error('store unavailable'); })) || [];
      const user = all.find(u => u.id === payload.userId);
      if (!user || !user.active) return null;
      // Return live permissions merged with JWT identity
      return {
        ...payload,
        modules: user.modules || [],
        assignedClients: user.assignedClients || [],
      };
    } catch { return null; }
  } catch {}
  return null;
}

export async function checkStaff(req) {
  return (await verifyStaffToken(req)) !== null;
}

export async function getStaffPayload(req) {
  return verifyStaffToken(req);
}

export function hasModule(payload, module) {
  return Array.isArray(payload?.modules) && payload.modules.includes(module);
}
