import { getStore } from '@netlify/blobs';
import crypto from 'crypto';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

function buildQuestNotifyEmail(clientName, clientEmail) {
  const adminLink = 'https://fairwayinvesting.com.au/admin/';
  return `<!DOCTYPE html><html lang="en" style="background:#181614;"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Questionnaire submitted — Fairway</title>
<style>@media only screen and (max-width:600px){.ew{padding:32px 22px!important;border-radius:14px!important;}.eh1{font-size:24px!important;}}</style>
</head>
<body style="margin:0;padding:0;background:#181614;font-family:Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#181614"><tr><td align="center" style="padding:40px 16px;background:#181614;">
<table width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;">
  <tr><td class="ew" style="background:#1C1815;border-radius:20px;border:1px solid rgba(181,113,90,0.2);padding:44px 48px;">
    <p style="margin:0 0 36px;padding-bottom:32px;border-bottom:1px solid rgba(250,246,241,0.08);text-align:center;">
      <img src="https://fairwayinvesting.com.au/logo-word.png" width="200" height="30" alt="Fairway Investing" style="display:inline-block;border:0;max-width:200px;">
    </p>
    <p style="font-size:11px;font-weight:600;letter-spacing:0.2em;text-transform:uppercase;color:#B5715A;margin:0 0 16px;">Questionnaire</p>
    <h1 class="eh1" style="font-family:Georgia,'Times New Roman',serif;font-size:30px;font-weight:400;color:#FAF6F1;margin:0 0 12px;line-height:1.2;">${clientName} submitted their questionnaire.</h1>
    <p style="font-size:16px;color:rgba(250,246,241,0.6);margin:0 0 32px;line-height:1.65;">Their answers are waiting in the admin portal. Review the questionnaire and create their Buying Brief when ready.</p>
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:rgba(250,246,241,0.06);border:1px solid rgba(250,246,241,0.1);border-radius:12px;margin:0 0 32px;">
      <tr><td style="padding:20px 24px;">
        <span style="font-size:11px;color:rgba(250,246,241,0.4);display:block;margin-bottom:4px;">CLIENT EMAIL</span>
        <span style="font-size:14px;color:#FAF6F1;font-family:Courier,monospace;">${clientEmail}</span>
      </td></tr>
    </table>
    <table cellpadding="0" cellspacing="0" border="0"><tr>
      <td style="border-radius:100px;background:#B5715A;">
        <a href="${adminLink}" style="display:inline-block;font-size:15px;font-weight:500;color:#FAF6F1;text-decoration:none;padding:15px 34px;">Open admin portal &rarr;</a>
      </td>
    </tr></table>
  </td></tr>
  <tr><td style="padding:24px 0 0;text-align:center;">
    <p style="font-size:12px;color:rgba(250,246,241,0.25);margin:0;line-height:1.7;">Fairway Investing &middot; Suite 211, Level 2/5 Alexander Street, Crows Nest NSW 2065<br>
    <a href="mailto:info@fairwayinvesting.com.au" style="color:#B5715A;text-decoration:none;">info@fairwayinvesting.com.au</a> &middot; 0416 184 333</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}

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

function buildSheetRow(timestamp, d) {
  const props = d.properties || [];
  const propCols = [];
  for (let i = 0; i < 7; i++) {
    const p = props[i] || {};
    const ownAnother = i < props.length - 1 ? 'Yes' : (props[i] ? 'No' : '');
    propCols.push(
      p.state || '', p.type || '', p.purchaseDate || '',
      p.valuation || '', p.loanBalance || '', p.weeklyRent || '',
      p.interestRate || '', p.loanStructure || '', ownAnother
    );
  }

  return [
    timestamp,
    d.firstName || '', d.middleName || '', d.lastName || '',
    d.dob || '', d.email || '', d.phone || '',
    d.state || '', d.homeAddress || '',
    d.coInvestor || 'No',
    d.p2FirstName || '', d.p2MiddleName || '', d.p2LastName || '',
    d.p2Dob || '', d.p2Email || '', d.p2Phone || '',
    d.p2State || '', d.p2HomeAddress || '',
    d.entityType || 'Individual',
    d.companyName || '', d.companyPersonnel || '', d.companyAbn || '', d.companyAcn || '', d.companyTfn || '',
    d.trustName || '', d.trustBeneficiaries || '', d.trustAddress || '', d.trustAbn || '', d.trustTfn || '',
    d.smsfName || '', d.smsfMembers || '', d.smsfAddress || '', d.smsfAbn || '', d.smsfTfn || '',
    d.motivation || '', d.timeframe || '', d.riskTolerance || '',
    d.fundingMethod || '', d.cashSavings || '', d.annualSalary || '',
    d.dependants || '', d.weeklyRentPaid || '', d.otherDebts || '',
    d.ownProperties || 'No',
    ...propCols,
    d.hasBroker || 'No',
    d.brokerName || '', d.brokerEmail || '', d.brokerPhone || '',
    d.brokerCapacity || '', d.brokerIntro || '',
    d.hasAccountant || 'No',
    d.accountantName || '', d.accountantEmail || '', d.accountantPhone || '',
    d.accountantIntro || '',
    d.statesToAvoid || 'No', d.statesToAvoidList || '',
    d.maxPurchasePrice || '',
    // PPOR columns (add matching headers to Google Sheet)
    d.ownPpor || 'No',
    d.pporState || '', d.pporType || '', d.pporValue || '',
    d.pporLoan || '', d.pporRate || '', d.pporStructure || '',
  ];
}

function blobKey(email) {
  return email.toLowerCase().replace(/[^a-z0-9]/g, '-');
}

export default async (req) => {
  const cookie = req.headers.get('cookie') || '';
  const match = cookie.match(/fw_session=([^;]+)/);
  if (!match) return json({ error: 'Not authenticated' }, 401);

  const payload = verifyJWT(match[1], process.env.JWT_SECRET);
  if (!payload) return json({ error: 'Session expired' }, 401);

  // GET — return existing submission if any
  if (req.method === 'GET') {
    try {
      const store = getStore('fairway-questionnaires');
      const existing = await store.get(blobKey(payload.email), { type: 'json' });
      if (existing) return json({ completed: true, data: existing });
    } catch {}
    return json({ completed: false });
  }

  const body = await req.json().catch(() => null);
  if (!body) return json({ error: 'Invalid request' }, 400);

  const submission = {
    ...body,
    submittedAt: new Date().toISOString(),
    clientEmail: payload.email,
    clientName: payload.name,
  };

  // Primary store: Netlify Blobs (keyed by client email)
  try {
    const store = getStore('fairway-questionnaires');
    await store.setJSON(blobKey(payload.email), submission);
  } catch (err) {
    console.error('Blobs save failed:', err?.message || err);
  }

  // Notify Luke that the questionnaire was submitted
  try {
    await resend.emails.send({
      from: 'Fairway Portal <info@fairwayinvesting.com.au>',
      to: ['luke@fairwayinvesting.com.au'],
      subject: `${submission.clientName} completed their questionnaire`,
      html: buildQuestNotifyEmail(submission.clientName, submission.clientEmail),
    });
  } catch (err) {
    console.error('Questionnaire notify email failed:', err?.message || err);
  }

  // Fan-out: Google Sheets via Apps Script web app
  const sheetEndpoint = process.env.QUESTIONNAIRE_SHEET_ENDPOINT;
  if (sheetEndpoint) {
    try {
      const row = buildSheetRow(submission.submittedAt, submission);
      await fetch(sheetEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ row }),
      });
    } catch (err) {
      console.error('Sheet POST failed:', err?.message || err);
    }
  }

  // Fan-out: Zoho CRM (add when ready)
  // const zohoUrl = process.env.ZOHO_WEBHOOK_URL;
  // if (zohoUrl) { ... }

  return json({ ok: true });
};

export const config = {
  path: '/api/submit-questionnaire',
  method: ['GET', 'POST'],
};

/*
── GOOGLE APPS SCRIPT ───────────────────────────────────────────────────────
Paste this into your Google Sheet → Extensions → Apps Script.
Deploy as a web app: Execute as "Me", access "Anyone".
Copy the deployment URL into Netlify env var: QUESTIONNAIRE_SHEET_ENDPOINT

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    sheet.appendRow(data.row);
    return ContentService.createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
──────────────────────────────────────────────────────────────────────────── */
