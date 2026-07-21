import { getStore } from '@netlify/blobs';
import crypto from 'crypto';
import { Resend } from 'resend';
import { checkAdmin } from './_admin-auth.js';
import { appendAudit } from './_audit.js';
import { generateAgreementPdf, generateInvoicePdf } from './_pdf-agreement.js';

const resend = new Resend(process.env.RESEND_API_KEY);
const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

function fmt(n) { return '$' + Number(n).toLocaleString('en-AU'); }

export default async (req) => {
  if (!(await checkAdmin(req))) return json({ error: 'Unauthorized' }, 401);

  const store = getStore('fairway-prospects');

  // ── GET — list all prospects ──────────────────────────────────────────────
  if (req.method === 'GET') {
    const url = new URL(req.url);
    const pdfKey = url.searchParams.get('pdfKey');

    if (pdfKey) {
      // Return a signed PDF from the agreements store
      const agreementStore = getStore('fairway-agreements');
      const pdfBuf = await agreementStore.get(pdfKey, { type: 'arrayBuffer' }).catch(() => null);
      if (!pdfBuf) return new Response('Not found', { status: 404 });
      return new Response(pdfBuf, { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': 'inline; filename="agreement.pdf"' } });
    }

    const all = (await store.get('all', { type: 'json' }).catch(() => null)) || [];
    return json(all);
  }

  // ── POST — create prospect ────────────────────────────────────────────────
  if (req.method === 'POST') {
    const body = await req.json().catch(() => ({}));
    const { name, email, phone, package: pkg, fee, exclusivityTerm, purchaseType, priceRange, residentialAddress, customRefundClause, customClauses } = body;
    if (!name?.trim() || !email?.trim()) return json({ error: 'Name and email are required' }, 400);

    const all = (await store.get('all', { type: 'json' }).catch(() => null)) || [];
    const effectiveFee = fee || (pkg === 'split' ? 15000 : 12500);

    const prospect = {
      id: crypto.randomUUID(),
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone?.trim() || null,
      createdAt: new Date().toISOString(),
      convertedClientId: null,
      agreement: {
        version: 1,
        status: 'draft',
        package: pkg || 'full',
        fee: effectiveFee,
        exclusivityTerm: exclusivityTerm || '6 months',
        purchaseType: purchaseType || 'Residential',
        priceRange: priceRange || '',
        residentialAddress: residentialAddress || '',
        customFee: null,
        customExclusivityTerm: null,
        customRefundClause: customRefundClause?.trim() || null,
        customClauses: customClauses?.trim() || null,
        signToken: null,
        signTokenExpiry: null,
        sentAt: null,
        signedAt: null,
        signerName: null,
        signerIp: null,
        pdfBlobKey: null,
      },
      payments: null,
    };

    all.push(prospect);
    await store.setJSON('all', all);
    appendAudit('prospect_created', `Created prospect ${prospect.name} <${prospect.email}>`);
    return json({ ok: true, prospect }, 201);
  }

  // ── PUT — actions ─────────────────────────────────────────────────────────
  if (req.method === 'PUT') {
    const body = await req.json().catch(() => ({}));
    const { id, action } = body;
    if (!id) return json({ error: 'id required' }, 400);

    const all = (await store.get('all', { type: 'json' }).catch(() => null)) || [];
    const idx = all.findIndex(p => p.id === id);
    if (idx === -1) return json({ error: 'Prospect not found' }, 404);

    const prospect = all[idx];
    const ag = prospect.agreement;

    // send or resend agreement
    if (action === 'send' || action === 'resend') {
      const token = crypto.randomUUID();
      ag.signToken = token;
      ag.signTokenExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      ag.status = 'sent';
      ag.sentAt = new Date().toISOString();
      await store.setJSON('all', all);

      const signingUrl = `https://fairwayinvesting.com.au/agreements/sign.html?token=${token}`;
      const effectiveFee = ag.customFee ?? ag.fee;
      const gst = Math.round(effectiveFee * 0.1);
      const total = effectiveFee + gst;
      const isSplit = ag.package === 'split';
      const halfFee = Math.round(total / 2);
      const paymentTermsLabel = isSplit
        ? `50% on signing (${fmt(halfFee)}) · 50% on unconditional (${fmt(halfFee)})`
        : `${fmt(total)} in full upon signing`;

      try {
        await resend.emails.send({
          from: 'Luke at Fairway <info@fairwayinvesting.com.au>',
          to: [prospect.email],
          reply_to: 'luke@fairwayinvesting.com.au',
          subject: 'Your Fairway Engagement Agreement — ready to review and sign',
          html: buildAgreementEmail(prospect, signingUrl, fmt(effectiveFee), fmt(gst), fmt(total), paymentTermsLabel, ag.customExclusivityTerm || ag.exclusivityTerm || '6 months', isSplit),
        });
      } catch (err) {
        console.error('Agreement email failed:', err?.message || err);
        return json({ error: 'Failed to send email. Agreement token saved — try resending.' }, 500);
      }

      appendAudit('agreement_sent', `${action === 'resend' ? 'Resent' : 'Sent'} agreement to ${prospect.name} <${prospect.email}>`);
      return json({ ok: true, prospect: all[idx] });
    }

    // amend agreement terms
    if (action === 'amend') {
      const { fee, exclusivityTerm, purchaseType, priceRange, residentialAddress, customRefundClause, customClauses, package: pkg } = body;
      if (pkg !== undefined) ag.package = pkg;
      if (fee !== undefined) { ag.customFee = (fee === ag.fee) ? null : Number(fee); }
      if (exclusivityTerm !== undefined) { ag.customExclusivityTerm = (exclusivityTerm === ag.exclusivityTerm) ? null : exclusivityTerm; }
      if (purchaseType !== undefined) ag.purchaseType = purchaseType;
      if (priceRange !== undefined) ag.priceRange = priceRange;
      if (residentialAddress !== undefined) ag.residentialAddress = residentialAddress;
      if (customRefundClause !== undefined) ag.customRefundClause = customRefundClause?.trim() || null;
      if (customClauses !== undefined) ag.customClauses = customClauses?.trim() || null;
      if (ag.status === 'sent') {
        ag.signToken = null;
        ag.signTokenExpiry = null;
        ag.status = 'draft';
      }
      ag.version = (ag.version || 1) + 1;
      await store.setJSON('all', all);
      appendAudit('agreement_amended', `Amended agreement for ${prospect.name} <${prospect.email}> (v${ag.version})`);
      return json({ ok: true, prospect: all[idx] });
    }

    // mark a payment as received
    if (action === 'mark-payment') {
      const { paymentType } = body;
      if (!prospect.payments?.[paymentType]) return json({ error: 'Payment record not found' }, 400);
      prospect.payments[paymentType].status = 'received';
      prospect.payments[paymentType].receivedAt = new Date().toISOString();
      await store.setJSON('all', all);
      appendAudit('payment_received', `Marked ${paymentType} payment received for ${prospect.name} <${prospect.email}>`);
      return json({ ok: true, prospect: all[idx] });
    }

    // send invoice
    if (action === 'send-invoice') {
      const { paymentType, invoiceEntity } = body;
      if (!prospect.payments?.[paymentType]) return json({ error: 'Payment record not found' }, 400);
      if (invoiceEntity) prospect.payments.invoiceEntity = invoiceEntity;

      const effectiveFee = ag.customFee ?? ag.fee;
      const total = effectiveFee + Math.round(effectiveFee * 0.1);
      const isSplit = ag.package === 'split';
      const halfFee = Math.round(total / 2);
      const entityName = prospect.payments.invoiceEntity || prospect.name;

      // Generate sequential invoice number
      const invoiceSeq = String(all.filter(p => p.payments?.engagement?.invoiceSentAt || p.payments?.success?.invoiceSentAt).length + 1).padStart(4, '0');
      const invoiceNumber = `FW-${new Date().getFullYear()}-${invoiceSeq}`;
      const issuedDate = new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });

      const itemDesc = paymentType === 'engagement'
        ? (isSplit ? "Buyer's Agent Fee — Engagement Payment (50%)" : "Buyer's Agent Fee — Fairway Strategic Residential Purchase Service")
        : "Buyer's Agent Fee — Unconditional Payment (50%)";
      const itemAmount = (paymentType === 'engagement' && !isSplit) ? effectiveFee : halfFee;

      let pdfBuffer;
      try {
        pdfBuffer = await generateInvoicePdf(prospect, { invoiceNumber, invoiceEntity: entityName, items: [{ desc: itemDesc, amount: itemAmount }], issuedDate });
      } catch (err) {
        console.error('Invoice PDF failed:', err?.message || err);
        return json({ error: 'Failed to generate invoice PDF' }, 500);
      }

      const pdfKey = `invoices/${id}/${paymentType}-${Date.now()}.pdf`;
      await getStore('fairway-agreements').set(pdfKey, pdfBuffer, { metadata: { contentType: 'application/pdf' } }).catch(e => console.error('Invoice PDF store failed:', e?.message));

      try {
        await Promise.all([
          resend.emails.send({
            from: 'Fairway Investing <info@fairwayinvesting.com.au>',
            to: [prospect.email],
            reply_to: 'luke@fairwayinvesting.com.au',
            subject: `Tax Invoice #${invoiceNumber} — Fairway Investing`,
            html: buildInvoiceEmail(prospect.name, invoiceNumber, issuedDate, entityName),
            attachments: [{ filename: `Fairway-Invoice-${invoiceNumber}.pdf`, content: pdfBuffer }],
          }),
          resend.emails.send({
            from: 'Fairway Portal <info@fairwayinvesting.com.au>',
            to: ['luke@fairwayinvesting.com.au'],
            subject: `Invoice #${invoiceNumber} sent to ${prospect.name}`,
            html: `<p style="font-family:Helvetica,sans-serif;color:#333;">Invoice <strong>#${invoiceNumber}</strong> has been sent to ${prospect.name} (${prospect.email}). Attached for your records.</p>`,
            attachments: [{ filename: `Fairway-Invoice-${invoiceNumber}.pdf`, content: pdfBuffer }],
          }),
        ]);
      } catch (err) {
        console.error('Invoice email failed:', err?.message || err);
        return json({ error: 'Invoice generated but email failed to send' }, 500);
      }

      prospect.payments[paymentType].invoiceSentAt = new Date().toISOString();
      prospect.payments[paymentType].invoicePdfBlobKey = pdfKey;
      await store.setJSON('all', all);
      appendAudit('invoice_sent', `Sent invoice ${invoiceNumber} to ${prospect.name} <${prospect.email}>`);
      return json({ ok: true, invoiceNumber, prospect: all[idx] });
    }

    // convert prospect to full client
    if (action === 'convert-to-client') {
      if (ag.status !== 'signed') return json({ error: 'Agreement must be signed before converting to a client' }, 400);
      if (prospect.convertedClientId) return json({ error: 'Already converted to a client' }, 400);

      const clientStore = getStore('fairway-clients');
      const clients = (await clientStore.get('all', { type: 'json' }).catch(() => null)) || [];

      const setupToken = crypto.randomUUID();
      const newClient = {
        id: crypto.randomUUID(),
        name: prospect.name,
        email: prospect.email,
        markets: [],
        active: true,
        createdAt: new Date().toISOString(),
        setupToken,
        pipelineStage: 'onboarding',
        pipelineStageUpdatedAt: new Date().toISOString(),
        status: 'active',
        engagementNumber: 1,
        referralSource: null,
        referrerId: null,
        acquisitions: [{
          id: crypto.randomUUID(),
          number: 1,
          label: 'Acquisition 1',
          pipelineStage: 'onboarding',
          markets: [],
          status: 'active',
          questionnaireSubmitted: false,
          createdAt: new Date().toISOString(),
        }],
        customFields: [],
        prospectId: prospect.id,
      };

      clients.push(newClient);
      await clientStore.setJSON('all', clients);
      prospect.convertedClientId = newClient.id;
      await store.setJSON('all', all);

      const setupUrl = `https://fairwayinvesting.com.au/clients/setup.html?token=${setupToken}&email=${encodeURIComponent(prospect.email)}`;
      resend.emails.send({
        from: 'Luke at Fairway <info@fairwayinvesting.com.au>',
        to: [prospect.email],
        reply_to: 'luke@fairwayinvesting.com.au',
        subject: 'Welcome to Fairway — set up your client portal',
        html: buildWelcomeEmail(prospect.name, setupUrl),
      }).catch(err => console.error('Welcome email failed:', err?.message || err));

      appendAudit('prospect_converted', `Converted ${prospect.name} <${prospect.email}> to client ${newClient.id}`);
      return json({ ok: true, clientId: newClient.id });
    }

    // delete prospect
    if (action === 'delete') {
      const { password } = body;
      if (!password || password !== process.env.ADMIN_PASSWORD) return json({ error: 'Incorrect password' }, 403);
      if (prospect.convertedClientId) return json({ error: 'Cannot delete a prospect that has been converted to a client' }, 400);
      all.splice(idx, 1);
      await store.setJSON('all', all);
      appendAudit('prospect_deleted', `Deleted prospect ${prospect.name} <${prospect.email}>`);
      return json({ ok: true });
    }

    return json({ error: 'Unknown action' }, 400);
  }

  return json({ error: 'Method not allowed' }, 405);
};

