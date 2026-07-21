import { getStore } from '@netlify/blobs';
import crypto from 'crypto';

function verifyJWT(token, secret) {
  try {
    const [h, b, sig] = token.split('.');
    const expected = crypto.createHmac('sha256', secret).update(`${h}.${b}`).digest('base64url');
    if (sig !== expected) return null;
    const payload = JSON.parse(Buffer.from(b, 'base64url').toString());
    if (payload.exp && payload.exp < Date.now() / 1000) return null;
    return payload;
  } catch { return null; }
}

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

export default async (req) => {
  const cookie = req.headers.get('cookie') || '';
  const match = cookie.match(/fw_session=([^;]+)/);
  if (!match) return json({ error: 'Not authenticated' }, 401);
  const payload = verifyJWT(match[1], process.env.JWT_SECRET);
  if (!payload) return json({ error: 'Session expired' }, 401);

  const clientId = payload.sub;

  try {
    const clientStore = getStore('fairway-clients');
    const clients = (await clientStore.get('all', { type: 'json' })) || [];
    const client = clients.find(c => c.id === clientId && !c.deleted && c.active);
    if (!client) return json({ error: 'Not found' }, 404);

    const acquisitions = client.acquisitions || [];
    if (acquisitions.length <= 1) return json({ multiAcquisition: false });

    // Fetch brief status and settlement date for each acquisition in parallel
    const briefStore = getStore('fairway-briefs');
    const msStore = getStore('fairway-milestones');
    const qStore = getStore('fairway-questionnaires');

    function blobKey(email) { return email.toLowerCase().replace(/[^a-z0-9]/g, '-'); }

    const enriched = await Promise.all(acquisitions.map(async (acq) => {
      const isFirst = acq.number === 1;
      const briefKey = isFirst ? clientId : `${clientId}:${acq.id}`;
      const msKey    = isFirst ? clientId : `${clientId}:${acq.id}`;
      const qKey     = isFirst ? blobKey(client.email) : `${clientId}:${acq.id}`;

      const [brief, milestones, questionnaire] = await Promise.all([
        briefStore.get(briefKey, { type: 'json' }).catch(() => null),
        msStore.get(msKey, { type: 'json' }).catch(() => []),
        qStore.get(qKey, { type: 'json' }).catch(() => null),
      ]);

      const ms = milestones || [];
      const settlementMilestone = ms.find(m => m.type === 'settlement' && !m.completed && m.date);

      return {
        id: acq.id,
        number: acq.number,
        label: acq.label,
        pipelineStage: acq.pipelineStage || null,
        status: acq.status || 'active',
        markets: acq.markets || [],
        questionnaireSubmitted: !!(acq.questionnaireSubmitted || questionnaire),
        briefPublished: brief?.status === 'published',
        settlementDate: settlementMilestone?.date || null,
      };
    }));

    return json({ multiAcquisition: true, acquisitions: enriched });
  } catch (err) {
    console.error('client-acquisitions error:', err?.message || err);
    return json({ multiAcquisition: false });
  }
};

export const config = { path: '/api/client/acquisitions', method: ['GET'] };
