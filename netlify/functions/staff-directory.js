import { getStore } from '@netlify/blobs';
import { getStaffPayload, hasModule } from './_staff-auth.js';

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

export default async (req) => {
  if (req.method !== 'GET') return new Response('Method Not Allowed', { status: 405 });

  const payload = await getStaffPayload(req);
  if (!payload) return json({ error: 'Unauthorized' }, 401);
  if (!hasModule(payload, 'directory')) return json({ error: 'Access denied' }, 403);

  // Load fresh user record to get current directory permissions
  const staffStore = getStore({ name: 'fairway-staff', consistency: 'strong' });
  const staffAll = (await staffStore.get('all', { type: 'json' }).catch(() => null)) || [];
  const user = staffAll.find(u => u.id === payload.userId && !u.deletedAt && u.active);
  if (!user) return json({ error: 'Unauthorized' }, 401);

  const allowedCategories = new Set(user.directoryAccess?.categories || []);
  const hiddenContacts = new Set(user.directoryAccess?.hiddenContacts || []);

  const dirStore = getStore({ name: 'fairway-referral-partners', consistency: 'strong' });
  const all = (await dirStore.get('all', { type: 'json' }).catch(() => null)) || [];

  const LEGACY_MAP = {
    'Mortgage broker': 'mortgage-broker', 'Accountant': 'accountant',
    'Building & pest': 'building-pest', 'Property manager': 'property-manager',
    'Conveyancer': 'conveyancer', 'Sales agent': 'sales-agent',
  };

  const filtered = all
    .filter(p => {
      if (hiddenContacts.has(p.id)) return false;
      const type = LEGACY_MAP[p.type] || p.type;
      return allowedCategories.has(type);
    })
    .map(p => ({
      id: p.id,
      name: p.name,
      company: p.company,
      phone: p.phone,
      email: p.email,
      type: LEGACY_MAP[p.type] || p.type,
      state: p.state,
      location: p.location,
      notes: p.notes,
    }));

  return json(filtered);
};

export const config = { path: '/api/staff/directory', method: ['GET'] };
