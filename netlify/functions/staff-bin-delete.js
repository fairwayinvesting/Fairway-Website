import { getStore } from '@netlify/blobs';
import crypto from 'crypto';
import { getStaffPayload } from './_staff-auth.js';

async function verifyPassword(password, salt, hash) {
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(password, salt, 100000, 32, 'sha256', (err, key) =>
      err ? reject(err) : resolve(crypto.timingSafeEqual(Buffer.from(key.toString('hex')), Buffer.from(hash)))
    );
  });
}

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

export default async (req) => {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });

  const payload = await getStaffPayload(req);
  if (!payload) return json({ error: 'Unauthorized' }, 401);

  let body;
  try { body = await req.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }

  const { type, id, password } = body;
  if (!type || !id || !password) return json({ error: 'type, id, and password are required' }, 400);
  if (!['shortlist', 'presentation', 'directory'].includes(type)) return json({ error: 'Invalid type' }, 400);

  // Load staff user and verify password
  const staffStore = getStore({ name: 'fairway-staff', consistency: 'strong' });
  const staffAll = (await staffStore.get('all', { type: 'json' }).catch(() => null)) || [];
  const user = staffAll.find(u => u.id === payload.userId && !u.deletedAt && u.active);
  if (!user) return json({ error: 'Unauthorized' }, 401);
  if (!user.passwordHash || !user.passwordSalt) return json({ error: 'Unauthorized' }, 401);

  let valid = false;
  try { valid = await verifyPassword(password, user.passwordSalt, user.passwordHash); } catch {}
  if (!valid) return json({ error: 'Incorrect password' }, 403);

  // Load the source store and find the item
  let storeName;
  if (type === 'shortlist') storeName = 'fairway-shortlist';
  else if (type === 'presentation') storeName = 'fairway-presentations';
  else storeName = 'fairway-referral-partners';

  const sourceStore = getStore({ name: storeName, consistency: 'strong' });
  const sourceAll = (await sourceStore.get('all', { type: 'json' }).catch(() => null)) || [];

  const item = sourceAll.find(i => i.id === id);
  if (!item) return json({ error: 'Item not found' }, 404);

  // For shortlist and presentation, only allow deletion of own items
  if ((type === 'shortlist' || type === 'presentation') && item.sourcedById !== payload.userId) {
    return json({ error: 'You can only delete your own items' }, 403);
  }

  // Determine label for the bin record
  let label;
  if (type === 'directory') label = item.name || item.company || id;
  else label = item.address || id;

  // Create bin record
  const binRecord = {
    id: 'bin-' + crypto.randomUUID(),
    type,
    label,
    deletedAt: new Date().toISOString(),
    deletedById: payload.userId,
    deletedByName: payload.name,
    data: item,
  };

  // Append to bin store
  const binStore = getStore({ name: 'fairway-bin', consistency: 'strong' });
  const binAll = (await binStore.get('all', { type: 'json' }).catch(() => null)) || [];
  binAll.push(binRecord);
  await binStore.setJSON('all', binAll);

  // Remove from source store
  const updated = sourceAll.filter(i => i.id !== id);
  await sourceStore.setJSON('all', updated);

  return json({ ok: true });
};

export const config = { path: '/api/staff/bin-delete', method: ['POST'] };