// ── Email templates ───────────────────────────────────────────────────────────

function buildAgreementEmail(prospect, signingUrl, fmtFee, fmtGst, fmtTotal, paymentTermsLabel, term, isSplit) {
  return `<!DOCTYPE html><html lang="en" style="background:#181614;"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>@media only screen and (max-width:600px){.ew{padding:32px 22px!important;border-radius:14px!important;}.eh1{font-size:24px!important;}}</style>
</head><body style="margin:0;padding:0;background:#181614;font-family:Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#181614"><tr><td align="center" style="padding:40px 16px;">
<table width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;">
<tr><td class="ew" style="background:#1C1815;border-radius:20px;border:1px solid rgba(181,113,90,0.2);padding:44px 48px;">
<p style="margin:0 0 36px;padding-bottom:32px;border-bottom:1px solid rgba(250,246,241,0.08);text-align:center;">
<img src="https://fairwayinvesting.com.au/logo-icon.png" width="28" height="28" alt="" style="display:inline-block;border:0;vertical-align:middle;margin-right:10px;">
<img src="https://fairwayinvesting.com.au/logo-word.png" width="160" height="24" alt="Fairway Investing" style="display:inline-block;border:0;vertical-align:middle;max-width:160px;"></p>
<p style="font-size:11px;font-weight:600;letter-spacing:0.2em;text-transform:uppercase;color:#B5715A;margin:0 0 16px;">Engagement Agreement</p>
<h1 class="eh1" style="font-family:Georgia,'Times New Roman',serif;font-size:28px;font-weight:400;color:#FAF6F1;margin:0 0 16px;line-height:1.2;">Hi ${prospect.name}, your agreement is ready to review and sign.</h1>
<p style="font-size:15px;color:rgba(250,246,241,0.65);margin:0 0 28px;line-height:1.7;">Please take a moment to review your Buyer Engagement Agreement with Fairway Investing. Once you're satisfied with the terms, you can add your electronic signature — it only takes a minute.</p>
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:rgba(250,246,241,0.05);border:1px solid rgba(250,246,241,0.1);border-radius:12px;margin:0 0 28px;">
<tr><td style="padding:20px 24px;">
<table width="100%" cellpadding="0" cellspacing="0" border="0">
<tr><td style="padding:5px 0;border-bottom:1px solid rgba(250,246,241,0.06);"><span style="font-size:11px;color:rgba(250,246,241,0.4);">Package</span></td><td align="right" style="padding:5px 0;border-bottom:1px solid rgba(250,246,241,0.06);"><span style="font-size:13px;color:#FAF6F1;">${isSplit ? '50/50 Split' : 'Pay in Full'}</span></td></tr>
<tr><td style="padding:5px 0;border-bottom:1px solid rgba(250,246,241,0.06);"><span style="font-size:11px;color:rgba(250,246,241,0.4);">Service fee</span></td><td align="right" style="padding:5px 0;border-bottom:1px solid rgba(250,246,241,0.06);"><span style="font-size:13px;color:#FAF6F1;">${fmtFee} + ${fmtGst} GST = ${fmtTotal}</span></td></tr>
<tr><td style="padding:5px 0;border-bottom:1px solid rgba(250,246,241,0.06);"><span style="font-size:11px;color:rgba(250,246,241,0.4);">Payment terms</span></td><td align="right" style="padding:5px 0;border-bottom:1px solid rgba(250,246,241,0.06);"><span style="font-size:13px;color:#FAF6F1;">${paymentTermsLabel}</span></td></tr>
<tr><td style="padding:5px 0;"><span style="font-size:11px;color:rgba(250,246,241,0.4);">Exclusive agency term</span></td><td align="right" style="padding:5px 0;"><span style="font-size:13px;color:#FAF6F1;">${term}</span></td></tr>
</table></td></tr></table>
<table cellpadding="0" cellspacing="0" border="0"><tr><td style="border-radius:100px;background:#B5715A;">
<a href="${signingUrl}" style="display:inline-block;font-size:15px;font-weight:500;color:#FAF6F1;text-decoration:none;padding:15px 34px;">Review &amp; Sign Agreement &rarr;</a>
</td></tr></table>
<p style="font-size:12px;color:rgba(250,246,241,0.3);margin:24px 0 0;line-height:1.6;">This signing link is valid for 30 days. If you have any questions before signing, please reply to this email or call Luke on 0416 184 333.</p>
</td></tr>
<tr><td style="padding:24px 0 0;text-align:center;"><p style="font-size:12px;color:rgba(250,246,241,0.25);margin:0;line-height:1.7;">Fairway Investing &middot; Suite 211, Level 2/5 Alexander Street, Crows Nest NSW 2065<br>
<a href="mailto:info@fairwayinvesting.com.au" style="color:#B5715A;text-decoration:none;">info@fairwayinvesting.com.au</a> &middot; 0416 184 333</p></td></tr>
</table></td></tr></table></body></html>`;
}

