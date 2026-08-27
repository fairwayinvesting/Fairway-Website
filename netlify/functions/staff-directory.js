import { getStore } from '@netlify/blobs';
import crypto from 'crypto';
import { getStaffPayload, hasModule } from './_staff-auth.js';

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

const LEGACY_MAP = {
  'Mortgage broker': 'mortgage-broker', 'Accountant': 'accountant',
  'Building & pest': 'building-pest', 'Property manager': 'property-manager',
  'Conveyancer': 'conveyancer', 'Sales agent': 'sales-agent',
};

export default async (req) => {
  const payload = await getStaffPayload(req);
  if (!payload) return json({ error: 'Unauthorized' }, 401);
  if (!hasModule(payload, 'directory')) return json({ error: 'Access denied' }, 403);

  // Load fresh user record to get current directory permissions
  const staffStore = getStore({ name: 'fairway-staff', consistency: 'strong' });
  const staffAll = (await staffStore.get('all', { type: 'json' }).catch(() => null)) || [];
  const user = staffAll.find(u => u.id === payload.userId && !u.deletedAt && u.active);
  if (!user) return json({ error: 'Unauthorized' }, 401);

  if (req.method === 'GET') {
    const allowedCategories = new Set(user.directoryAccess?.categories || []);
    const hiddenContacts = new Set(user.directoryAccess?.hiddenContacts || []);

    const dirStore = getStore({ name: 'fairway-referral-partners', consistency: 'strong' });
    const all = (await dirStore.get('all', { type: 'json' }).catch(() => null)) || [];

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
        region: p.region,
        location: p.location,
        notes: p.notes,
        files: (p.files || []).map(f => ({
          id: f.id,
          name: f.name,
          mimeType: f.mimeType,
          sizeBytes: f.sizeBytes,
          mediaKey: f.mediaKey,
          uploadedBy: f.uploadedBy,
          uploadedByRole: f.uploadedByRole,
          uploadedAt: f.uploadedAt,
        })),
      }));

    return json(filtered);
  }

  if (req.method === 'POST') {
    let body;
    try { body = await req.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }

    const { name, company, type, phone, email, state, notes } = body;
    if (!name || !name.trim()) return json({ error: 'Name is required' }, 400);

    const normalizedType = LEGACY_MAP[type] || type || 'other';

    const newContact = {
      id: crypto.randomUUID(),
      name: name.trim(),
      company: (company || '').trim(),
      type: normalizedType,
      phone: (phone || '').trim(),
      email: (email || '').trim(),
      state: (state || '').trim(),
      notes: (notes || '').trim(),
      createdAt: new Date().toISOString(),
      addedById: payload.userId,
      addedByName: payload.name,
    };

    const dirStore = getStore({ name: 'fairway-referral-partners', consistency: 'strong' });
    const all = (await dirStore.get('all', { type: 'json' }).catch(() => null)) || [];
    all.push(newContact);
    await dirStore.setJSON('all', all);

    return json({ ok: true, contact: newContact });
  }

  return new Response('Method Not Allowed', { status: 405 });
};

export const config = { path: '/api/staff/directory', method: ['GET', 'POST'] };
