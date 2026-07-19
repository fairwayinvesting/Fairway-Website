import { checkAdmin } from './_admin-auth.js';

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

export default async (req) => {
  if (await checkAdmin(req)) return json({ ok: true });
  return json({ error: 'Unauthorized' }, 401);
};

export const config = { path: '/api/admin/verify', method: ['POST'] };
