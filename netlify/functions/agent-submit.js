import { getStore } from '@netlify/blobs';
import crypto from 'crypto';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

function checkKey(req) {
  const url = new URL(req.url);
  const k = url.searchParams.get('k') || req.headers.get('x-agent-key') || '';
  return !!(process.env.AGENT_SUBMIT_KEY && k === process.env.AGENT_SUBMIT_KEY);
}

export default async (req) => {
  if (!checkKey(req)) return json({ error: 'Invalid access key' }, 401);

  if (req.method === 'GET') return json({ ok: true });

  if (req.method === 'POST') {
    const body = await req.json().catch(() => ({}));
    const { agentName, address } = body;
    if (!agentName?.trim()) return json({ error: 'Agent name required' }, 400);
    if (!address?.trim())   return json({ error: 'Property address required' }, 400);

    const store = getStore('fairway-presentations');
    const all = (await store.get('all', { type: 'json' }).catch(() => null)) || [];

    const pres = {
      id: crypto.randomUUID(),
      source: 'agent',
      agentSubmission: {
        agentName:       body.agentName?.trim()  || '',
        agentAgency:     body.agentAgency?.trim() || '',
        agentPhone:      body.agentPhone?.trim()  || '',
        agentEmail:      body.agentEmail?.trim()  || '',
        agentAssessment: body.agentAssessment?.trim() || '',
        submittedAt:     new Date().toISOString(),
      },
      address:      body.address?.trim()  || '',
      suburb:       body.suburb?.trim()   || '',
      price:        body.price?.trim()    || '',
      bedrooms:     body.bedrooms?.trim() || '',
      bathrooms:    body.bathrooms?.trim() || '',
      carspaces:    body.carspaces?.trim() || '',
      landSize:     body.landSize?.trim()  || '',
      propertyType: body.propertyType || 'house',
      propertyDescription: body.description?.trim() || '',
      summary:      '',
      highlights:   Array.isArray(body.features) ? body.features.map(f => f?.trim()).filter(Boolean) : [],
      knownIssues:  body.knownIssues?.trim() || '',
      images:       Array.isArray(body.images)  ? body.images.filter(i => i?.url) : [],
      videos:       Array.isArray(body.videos)  ? body.videos.filter(v => v?.url) : [],
      cashflow:     { enabled: false, purchasePrice: '', weeklyRent: body.weeklyRent?.trim() || '', interestRate: '', lvr: '80', managementFee: '8', annualRates: '', annualInsurance: '', annualMaintenance: '' },
      riskProfile:  { enabled: false, risks: [] },
      demographics: { enabled: false, ownerOccupier: '', renter: '', publicHousing: '', notes: '', imageUrl: '' },
      customSections:    [],
      comparableSales:   { enabled: false, items: [] },
      comparableRentals: { enabled: false, items: [] },
      revocationReason: '',
      status: '',
      expiresAt: null,
      assignedClients: [],
      revokedClients: [],
      tokens: {}, views: {}, sentClients: [],
      previewToken: null,
      createdAt: new Date().toISOString(),
    };

    all.push(pres);
    await store.setJSON('all', all);

    const addr = `${pres.address}${pres.suburb ? ', ' + pres.suburb : ''}`;
    const photoCount = pres.images.length;
    const videoCount = pres.videos.length;
    const mediaLine = [photoCount && `${photoCount} photo${photoCount !== 1 ? 's' : ''}`, videoCount && `${videoCount} video${videoCount !== 1 ? 's' : ''}`].filter(Boolean).join(' · ') || 'No media';

    // Slack
    const slackUrl = process.env.SLACK_AGENT_WEBHOOK_URL || process.env.SLACK_WEBHOOK_URL;
    if (slackUrl) {
      await fetch(slackUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `🏠 New agent submission — ${addr}`,
          blocks: [
            { type: 'header', text: { type: 'plain_text', text: '🏠 New property submission from agent', emoji: true } },
            { type: 'section', text: { type: 'mrkdwn', text: `*${addr}*\nFrom: *${pres.agentSubmission.agentName}*${pres.agentSubmission.agentAgency ? ' — ' + pres.agentSubmission.agentAgency : ''}\n${mediaLine}` } },
            { type: 'context', elements: [{ type: 'mrkdwn', text: `Review in the <https://fairwayinvesting.com.au/admin/|admin portal> under Presentations` }] },
          ],
        }),
      }).catch(() => {});
    }

    // Email
    if (process.env.RESEND_API_KEY) {
      await resend.emails.send({
        from: 'Fairway Portal <info@fairwayinvesting.com.au>',
        to: ['luke@fairwayinvesting.com.au'],
        subject: `🏠 New agent submission — ${addr}`,
        html: `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#181614;font-family:Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 16px;">
<table width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;">
<tr><td style="background:#1C1815;border-radius:18px;border:1px solid rgba(181,113,90,0.2);padding:32px 36px;">
  <p style="font-size:11px;font-weight:600;letter-spacing:0.2em;text-transform:uppercase;color:#B5715A;margin:0 0 8px;">Agent submission</p>
  <h1 style="font-family:Georgia,serif;font-size:22px;font-weight:400;color:#FAF6F1;margin:0 0 20px;">${addr}</h1>
  <p style="font-size:14px;color:rgba(250,246,241,0.6);margin:0 0 4px;">From: <strong style="color:#FAF6F1;">${pres.agentSubmission.agentName}</strong>${pres.agentSubmission.agentAgency ? ' — ' + pres.agentSubmission.agentAgency : ''}</p>
  ${pres.agentSubmission.agentPhone ? `<p style="font-size:13px;color:rgba(250,246,241,0.45);margin:2px 0;">${pres.agentSubmission.agentPhone}</p>` : ''}
  ${pres.agentSubmission.agentEmail ? `<p style="font-size:13px;color:rgba(250,246,241,0.45);margin:2px 0 16px;">${pres.agentSubmission.agentEmail}</p>` : '<p style="margin:0 0 16px;"></p>'}
  <p style="font-size:13px;color:rgba(250,246,241,0.45);margin:0 0 20px;">${mediaLine}</p>
  <table cellpadding="0" cellspacing="0"><tr><td style="border-radius:100px;background:#B5715A;">
    <a href="https://fairwayinvesting.com.au/admin/" style="display:inline-block;font-size:14px;font-weight:500;color:#FAF6F1;text-decoration:none;padding:12px 28px;">Review in admin portal →</a>
  </td></tr></table>
</td></tr></table>
</td></tr></table>
</body></html>`,
      }).catch(() => {});
    }

    return json({ ok: true });
  }

  return new Response('Method Not Allowed', { status: 405 });
};

export const config = { path: '/api/agent-submit', method: ['GET', 'POST'] };
