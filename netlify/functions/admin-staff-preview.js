import { getStore } from '@netlify/blobs';
import crypto from 'crypto';
import { checkAdmin } from './_admin-auth.js';

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

export default async (req) => {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
  if (!(await checkAdmin(req))) return json({ error: 'Unauthorized' }, 401);

  const { staffId } = await req.json().catch(() => ({}));
  if (!staffId) return json({ error: 'staffId required' }, 400);

  // Verify the staff member exists and is active
  const staffStore = getStore({ name: 'fairway-staff', consistency: 'strong' });
  const all = (await staffStore.get('all', { type: 'json' }).catch(() => null)) || [];
  const user = all.find(u => u.id === staffId && !u.deletedAt && u.active);
  if (!user) return json({ error: 'Staff member not found or inactive' }, 404);

  // Generate a single-use preview token (valid 5 minutes)
  const token = crypto.randomBytes(32).toString('hex');
  const tokenStore = getStore({ name: 'fairway-preview-tokens', consistency: 'strong' });
  await tokenStore.setJSON(`preview:${token}`, {
    staffId: user.id,
    exp: Date.now() + 5 * 60 * 1000,
  });

  return json({ ok: true, token });
};

export const config = { path: '/api/admin/staff-preview', method: ['POST'] };
