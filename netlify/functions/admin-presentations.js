import { getStore } from '@netlify/blobs';
import crypto from 'crypto';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

function checkAdmin(req) {
  const auth = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  return auth === process.env.ADMIN_PASSWORD;
}

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

function genToken() {
  return crypto.randomBytes(20).toString('hex');
}

function buildPropertyEmail(clientName, address, price, link) {
  const firstName = clientName.split(' ')[0];
  const priceStr = price ? ` &mdash; ${price}` : '';
  return `<!DOCTYPE html><html lang="en" style="background:#181614;"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Property Presentation &mdash; Fairway</title></head>
<body style="margin:0;padding:0;background:#181614;font-family:Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#181614"><tr><td align="center" style="padding:40px 16px;">
<table width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;">
  <tr><td style="background:#1C1815;border-radius:20px;border:1px solid rgba(181,113,90,0.2);padding:44px 48px;">
    <p style="margin:0 0 36px;padding-bottom:32px;border-bottom:1px solid rgba(250,246,241,0.08);text-align:center;">
      <img src="https://fairwayinvesting.com.au/logo-word.png" width="200" height="30" alt="Fairway Investing" style="display:inline-block;border:0;max-width:200px;">
    </p>
    <p style="font-size:11px;font-weight:600;letter-spacing:0.2em;text-transform:uppercase;color:#B5715A;margin:0 0 16px;">Property presentation</p>
    <h1 style="font-family:Georgia,'Times New Roman',serif;font-size:30px;font-weight:400;color:#FAF6F1;margin:0 0 12px;line-height:1.25;">${firstName}, I've found a property worth looking at.</h1>
    <p style="font-size:16px;color:rgba(250,246,241,0.6);margin:0 0 32px;line-height:1.65;">I've put together a full presentation for you below. Have a read through when you get a chance &mdash; happy to chat through it.</p>
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:rgba(250,246,241,0.06);border:1px solid rgba(250,246,241,0.1);border-radius:12px;margin:0 0 32px;">
      <tr><td style="padding:24px 28px;">
        <p style="font-size:11px;font-weight:600;letter-spacing:0.18em;text-transform:uppercase;color:#B5715A;margin:0 0 8px;">Property</p>
        <p style="font-size:18px;font-weight:400;color:#FAF6F1;margin:0;line-height:1.4;">${address}${priceStr}</p>
      </td></tr>
    </table>
    <table cellpadding="0" cellspacing="0" border="0"><tr>
      <td style="border-radius:100px;background:#B5715A;">
        <a href="${link}" style="display:inline-block;font-size:15px;font-weight:500;color:#FAF6F1;text-decoration:none;padding:15px 34px;">View full presentation &rarr;</a>
      </td>
    </tr></table>
    <p style="font-size:13px;color:rgba(250,246,241,0.3);margin:28px 0 0;line-height:1.6;">Any questions, reply to this email or call 0416 184 333.</p>
  </td></tr>
  <tr><td style="padding:24px 0 0;text-align:center;">
    <p style="font-size:12px;color:rgba(250,246,241,0.25);margin:0;line-height:1.7;">Fairway Investing &middot; Suite 211, Level 2/5 Alexander Street, Crows Nest NSW 2065<br>
    <a href="mailto:info@fairwayinvesting.com.au" style="color:#B5715A;text-decoration:none;">info@fairwayinvesting.com.au</a> &middot; 0416 184 333</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}

export default async (req) => {
  if (!checkAdmin(req)) return json({ error: 'Unauthorized' }, 401);

  const store = getStore('fairway-presentations');
  const presentations = (await store.get('all', { type: 'json' })) || [];

  if (req.method === 'GET') {
    return json(presentations);
  }

  if (req.method === 'POST') {
    const { address, suburb, price, bedrooms, bathrooms, carspaces, landSize,
            propertyType, videoUrl, imageUrl, summary, highlights,
            assignedClients = [] } = await req.json().catch(() => ({}));
    if (!address) return json({ error: 'address required' }, 400);
    const tokens = {};
    const views = {};
    assignedClients.forEach(cid => {
      tokens[cid] = genToken();
      views[cid] = { firstViewedAt: null, viewCount: 0 };
    });
    const pres = {
      id: crypto.randomUUID(),
      address, suburb: suburb || '', price: price || '',
      bedrooms: bedrooms || '', bathrooms: bathrooms || '', carspaces: carspaces || '',
      landSize: landSize || '', propertyType: propertyType || 'house',
      videoUrl: videoUrl || '', imageUrl: imageUrl || '',
      summary: summary || '', highlights: Array.isArray(highlights) ? highlights : [],
      assignedClients, tokens, views, sentClients: [],
      createdAt: new Date().toISOString(),
    };
    presentations.push(pres);
    await store.setJSON('all', presentations);
    return json({ ok: true, id: pres.id }, 201);
  }

  if (req.method === 'PUT') {
    const body = await req.json().catch(() => ({}));
    const { id, action } = body;
    const idx = presentations.findIndex(p => p.id === id);
    if (idx === -1) return json({ error: 'Not found' }, 404);

    if (action === 'send') {
      const clientStore = getStore('fairway-clients');
      const allClients = (await clientStore.get('all', { type: 'json' })) || [];
      const pres = presentations[idx];
      const toSend = pres.assignedClients.filter(cid => !pres.sentClients.includes(cid));
      let sent = 0;
      for (const cid of toSend) {
        const client = allClients.find(c => c.id === cid);
        if (!client) continue;
        const tok = pres.tokens[cid];
        const link = `https://fairwayinvesting.com.au/p/property.html?t=${tok}`;
        try {
          await resend.emails.send({
            from: 'Luke at Fairway <info@fairwayinvesting.com.au>',
            to: [client.email],
            reply_to: 'luke@fairwayinvesting.com.au',
            subject: `Property opportunity — ${pres.address}`,
            html: buildPropertyEmail(client.name, pres.address, pres.price, link),
          });
          pres.sentClients.push(cid);
          sent++;
        } catch (err) {
          console.error('Send failed:', err?.message || err);
        }
      }
      presentations[idx] = pres;
      await store.setJSON('all', presentations);
      return json({ ok: true, sent });
    }

    const { address, suburb, price, bedrooms, bathrooms, carspaces, landSize,
            propertyType, videoUrl, imageUrl, summary, highlights, assignedClients } = body;
    const pres = presentations[idx];
    if (address !== undefined) pres.address = address;
    if (suburb !== undefined) pres.suburb = suburb;
    if (price !== undefined) pres.price = price;
    if (bedrooms !== undefined) pres.bedrooms = bedrooms;
    if (bathrooms !== undefined) pres.bathrooms = bathrooms;
    if (carspaces !== undefined) pres.carspaces = carspaces;
    if (landSize !== undefined) pres.landSize = landSize;
    if (propertyType !== undefined) pres.propertyType = propertyType;
    if (videoUrl !== undefined) pres.videoUrl = videoUrl;
    if (imageUrl !== undefined) pres.imageUrl = imageUrl;
    if (summary !== undefined) pres.summary = summary;
    if (highlights !== undefined) pres.highlights = Array.isArray(highlights) ? highlights : [];
    if (assignedClients !== undefined) {
      assignedClients.forEach(cid => {
        if (!pres.tokens[cid]) {
          pres.tokens[cid] = genToken();
          pres.views[cid] = { firstViewedAt: null, viewCount: 0 };
        }
      });
      pres.assignedClients = assignedClients;
    }
    presentations[idx] = pres;
    await store.setJSON('all', presentations);
    return json({ ok: true });
  }

  if (req.method === 'DELETE') {
    const id = new URL(req.url).searchParams.get('id');
    if (!id) return json({ error: 'id required' }, 400);
    const updated = presentations.filter(p => p.id !== id);
    if (updated.length === presentations.length) return json({ error: 'Not found' }, 404);
    await store.setJSON('all', updated);
    return json({ ok: true });
  }

  return new Response('Method Not Allowed', { status: 405 });
};

export const config = {
  path: '/api/admin/presentations',
  method: ['GET', 'POST', 'PUT', 'DELETE'],
};
