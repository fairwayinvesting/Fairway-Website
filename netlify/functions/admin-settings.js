import { getStore } from '@netlify/blobs';
import { checkAdmin } from './_admin-auth.js';

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

export default async (req) => {
  if (!(await checkAdmin(req))) return json({ error: 'Unauthorized' }, 401);

  const store = getStore('fairway-settings');

  if (req.method === 'GET') {
    const agentSig = await store.get('agent-signature', { type: 'text' }).catch(() => null);
    return json({ agentSignatureUrl: agentSig || null });
  }

  if (req.method === 'PUT') {
    const body = await req.json().catch(() => ({}));

    if (body.agentSignature) {
      if (!body.agentSignature.startsWith('data:image/')) {
        return json({ error: 'Invalid signature format' }, 400);
      }
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
