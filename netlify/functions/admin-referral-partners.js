import { getStore } from '@netlify/blobs';
import crypto from 'crypto';
import { checkAdmin } from './_admin-auth.js';

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

export default async (req) => {
  if (!(await checkAdmin(req))) return json({ error: 'Unauthorized' }, 401);

  const store = getStore({ name: 'fairway-referral-partners', consistency: 'strong' });

  if (req.method === 'GET') {
    try {
      const list = (await store.get('all', { type: 'json' })) || [];
      return json(list);
    } catch (err) {
      console.error('referral-partners GET failed:', err?.message || err);
      return json({ error: 'Failed to load partners' }, 500);
    }
  }

  if (req.method === 'POST') {
    let body;
    try { body = await req.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
    const { name, email, phone, company, type, notes, state, region, isReferralPartner } = body;
    if (!name) return json({ error: 'Name required' }, 400);
    try {
      const list = (await store.get('all', { type: 'json' })) || [];
      const partner = {
        id: crypto.randomUUID(),
        name: name.trim(),
        email: email || null,
        phone: phone || null,
        company: company || null,
        type: type || null,
        notes: notes || null,
        state: state || null,
        region: region || null,
        isReferralPartner: typeof isReferralPartner === 'boolean' ? isReferralPartner : null,
        createdAt: new Date().toISOString(),
      };
      list.push(partner);
      await store.set('all', JSON.stringify(list));
      return json(partner, 201);
    } catch (err) {
      console.error('referral-partners POST failed:', err?.message || err);
      return json({ error: 'Failed to save partner — please try again' }, 500);
    }
  }

  if (req.method === 'PUT') {
    let body;
    try { body = await req.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
    const { id, name, email, phone, company, type, notes, state, region, isReferralPartner } = body;
    if (!id) return json({ error: 'id required' }, 400);
    if (!name) return json({ error: 'Name required' }, 400);
    try {
      const list = (await store.get('all', { type: 'json' })) || [];
      const idx = list.findIndex(p => p.id === id);
      if (idx === -1) return json({ error: 'Partner not found' }, 404);
      list[idx] = {
        ...list[idx],
        name: name.trim(),
        email: email || null,
        phone: phone || null,
        company: company || null,
        type: type || null,
        notes: notes || null,
        state: state || null,
        region: region || null,
        isReferralPartner: typeof isReferralPartner === 'boolean' ? isReferralPartner : list[idx].isReferralPartner,
        updatedAt: new Date().toISOString(),
      };
      await store.set('all', JSON.stringify(list));
      return json(list[idx]);
    } catch (err) {
      console.error('referral-partners PUT failed:', err?.message || err);
      return json({ error: 'Failed to update partner — please try again' }, 500);
    }
  }

  if (req.method === 'DELETE') {
    const id = new URL(req.url).searchParams.get('id');
    if (!id) return json({ error: 'id required' }, 400);
    try {
      const list = (await store.get('all', { type: 'json' })) || [];
      if (!list.find(p => p.id === id)) return json({ error: 'Partner not found' }, 404);
      await store.set('all', JSON.stringify(list.filter(p => p.id !== id)));
      return json({ ok: true });
    } catch (err) {
      console.error('referral-partners DELETE failed:', err?.message || err);
      return json({ error: 'Failed to delete partner — please try again' }, 500);
    }
  }

  return json({ error: 'Method not allowed' }, 405);
};

export const config = {
  path: '/api/admin/referral-partners',
  method: ['GET', 'POST', 'PUT', 'DELETE'],
};
