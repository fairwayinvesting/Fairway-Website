import { getStore } from '@netlify/blobs';

export default async function (request, context) {
  const secret = Deno.env.get('JWT_SECRET');
  if (!secret) return context.next();

  const url = new URL(request.url);
  const cookie = request.headers.get('cookie') || '';
  const loginUrl = `${url.origin}/clients/?redirect=${encodeURIComponent(url.pathname)}`;

  // Admin cookie — bypass all market checks
  const adminMatch = cookie.match(/fw_admin=([^;]+)/);
  if (adminMatch) {
    const adminPayload = await verifyJWT(adminMatch[1], secret);
    if (adminPayload && adminPayload.role === 'admin') return context.next();
  }

  // Client session — verify identity from JWT
  const match = cookie.match(/fw_session=([^;]+)/);
  if (!match) return Response.redirect(loginUrl, 302);

  const payload = await verifyJWT(match[1], secret);
  if (!payload) return Response.redirect(loginUrl, 302);

  const market = url.pathname.split('/').pop().replace('.html', '');

  // Live market check — so newly assigned markets work without re-login
  try {
    const store = getStore('fairway-clients');
    const clients = await store.get('all', { type: 'json' });
    const client = clients?.find(c => c.id === payload.sub);
    if (!client || !client.active || !Array.isArray(client.markets) || !client.markets.includes(market)) {
      return Response.redirect(`${url.origin}/clients/portal.html`, 302);
    }
    return context.next();
  } catch {
    // Blobs unavailable — fall back to JWT markets so the guard still works
    if (!Array.isArray(payload.markets) || !payload.markets.includes(market)) {
      return Response.redirect(`${url.origin}/clients/portal.html`, 302);
    }
    return context.next();
  }
}

async function verifyJWT(token, secret) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [h, b, sig] = parts;
    const key = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']
    );
    const sigBytes = Uint8Array.from(atob(sig.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
    const valid = await crypto.subtle.verify('HMAC', key, sigBytes, new TextEncoder().encode(`${h}.${b}`));
    if (!valid) return null;
    const payload = JSON.parse(atob(b.replace(/-/g, '+').replace(/_/g, '/')));
    if (payload.exp && payload.exp < Date.now() / 1000) return null;
    return payload;
  } catch { return null; }
}
