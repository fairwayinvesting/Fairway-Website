import { getStore } from '@netlify/blobs';

function checkAdmin(req) {
  const auth = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  return auth === process.env.ADMIN_PASSWORD;
}

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

function entityDisplay(q) {
  if (!q) return { type: 'Individual', name: '' };
  const type = q.entityType || 'Individual';
  const name = type === 'Company' ? q.companyName
    : type === 'Trust' ? q.trustName
    : type === 'SMSF' ? q.smsfName
    : '';
  return { type, name };
}

function qKey(email) {
  return email.toLowerCase().replace(/[^a-z0-9]/g, '-');
}

export default async (req) => {
  if (!checkAdmin(req)) return json({ error: 'Unauthorized' }, 401);

  const briefStore = getStore('fairway-briefs');
  const clientStore = getStore('fairway-clients');
  const qStore = getStore('fairway-questionnaires');

  if (req.method === 'GET') {
    const clientId = new URL(req.url).searchParams.get('clientId');
    if (!clientId) return json({ error: 'clientId required' }, 400);

    const allClients = (await clientStore.get('all', { type: 'json' }).catch(() => null)) || [];
    const client = allClients.find(c => c.id === clientId);
    if (!client) return json({ error: 'Client not found' }, 404);

    const [brief, questionnaire] = await Promise.all([
      briefStore.get(clientId, { type: 'json' }).catch(() => null),
      qStore.get(qKey(client.email), { type: 'json' }).catch(() => null),
    ]);

    return json({ brief, questionnaire, client: { id: client.id, name: client.name, email: client.email } });
  }

  if (req.method === 'POST') {
    const body = await req.json().catch(() => ({}));
    const { clientId, strategyNotes, targetMarkets, customMarkets, budgetMin, budgetMax,
            propertyTypes, propertyCriteria, customCriteria, excludedCharacteristics, customExclusions, status } = body;
    if (!clientId) return json({ error: 'clientId required' }, 400);

    // Look up client + questionnaire to bundle derived fields
    const allClients = (await clientStore.get('all', { type: 'json' }).catch(() => null)) || [];
    const client = allClients.find(c => c.id === clientId);
    if (!client) return json({ error: 'Client not found' }, 404);

    const q = await qStore.get(qKey(client.email), { type: 'json' }).catch(() => null);
    const entity = entityDisplay(q);

    const existing = await briefStore.get(clientId, { type: 'json' }).catch(() => null);
    const now = new Date().toISOString();
    const newStatus = status || existing?.status || 'draft';

    const brief = {
      ...(existing || {}),
      clientId,
      clientName: client.name,
      strategyNotes: strategyNotes ?? existing?.strategyNotes ?? '',
      targetMarkets: targetMarkets ?? existing?.targetMarkets ?? [],
      customMarkets: customMarkets ?? existing?.customMarkets ?? [],
      budgetMin: budgetMin ?? existing?.budgetMin ?? '',
      budgetMax: budgetMax ?? existing?.budgetMax ?? '',
      propertyTypes: propertyTypes ?? existing?.propertyTypes ?? [],
      propertyCriteria: propertyCriteria ?? existing?.propertyCriteria ?? [],
      customCriteria: customCriteria ?? existing?.customCriteria ?? [],
      excludedCharacteristics: excludedCharacteristics ?? existing?.excludedCharacteristics ?? [],
      customExclusions: customExclusions ?? existing?.customExclusions ?? [],
      // Derived from questionnaire — auto-bundled
      entityType: entity.type,
      entityName: entity.name,
      timeline: q?.timeframe ?? '',
      fundingMethod: q?.fundingMethod ?? '',
      coInvestor: q?.coInvestor ?? 'No',
      p2Name: q?.coInvestor === 'Yes' ? `${q.p2FirstName || ''} ${q.p2LastName || ''}`.trim() : '',
      status: newStatus,
      updatedAt: now,
      createdAt: existing?.createdAt || now,
      publishedAt: newStatus === 'published' && !existing?.publishedAt ? now : (existing?.publishedAt ?? null),
    };

    await briefStore.setJSON(clientId, brief);
    return json({ ok: true, brief });
  }

  return new Response('Method Not Allowed', { status: 405 });
};

export const config = { path: '/api/admin/brief', method: ['GET', 'POST'] };
