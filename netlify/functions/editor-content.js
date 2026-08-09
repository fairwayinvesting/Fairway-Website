import { getStore } from '@netlify/blobs';
import { checkEditor } from './_editor-auth.js';

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

// Stages the editor can see
const EDITOR_STAGES = new Set(['recorded', 'editing', 'approved', 'published']);

// Stage transitions the editor is allowed to make
const ALLOWED_TRANSITIONS = {
  recorded: ['editing'],
  editing: ['approved'],
  approved: ['published'],
};

export default async (req) => {
  if (!(await checkEditor(req))) return json({ error: 'Unauthorized' }, 401);

  const store = getStore({ name: 'fairway-content', consistency: 'strong' });
  const load = async () => (await store.get('all', { type: 'json' }).catch(() => null)) || [];
  const save = async (list) => store.set('all', JSON.stringify(list));

  if (req.method === 'GET') {
    const list = await load();
    return json(list.filter(c => !c.deletedAt && EDITOR_STAGES.has(c.stage)));
  }

  if (req.method === 'PUT') {
    let body;
    try { body = await req.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
    const { id, stage } = body;
    if (!id) return json({ error: 'id required' }, 400);
    const list = await load();
    const idx = list.findIndex(c => c.id === id);
    if (idx === -1) return json({ error: 'Not found' }, 404);
    if (!EDITOR_STAGES.has(list[idx].stage)) return json({ error: 'Item not in an editable stage' }, 403);
    if (stage) {
      const allowed = ALLOWED_TRANSITIONS[list[idx].stage] || [];
      if (!allowed.includes(stage)) return json({ error: `Cannot move from ${list[idx].stage} to ${stage}` }, 400);
      list[idx].stage = stage;
    }
    list[idx].updatedAt = new Date().toISOString();
    await save(list);
    return json(list[idx]);
  }

  return json({ error: 'Method not allowed' }, 405);
};

export const config = {
  path: '/api/editor/content',
  method: ['GET', 'PUT'],
};
