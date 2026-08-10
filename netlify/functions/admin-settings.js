import { getStore } from '@netlify/blobs';
import { checkAdmin } from './_admin-auth.js';

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

const SETTING_KEYS = new Set([
  'business-details', 'booking-links', 'branding',
  'notifications', 'email-templates', 'agreement-terms',
  'bas-dates',
]);

export default async (req) => {
  if (!(await checkAdmin(req))) return json({ error: 'Unauthorized' }, 401);

  const store = getStore({ name: 'fairway-settings', consistency: 'strong' });
  const { searchParams } = new URL(req.url);

  if (req.method === 'GET') {
    const key = searchParams.get('key');

    // New generic key-based read
    if (key && SETTING_KEYS.has(key)) {
      const data = await store.get(key, { type: 'json' }).catch(() => null);
      return json(data || {});
    }

    // Legacy: agent signature
    const agentSig = await store.get('agent-signature', { type: 'text' }).catch(() => null);
    return json({ agentSignatureUrl: agentSig || null });
  }

  if (req.method === 'PUT') {
    const body = await req.json().catch(() => ({}));

    // New generic key-based write
    if (body.key && SETTING_KEYS.has(body.key)) {
      if (typeof body.data !== 'object' || body.data === null) return json({ error: 'data required' }, 400);
      await store.set(body.key, JSON.stringify(body.data));
      return json({ ok: true });
    }

    // Legacy: agent signature
    if (body.agentSignature) {
      if (!body.agentSignature.startsWith('data:image/')) return json({ error: 'Invalid signature format' }, 400);
      await store.set('agent-signature', body.agentSignature);
      return json({ ok: true });
    }

    if (body.deleteAgentSignature) {
      await store.delete('agent-signature').catch(() => {});
      return json({ ok: true });
    }

    return json({ error: 'Unknown action' }, 400);
  }

  return json({ error: 'Method not allowed' }, 405);
};

export const config = {
  path: '/api/admin/settings',
  method: ['GET', 'PUT'],
};