function buildInvoiceEmail(name, invoiceNumber, issuedDate, entityName) {
  return `<!DOCTYPE html><html lang="en" style="background:#181614;"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#181614;font-family:Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#181614"><tr><td align="center" style="padding:40px 16px;">
<table width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;">
<tr><td style="background:#1C1815;border-radius:20px;border:1px solid rgba(181,113,90,0.2);padding:44px 48px;">
<p style="margin:0 0 36px;padding-bottom:32px;border-bottom:1px solid rgba(250,246,241,0.08);text-align:center;">
<img src="https://fairwayinvesting.com.au/logo-icon.png" width="28" height="28" alt="" style="display:inline-block;border:0;vertical-align:middle;margin-right:10px;">
<img src="https://fairwayinvesting.com.au/logo-word.png" width="160" height="24" alt="Fairway Investing" style="display:inline-block;border:0;vertical-align:middle;max-width:160px;"></p>
<p style="font-size:11px;font-weight:600;letter-spacing:0.2em;text-transform:uppercase;color:#B5715A;margin:0 0 16px;">Tax Invoice</p>
<h1 style="font-family:Georgia,'Times New Roman',serif;font-size:28px;font-weight:400;color:#FAF6F1;margin:0 0 12px;">Invoice #${invoiceNumber}</h1>
<p style="font-size:15px;color:rgba(250,246,241,0.65);margin:0 0 28px;line-height:1.7;">Hi ${name}, please find your tax invoice from Fairway Investing attached. Please retain this for your tax records.</p>
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:rgba(250,246,241,0.05);border:1px solid rgba(250,246,241,0.1);border-radius:12px;margin:0 0 20px;"><tr><td style="padding:18px 24px;">
<span style="font-size:11px;color:rgba(250,246,241,0.4);display:block;margin-bottom:6px;">BILLED TO</span>
<span style="font-size:15px;color:#FAF6F1;">${entityName}</span>
<span style="font-size:11px;color:rgba(250,246,241,0.4);display:block;margin:10px 0 4px;">DATE ISSUED</span>
<span style="font-size:14px;color:#FAF6F1;">${issuedDate}</span>
</td></tr></table>
<p style="font-size:12px;color:rgba(250,246,241,0.35);margin:0;line-height:1.6;">Questions? Contact <a href="mailto:luke@fairwayinvesting.com.au" style="color:#B5715A;">luke@fairwayinvesting.com.au</a> or call 0416 184 333.</p>
</td></tr>
<tr><td style="padding:24px 0 0;text-align:center;"><p style="font-size:12px;color:rgba(250,246,241,0.25);margin:0;line-height:1.7;">Fairway Investing &middot; Suite 211, Level 2/5 Alexander Street, Crows Nest NSW 2065<br>
<a href="mailto:info@fairwayinvesting.com.au" style="color:#B5715A;text-decoration:none;">info@fairwayinvesting.com.au</a> &middot; 0416 184 333</p></td></tr>
</table></td></tr></table></body></html>`;
}

