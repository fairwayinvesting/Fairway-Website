import { getStore } from '@netlify/blobs';
import { Resend } from 'resend';
import { generateAgreementPdf } from './_pdf-agreement.js';
import { appendAudit } from './_audit.js';

async function loadAgentSignature() {
  try {
    const dataUrl = await getStore('fairway-settings').get('agent-signature', { type: 'text' });
    if (!dataUrl) return null;
    return Buffer.from(dataUrl.replace(/^data:[^,]+,/, ''), 'base64');
  } catch {
    return null;
  }
}

const resend = new Resend(process.env.RESEND_API_KEY);
const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

function fmt(n) { return '$' + Number(n).toLocaleString('en-AU'); }

export default async (req) => {
  const token = new URL(req.url).searchParams.get('token');
  if (!token) return json({ error: 'Missing token' }, 400);

  const store = getStore('fairway-prospects');
  const all = (await store.get('all', { type: 'json' }).catch(() => null)) || [];
  const idx = all.findIndex(p => p.agreement?.signToken === token);

  if (idx === -1) return json({ error: 'This signing link is invalid or has already been used.' }, 404);

  const prospect = all[idx];
  const ag = prospect.agreement;

  if (ag.signTokenExpiry && new Date(ag.signTokenExpiry) < new Date()) {
    return json({ error: 'This signing link has expired. Please contact Luke to receive a new one.' }, 410);
  }
  if (ag.status === 'signed') {
    return json({ error: 'This agreement has already been signed.' }, 409);
  }

  // GET — return agreement data for the signing page
  if (req.method === 'GET') {
    const effectiveFee = ag.customFee ?? ag.fee;
    const gst = Math.round(effectiveFee * 0.1);
    const total = effectiveFee + gst;
    const isSplit = ag.package === 'split';
    // Return agent signature URL so the signing page can display it
    const agentSigDataUrl = await getStore('fairway-settings').get('agent-signature', { type: 'text' }).catch(() => null);
    return json({
      prospectName: prospect.name,
      package: ag.package,
      fee: effectiveFee,
      gst,
      total,
      halfFee: Math.round(total / 2),
      isSplit,
      exclusivityTerm: ag.customExclusivityTerm || ag.exclusivityTerm || '6 months',
      purchaseType: ag.purchaseType || 'Residential',
      priceRange: ag.priceRange || '',
      residentialAddress: ag.residentialAddress || '',
      customRefundClause: ag.customRefundClause || null,
      customClauses: ag.customClauses || null,
      agentSignatureUrl: agentSigDataUrl || null,
    });
  }

  // POST — submit the signature
  if (req.method === 'POST') {
    const body = await req.json().catch(() => null);
    if (!body?.signerName?.trim() || !body?.agreed) {
      return json({ error: 'Please type your full name and confirm you agree to the terms.' }, 400);
    }

    const signerName = body.signerName.trim();
    const signerIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || req.headers.get('x-real-ip') || 'unknown';

    // Record the signature
    ag.status = 'signed';
    ag.signToken = null;
    ag.signTokenExpiry = null;
    ag.signedAt = new Date().toISOString();
    ag.signerName = signerName;
    ag.signerIp = signerIp;
    if (body.signatureDataUrl && body.signatureDataUrl.startsWith('data:image/')) {
      ag.signerSignatureUrl = body.signatureDataUrl;
    }

    // Set up payment tracking
    const effectiveFee = ag.customFee ?? ag.fee;
    const gst = Math.round(effectiveFee * 0.1);
    const total = effectiveFee + gst;
    const isSplit = ag.package === 'split';
    const halfFee = Math.round(total / 2);

    prospect.payments = {
      invoiceEntity: null,
      engagement: { amount: isSplit ? halfFee : total, status: 'pending', receivedAt: null, invoiceSentAt: null, invoicePdfBlobKey: null },
      success: isSplit ? { amount: halfFee, status: 'pending', receivedAt: null, invoiceSentAt: null, invoicePdfBlobKey: null } : null,
    };

    // Generate the signed PDF
    const agentSignatureData = await loadAgentSignature();
    let pdfBuffer;
    try {
      pdfBuffer = await generateAgreementPdf(prospect, { agentSignatureData });
      const pdfKey = `agreements/${prospect.id}/v${ag.version || 1}.pdf`;
      await getStore('fairway-agreements').set(pdfKey, pdfBuffer, { metadata: { contentType: 'application/pdf' } });
      ag.pdfBlobKey = pdfKey;
    } catch (err) {
      console.error('Agreement PDF failed:', err?.message || err);
    }

    await store.setJSON('all', all);

    // Send confirmation emails (fire-and-forget)
    const signedDate = new Date(ag.signedAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });
    const paymentInfo = isSplit
      ? `50% on signing (${fmt(halfFee)}) and 50% when your property goes unconditional (${fmt(halfFee)})`
      : `${fmt(total)} in full`;
    const attachments = pdfBuffer ? [{ filename: `Fairway-Engagement-Agreement-${prospect.name.replace(/\s+/g, '-')}.pdf`, content: pdfBuffer }] : [];

    Promise.all([
      resend.emails.send({
        from: 'Luke at Fairway <info@fairwayinvesting.com.au>',
        to: [prospect.email],
        reply_to: 'luke@fairwayinvesting.com.au',
        subject: 'Your signed Fairway Engagement Agreement',
        html: buildSignedClientEmail(prospect.name, signedDate, paymentInfo, isSplit, fmt(total), fmt(halfFee)),
        attachments,
      }),
      resend.emails.send({
        from: 'Fairway Portal <info@fairwayinvesting.com.au>',
        to: ['luke@fairwayinvesting.com.au'],
        subject: `✅ ${prospect.name} signed their engagement agreement`,
        html: buildSignedLukeEmail(prospect.name, prospect.email, signerName, signedDate, ag.package, fmt(total)),
        attachments,
      }),
    ]).catch(err => console.error('Post-signing emails failed:', err?.message || err));

    appendAudit('agreement_signed', `${prospect.name} <${prospect.email}> signed their engagement agreement (IP: ${signerIp})`);
    return json({ ok: true, name: prospect.name });
  }

  return json({ error: 'Method not allowed' }, 405);
};

