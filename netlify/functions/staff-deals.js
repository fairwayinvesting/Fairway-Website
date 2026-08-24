import { getStore } from '@netlify/blobs';
import { getStaffPayload, hasModule } from './_staff-auth.js';

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

const DEAL_STATUSES = new Set(['allocated', 'sent']);

export default async (req) => {
  const payload = await getStaffPayload(req);
  if (!payload) return json({ error: 'Unauthorized' }, 401);
  if (!hasModule(payload, 'my-deals')) return json({ error: 'Access denied' }, 403);

  if (req.method !== 'GET') return new Response('Method Not Allowed', { status: 405 });

  const presStore = getStore('fairway-presentations');
  const clientStore = getStore('fairway-clients');

  const [allPres, allClients] = await Promise.all([
    presStore.get('all', { type: 'json' }).catch(() => null).then(d => d || []),
    clientStore.get('all', { type: 'json' }).catch(() => null).then(d => d || []),
  ]);

  const canViewCommissions = !!payload.permissions?.canViewCommissions;
  const assignedClientIds = new Set(payload.assignedClients || []);

  // Deals = presentations sourced by this contractor that are allocated or sent
  const deals = allPres
    .filter(p => p.sourcedById === payload.userId && DEAL_STATUSES.has(p.reviewStatus))
    .map(p => {
      // Map assigned client IDs to first names (privacy — only names, no emails/phones)
      const clientNames = (p.assignedClients || []).map(cid => {
        const c = allClients.find(x => x.id === cid);
        if (!c) return null;
        // First name only for privacy
        return c.name.split(' ')[0];
      }).filter(Boolean);

      const deal = {
        id:           p.id,
        address:      p.address,
        suburb:       p.suburb || '',
        price:        p.price  || '',
        reviewStatus: p.reviewStatus,
        allocatedAt:  p.reviewStatusUpdatedAt || null,
        clientNames,
        suitableClients: p.suitableClients || [],
        shortlistId:  p.shortlistId || null,
      };

      if (canViewCommissions) {
        deal.contractorCommission       = p.contractorCommission       ?? null;
        deal.contractorCommissionNote   = p.contractorCommissionNote   || '';
        deal.contractorCommissionPaidAt = p.contractorCommissionPaidAt || null;
      }

      return deal;
    });

  return json(deals);
};

export const config = { path: '/api/staff/deals', method: ['GET'] };
