import crypto from 'crypto';

function signJWT(payload, secret) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${sig}`;
}

export default async (req) => {
  const { password } = await req.json().catch(() => ({}));
  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const token = signJWT(
    { role: 'admin', exp: Math.floor(Date.now() / 1000) + 86400 * 30 },
    process.env.JWT_SECRET
  );

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': `fw_admin=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${86400 * 30}`,
    },
  });
};

export const config = { path: '/api/admin-login' };
