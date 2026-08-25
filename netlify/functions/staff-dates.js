import { getStore } from '@netlify/blobs';
import { getStaffPayload, hasModule } from './_staff-auth.js';

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

export const MILESTONE_LABELS = {
  finance:                  'Subject to Finance',
  building_pest:            'Building & Pest',
  bp_inspection:            'B&P Inspection Date',
  contracts:                'Contracts Exchanged',
  cooling_off:              'Cooling Off End',
  pre_settlement_inspection:'Pre-Settlement Inspection',
  settlement:               'Settlement',
  preapproval:              'Pre-Approval Expiry',
  custom:                   'Custom',
};

export default async (req) => {
  if (req.method !== 'GET') return new Response('Method Not Allowed', { status: 405 });

  const payload = await getStaffPayload(req);
  if (!payload) return json({ error: 'Unauthorized' }, 401);
  if (!hasModule(payload, 'dates')) return json({ error: 'Access denied' }, 403);

  const { assignedClients = [] } = payload;
  if (!assignedClients.length) return json([]);

  const clientStore = getStore({ name: 'fairway-clients', consistency: 'strong' });
  const msStore = getStore({ name: 'fairway-milestones', consistency: 'strong' });

  const allClients = (await clientStore.get('all', { type: 'json' }).catch(() => null)) || [];
  const visibleClients = allClients.filter(c => !c.deleted && c.active && assignedClients.includes(c.id));

  const result = await Promise.all(
    visibleClients.map(async (c) => {
      const milestones = (await msStore.get(c.id, { type: 'json' }).catch(() => null)) || [];
      return {
        clientId: c.id,
        clientName: c.name,
        milestones: milestones.map(m => ({
          id: m.id,
          type: m.type,
          label: m.customLabel || MILESTONE_LABELS[m.type] || m.type,
          date: m.date,
          acqId: m.acqId || null,
        })),
      };
    })
  );

  return json(result);
};

export const config = { path: '/api/staff/dates', method: ['GET'] };
