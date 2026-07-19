import { getStore } from '@netlify/blobs';
import { checkAdmin } from './_admin-auth.js';

const json = (data, status = 200, extra = {}) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...extra } });

export default async (req) => {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
  if (!(await checkAdmin(req))) return json({ error: 'Unauthorized' }, 401);

  // Record the logout moment — all tokens with iat <= this value are now invalid on every device
  const loggedOutAt = Math.floor(Date.now() / 1000);
  const store = getStore('fairway-admin-session');
  await store.setJSON('state', { loggedOutAt });

  return json({ ok: true }, 200, {
    'Set-Cookie': 'fw_admin=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0',
  });
};

export const config = { path: '/api/admin-logout', method: ['POST'] };
