export default async () =>
  new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': 'fw_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0',
    },
  });

export const config = { path: '/api/logout' };
