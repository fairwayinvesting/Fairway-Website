import { getStaffPayload } from './_staff-auth.js';
import { getStore } from '@netlify/blobs';

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

export default async (req) => {
  const payload = await getStaffPayload(req);
  if (!payload) return json({ error: 'Unauthorized' }, 401);

  // Return fresh data from store so module/client changes take effect immediately
  try {
    const store = getStore({ name: 'fairway-staff', consistency: 'strong' });
    const all = (await store.get('all', { type: 'json' }).catch(() => null)) || [];
    const user = all.find(u => u.id === payload.userId && !u.deletedAt);
    if (!user || !user.active) return json({ error: 'Unauthorized' }, 401);
    return json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      modules: user.modules || [],
      assignedClients: user.assignedClients || [],
      directoryAccess: user.directoryAccess || {},
      permissions: user.permissions || {},
      preview: payload.preview || false,
    });
  } catch {
    return json({
      id: payload.userId,
      name: payload.name,
      email: payload.email,
      role: payload.role,
      modules: payload.modules || [],
      assignedClients: payload.assignedClients || [],
    });
  }
};

export const config = { path: '/api/staff/me', method: ['GET'] };