function buildSignedClientEmail(name, signedDate, paymentInfo, isSplit, fmtTotal, fmtHalf) {
  return `<!DOCTYPE html><html lang="en" style="background:#181614;"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#181614;font-family:Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#181614"><tr><td align="center" style="padding:40px 16px;">
<table width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;">
<tr><td style="background:#1C1815;border-radius:20px;border:1px solid rgba(181,113,90,0.2);padding:44px 48px;">
<p style="margin:0 0 36px;padding-bottom:32px;border-bottom:1px solid rgba(250,246,241,0.08);text-align:center;">
<img src="https://fairwayinvesting.com.au/logo-icon.png" width="28" height="28" alt="" style="display:inline-block;border:0;vertical-align:middle;margin-right:10px;">
<img src="https://fairwayinvesting.com.au/logo-word.png" width="160" height="24" alt="Fairway Investing" style="display:inline-block;border:0;vertical-align:middle;max-width:160px;"></p>
<p style="font-size:11px;font-weight:600;letter-spacing:0.2em;text-transform:uppercase;color:#B5715A;margin:0 0 16px;">Agreement Confirmed</p>
<h1 style="font-family:Georgia,'Times New Roman',serif;font-size:28px;font-weight:400;color:#FAF6F1;margin:0 0 12px;line-height:1.2;">You're all signed up, ${name}.</h1>
<p style="font-size:15px;color:rgba(250,246,241,0.65);margin:0 0 28px;line-height:1.7;">Thank you for signing your Buyer Engagement Agreement with Fairway Investing. Your signed copy is attached to this email — please save it for your records.</p>
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:rgba(250,246,241,0.05);border:1px solid rgba(250,246,241,0.1);border-radius:12px;margin:0 0 28px;"><tr><td style="padding:20px 24px;">
<span style="font-size:11px;color:rgba(250,246,241,0.4);display:block;margin-bottom:6px;">SIGNED ON</span>
<span style="font-size:15px;color:#FAF6F1;">${signedDate}</span>
<span style="font-size:11px;color:rgba(250,246,241,0.4);display:block;margin:14px 0 6px;">PAYMENT</span>
<span style="font-size:14px;color:#FAF6F1;">${paymentInfo}</span>
</td></tr></table>
<p style="font-size:14px;color:rgba(250,246,241,0.55);margin:0;line-height:1.7;">Luke will be in touch shortly with next steps. In the meantime, feel free to reach out anytime:<br>
<a href="tel:0416184333" style="color:#B5715A;text-decoration:none;">0416 184 333</a>&nbsp;&nbsp;·&nbsp;&nbsp;<a href="mailto:luke@fairwayinvesting.com.au" style="color:#B5715A;text-decoration:none;">luke@fairwayinvesting.com.au</a></p>
</td></tr>
<tr><td style="padding:24px 0 0;text-align:center;"><p style="font-size:12px;color:rgba(250,246,241,0.25);margin:0;line-height:1.7;">Fairway Investing &middot; Suite 211, Level 2/5 Alexander Street, Crows Nest NSW 2065</p></td></tr>
</table></td></tr></table></body></html>`;
}

