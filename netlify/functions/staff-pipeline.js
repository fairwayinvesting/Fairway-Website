import { getStore } from '@netlify/blobs';
import { getStaffPayload, hasModule } from './_staff-auth.js';

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

export default async (req) => {
  const payload = await getStaffPayload(req);
  if (!payload) return json({ error: 'Unauthorized' }, 401);
  if (!hasModule(payload, 'pipeline')) return json({ error: 'Access denied' }, 403);

  const { assignedClients = [] } = payload;
  const clientStore = getStore({ name: 'fairway-clients', consistency: 'strong' });

  if (req.method === 'GET') {
    if (!assignedClients.length) return json([]);
    const all = (await clientStore.get('all', { type: 'json' }).catch(() => null)) || [];
    const pipeline = all
      .filter(c => !c.deleted && c.active && assignedClients.includes(c.id))
      .map(c => ({
        id: c.id,
        name: c.name,
        stage: c.stage,
        pipelineStage: c.pipelineStage || null,
        pipelineStageUpdatedAt: c.pipelineStageUpdatedAt || null,
        createdAt: c.createdAt || null,
        markets: c.markets,
        acquisitions: (c.acquisitions || []).map(acq => ({
          id: acq.id,
          label: acq.label,
          stage: acq.stage,
          pipelineStage: acq.pipelineStage || null,
          pipelineStageUpdatedAt: acq.pipelineStageUpdatedAt || null,
          createdAt: acq.createdAt || c.createdAt || null,
          markets: acq.markets,
        })),
      }));
    return json(pipeline);
  }

  if (req.method === 'PUT') {
    const body = await req.json().catch(() => ({}));
    const { id, acqId, pipelineStage: newStage } = body;
    if (!id || !newStage) return json({ error: 'id and pipelineStage required' }, 400);
    if (!assignedClients.includes(id)) return json({ error: 'Access denied' }, 403);

    const all = (await clientStore.get('all', { type: 'json' }).catch(() => null)) || [];
    const idx = all.findIndex(c => c.id === id);
    if (idx === -1) return json({ error: 'Client not found' }, 404);

    const now = new Date().toISOString();
    if (acqId) {
      const acqs = all[idx].acquisitions || [];
      const acqIdx = acqs.findIndex(a => a.id === acqId);
      if (acqIdx !== -1) {
        acqs[acqIdx].pipelineStage = newStage;
        acqs[acqIdx].pipelineStageUpdatedAt = now;
        all[idx].acquisitions = acqs;
        const latestActive = [...acqs].reverse().find(a => a.status !== 'settled');
        if (latestActive) {
          all[idx].pipelineStage = latestActive.pipelineStage;
          all[idx].pipelineStageUpdatedAt = latestActive.pipelineStageUpdatedAt;
        }
      }
    } else {
      all[idx].pipelineStage = newStage;
      all[idx].pipelineStageUpdatedAt = now;
    }

    await clientStore.setJSON('all', all);
    return json({ ok: true });
  }

  return new Response('Method Not Allowed', { status: 405 });
};

export const config = { path: '/api/staff/pipeline', method: ['GET', 'PUT'] };
