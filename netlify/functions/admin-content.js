import { getStore } from '@netlify/blobs';
import crypto from 'crypto';
import { checkAdmin } from './_admin-auth.js';

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

const LONG_FORM_STAGES = ['idea','guest_invited','confirmed','pre_production','recorded','editing','approved','published','repurposed'];
const SHORT_FORM_STAGES = ['idea','scripted','filmed','edited','scheduled','published'];
const VALID_TYPES = ['long_form','short_form'];

function validStage(type, stage) {
  const stages = type === 'long_form' ? LONG_FORM_STAGES : SHORT_FORM_STAGES;
  return stages.includes(stage) ? stage : stages[0];
}

export default async (req) => {
  if (!(await checkAdmin(req))) return json({ error: 'Unauthorized' }, 401);

  const store = getStore({ name: 'fairway-content', consistency: 'strong' });
  const load = async () => (await store.get('all', { type: 'json' }).catch(() => null)) || [];
  const save = async (list) => store.set('all', JSON.stringify(list));

  if (req.method === 'GET') {
    return json(await load());
  }

  if (req.method === 'POST') {
    let body;
    try { body = await req.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
    const { title, type, stage, scheduledDate, guestIds, dealId, platforms, repurposedFromId, notes } = body;
    if (!title?.trim()) return json({ error: 'title required' }, 400);
    const resolvedType = VALID_TYPES.includes(type) ? type : 'long_form';
    const list = await load();
    const item = {
      id: crypto.randomUUID(),
      type: resolvedType,
      title: title.trim(),
      stage: validStage(resolvedType, stage),
      scheduledDate: scheduledDate || null,
      publishedDate: null,
      guestIds: Array.isArray(guestIds) ? guestIds : [],
      dealId: dealId || null,
      platforms: Array.isArray(platforms) ? platforms : [],
      repurposedFromId: repurposedFromId || null,
      notes: notes || null,
      videoKey: null,
      videoFilename: null,
      videoUploadedAt: null,
      deletedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    list.push(item);
    await save(list);
    return json(item, 201);
  }

  if (req.method === 'PUT') {
    let body;
    try { body = await req.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
    const { id } = body;
    if (!id) return json({ error: 'id required' }, 400);
    const list = await load();
    const idx = list.findIndex(i => i.id === id);
    if (idx === -1) return json({ error: 'Not found' }, 404);
    const item = list[idx];
    if (body.title !== undefined) item.title = body.title.trim();
    if (body.type !== undefined && VALID_TYPES.includes(body.type)) item.type = body.type;
    if (body.stage !== undefined) item.stage = validStage(item.type, body.stage);
    if (body.scheduledDate !== undefined) item.scheduledDate = body.scheduledDate || null;
    if (body.publishedDate !== undefined) item.publishedDate = body.publishedDate || null;
    if (body.guestIds !== undefined) item.guestIds = Array.isArray(body.guestIds) ? body.guestIds : [];
    if (body.dealId !== undefined) item.dealId = body.dealId || null;
    if (body.platforms !== undefined) item.platforms = Array.isArray(body.platforms) ? body.platforms : [];
    if (body.repurposedFromId !== undefined) item.repurposedFromId = body.repurposedFromId || null;
    if (body.notes !== undefined) item.notes = body.notes || null;
    item.updatedAt = new Date().toISOString();
    await save(list);
    return json(item);
  }

  if (req.method === 'DELETE') {
    const id = new URL(req.url).searchParams.get('id');
    if (!id) return json({ error: 'id required' }, 400);
    const list = await load();
    const idx = list.findIndex(i => i.id === id);
    if (idx === -1) return json({ error: 'Not found' }, 404);
    list[idx].deletedAt = new Date().toISOString();
    await save(list);
    return json({ ok: true });
  }

  return json({ error: 'Method not allowed' }, 405);
};

export const config = {
  path: '/api/admin/content',
  method: ['GET', 'POST', 'PUT', 'DELETE'],
};
