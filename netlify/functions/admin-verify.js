const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

export default async (req) => {
  const auth = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!auth || auth !== process.env.ADMIN_PASSWORD) return json({ error: 'Unauthorized' }, 401);
  return json({ ok: true });
};

export const config = { path: '/api/admin/verify', method: ['POST'] };
