import { getStore } from '@netlify/blobs';
import crypto from 'crypto';

function signJWT(payload, secret) {
  const h = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const b = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(`${h}.${b}`).digest('base64url');
  return `${h}.${b}.${sig}`;
}

const redirect = (url, headers = {}) =>
  new Response(null, { status: 302, headers: { Location: url, ...headers } });

const errorPage = (msg) =>
  new Response(`<!DOCTYPE html><html><body style="font-family:sans-serif;padding:40px;background:#181614;color:#f7f3ed;">
    <h2 style="color:#e07070;">Preview link expired</h2>
    <p style="color:rgba(247,243,237,0.5);">${msg}</p>
    <p><a href="/staff/" style="color:#bd7a70;">Go to staff login</a></p>
  </body></html>`, { status: 400, headers: { 'Content-Type': 'text/html' } });

export default async (req) => {
  if (req.method !== 'GET') return new Response('Method Not Allowed', { status: 405 });

  const { searchParams } = new URL(req.url);
  const token = searchParams.get('t');
  if (!token || !/^[0-9a-f]{64}$/.test(token)) return errorPage('Invalid preview token.');

  const tokenStore = getStore({ name: 'fairway-preview-tokens', consistency: 'strong' });
  const record = await tokenStore.get(`preview:${token}`, { type: 'json' }).catch(() => null);

  if (!record) return errorPage('This preview link has already been used or has expired.');
  if (record.exp < Date.now()) {
    await tokenStore.delete(`preview:${token}`).catch(() => {});
    return errorPage('This preview link expired. Ask Luke to generate a new one from the admin portal.');
  }

  // Delete immediately — single use
  await tokenStore.delete(`preview:${token}`).catch(() => {});

  // Load the staff member's current data (modules, clients, permissions may have changed since token was issued)
  const staffStore = getStore({ name: 'fairway-staff', consistency: 'strong' });
  const all = (await staffStore.get('all', { type: 'json' }).catch(() => null)) || [];
  const user = all.find(u => u.id === record.staffId && !u.deletedAt && u.active);
  if (!user) return errorPage('Staff account not found or has been deactivated.');

  const secret = process.env.JWT_SECRET;
  if (!secret) return errorPage('Server configuration error.');

  // Issue a short-lived preview session (1 hour, not 30 days)
  const now = Math.floor(Date.now() / 1000);
  const jwt = signJWT({
    role: 'contractor',
    userId: user.id,
    name: user.name,
    email: user.email,
    modules: user.modules || [],
    assignedClients: user.assignedClients || [],
    permissions: user.permissions || {},
    preview: true,
    iat: now,
    exp: now + 3600,
  }, secret);

  return redirect('/staff/portal.html', {
    'Set-Cookie': `fw_staff=${jwt}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=3600`,
    'Cache-Control': 'no-store',
  });
};

export const config = { path: '/api/staff/activate-preview', method: ['GET'] };
