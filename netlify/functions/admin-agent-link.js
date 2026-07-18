// Returns the shareable agent submission URL so the admin UI can copy it to clipboard.

import { checkAdmin } from './_admin-auth.js';

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

export default async (req) => {
  if (!checkAdmin(req)) return json({ error: 'Unauthorized' }, 401);
  const key = process.env.AGENT_SUBMIT_KEY;
  if (!key) return json({ error: 'AGENT_SUBMIT_KEY env var not set' }, 500);
  return json({ url: `https://fairwayinvesting.com.au/agents/submit.html?k=${key}` });
};

export const config = { path: '/api/admin/agent-link', method: ['GET'] };