function buildWelcomeEmail(name, setupUrl) {
  return `<!DOCTYPE html><html lang="en" style="background:#181614;"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#181614;font-family:Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#181614"><tr><td align="center" style="padding:40px 16px;">
<table width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;">
<tr><td style="background:#1C1815;border-radius:20px;border:1px solid rgba(181,113,90,0.2);padding:44px 48px;">
<p style="margin:0 0 36px;padding-bottom:32px;border-bottom:1px solid rgba(250,246,241,0.08);text-align:center;">
<img src="https://fairwayinvesting.com.au/logo-icon.png" width="28" height="28" alt="" style="display:inline-block;border:0;vertical-align:middle;margin-right:10px;">
<img src="https://fairwayinvesting.com.au/logo-word.png" width="160" height="24" alt="Fairway Investing" style="display:inline-block;border:0;vertical-align:middle;max-width:160px;"></p>
<p style="font-size:11px;font-weight:600;letter-spacing:0.2em;text-transform:uppercase;color:#B5715A;margin:0 0 16px;">Welcome to Fairway</p>
<h1 style="font-family:Georgia,'Times New Roman',serif;font-size:28px;font-weight:400;color:#FAF6F1;margin:0 0 12px;">Let's get your portal set up, ${name}.</h1>
<p style="font-size:15px;color:rgba(250,246,241,0.65);margin:0 0 28px;line-height:1.7;">Your Fairway client portal is ready. Click below to create your password — you'll be able to track your property search, review your Buying Brief, and complete your questionnaire.</p>
<table cellpadding="0" cellspacing="0" border="0"><tr><td style="border-radius:100px;background:#B5715A;">
<a href="${setupUrl}" style="display:inline-block;font-size:15px;font-weight:500;color:#FAF6F1;text-decoration:none;padding:15px 34px;">Set up my portal &rarr;</a>
</td></tr></table>
<p style="font-size:12px;color:rgba(250,246,241,0.3);margin:24px 0 0;line-height:1.6;">This link expires in 72 hours. Any questions? Call Luke on 0416 184 333.</p>
</td></tr>
<tr><td style="padding:24px 0 0;text-align:center;"><p style="font-size:12px;color:rgba(250,246,241,0.25);margin:0;line-height:1.7;">Fairway Investing &middot; Suite 211, Level 2/5 Alexander Street, Crows Nest NSW 2065</p></td></tr>
</table></td></tr></table></body></html>`;
}

export const config = {
  path: '/api/admin/agreements',
  method: ['GET', 'POST', 'PUT'],
};
