import { getStore } from '@netlify/blobs';
import crypto from 'crypto';

function checkAdmin(req) {
  const auth = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  return auth === process.env.ADMIN_PASSWORD;
}

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

export default async (req) => {
  if (!checkAdmin(req)) return json({ error: 'Unauthorized' }, 401);

  const store = getStore('fairway-shortlist');
  const all = (await store.get('all', { type: 'json' }).catch(() => null)) || [];

  if (req.method === 'GET') return json(all);

  if (req.method === 'POST') {
    const body = await req.json().catch(() => ({}));
    if (!body.address?.trim()) return json({ error: 'address required' }, 400);
    const item = {
      id: crypto.randomUUID(),
      address:     body.address?.trim()     || '',
      suburb:      body.suburb?.trim()      || '',
      state:       body.state?.trim()       || '',
      price:       body.price?.trim()       || '',
      propertyType: body.propertyType       || 'house',
      bedrooms:    body.bedrooms?.trim()    || '',
      bathrooms:   body.bathrooms?.trim()   || '',
      carspaces:   body.carspaces?.trim()   || '',
      landSize:    body.landSize?.trim()    || '',
      agentName:   body.agentName?.trim()   || '',
      agentAgency: body.agentAgency?.trim() || '',
      agentPhone:  body.agentPhone?.trim()  || '',
      agentEmail:  body.agentEmail?.trim()  || '',
      source:      body.source              || 'own',
      notes:       body.notes?.trim()       || '',
      status:      'to_review',
      createdAt:   new Date().toISOString(),
    };
    all.push(item);
    await store.setJSON('all', all);
    return json({ ok: true, item }, 201);
  }

  if (req.method === 'PUT') {
    const body = await req.json().catch(() => ({}));
    const { id } = body;
    if (!id) return json({ error: 'id required' }, 400);
    const idx = all.findIndex(i => i.id === id);
    if (idx === -1) return json({ error: 'Not found' }, 404);
    const fields = ['address','suburb','state','price','propertyType','bedrooms','bathrooms',
                    'carspaces','landSize','agentName','agentAgency','agentPhone','agentEmail',
                    'source','notes','status'];
    fields.forEach(f => { if (body[f] !== undefined) all[idx][f] = body[f]; });
    await store.setJSON('all', all);
    return json({ ok: true, item: all[idx] });
  }

  if (req.method === 'DELETE') {
    const id = new URL(req.url).searchParams.get('id');
    if (!id) return json({ error: 'id required' }, 400);
    const updated = all.filter(i => i.id !== id);
    if (updated.length === all.length) return json({ error: 'Not found' }, 404);
    await store.setJSON('all', updated);
    return json({ ok: true });
  }

  return new Response('Method Not Allowed', { status: 405 });
};

export const config = { path: '/api/admin/shortlist', method: ['GET', 'POST', 'PUT', 'DELETE'] };