function buildSignedLukeEmail(name, email, signerName, signedDate, pkg, fmtTotal) {
  return `<!DOCTYPE html><html lang="en" style="background:#181614;"><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#181614;font-family:Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" style="padding:40px 16px;">
<table width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
<tr><td style="background:#1C1815;border-radius:20px;border:1px solid rgba(181,113,90,0.2);padding:44px 48px;">
<p style="font-size:11px;font-weight:600;letter-spacing:0.2em;text-transform:uppercase;color:#B5715A;margin:0 0 16px;">New Signed Agreement</p>
<h1 style="font-family:Georgia,'Times New Roman',serif;font-size:26px;font-weight:400;color:#FAF6F1;margin:0 0 20px;">${name} has signed their engagement agreement.</h1>
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:rgba(250,246,241,0.05);border:1px solid rgba(250,246,241,0.1);border-radius:12px;margin:0 0 24px;"><tr><td style="padding:20px 24px;">
<table width="100%" cellpadding="0" cellspacing="0" border="0">
<tr><td style="padding:4px 0;"><span style="font-size:11px;color:rgba(250,246,241,0.4);">Email</span></td><td align="right"><span style="font-size:13px;color:#FAF6F1;">${email}</span></td></tr>
<tr><td style="padding:4px 0;"><span style="font-size:11px;color:rgba(250,246,241,0.4);">Signed as</span></td><td align="right"><span style="font-size:13px;color:#FAF6F1;font-style:italic;">${signerName}</span></td></tr>
<tr><td style="padding:4px 0;"><span style="font-size:11px;color:rgba(250,246,241,0.4);">Date</span></td><td align="right"><span style="font-size:13px;color:#FAF6F1;">${signedDate}</span></td></tr>
<tr><td style="padding:4px 0;"><span style="font-size:11px;color:rgba(250,246,241,0.4);">Package</span></td><td align="right"><span style="font-size:13px;color:#FAF6F1;">${pkg === 'split' ? '50/50 Split' : 'Pay in Full'} · ${fmtTotal} inc GST</span></td></tr>
</table></td></tr></table>
<p style="font-size:14px;color:rgba(250,246,241,0.6);margin:0;line-height:1.7;">The signed PDF is attached. Open the Prospects section in your admin portal to mark payment received and convert them to a client when ready.</p>
</td></tr></table></td></tr></table></body></html>`;
}

export const config = {
  path: '/api/sign-agreement',
  method: ['GET', 'POST'],
};
