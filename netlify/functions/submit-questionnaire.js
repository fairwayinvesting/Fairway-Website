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
      <img src="https://fairwayinvesting.com.au/logo-icon.png" width="28" height="28" alt="" style="display:inline-block;border:0;vertical-align:middle;margin-right:10px;">
      <img src="https://fairwayinvesting.com.au/logo-word.png" width="160" height="24" alt="Fairway Investing" style="display:inline-block;border:0;vertical-align:middle;max-width:160px;">
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
    const sa = Buffer.from(sig, 'base64url'), sb = Buffer.from(expected, 'base64url');
    if (sa.length !== sb.length || !crypto.timingSafeEqual(sa, sb)) return null;
    const payload = JSON.parse(Buffer.from(b, 'base64url').toString());
    if (payload.exp && payload.exp < Date.now() / 1000) return null;
    return payload;
  } catch { return null; }
}

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

function buildSheetHeaders() {
  const propHeaders = [];
  for (let i = 0; i < 7; i++) {
    const n = `Property ${i + 1}`;
    propHeaders.push(
      `${n} State`, `${n} Address`, `${n} Type`, `${n} Purchase Date`,
      `${n} Valuation`, `${n} Loan Balance`, `${n} Weekly Rent`,
      `${n} Interest Rate`, `${n} Loan Structure`, `${n} Own Another?`
    );
  }
  return [
    'Submitted At',
    'First Name', 'Middle Name', 'Last Name',
    'Date of Birth', 'Email', 'Phone',
    'State', 'Home Address',
    'Co-Investor?',
    'P2 First Name', 'P2 Middle Name', 'P2 Last Name',
    'P2 Date of Birth', 'P2 Email', 'P2 Phone',
    'P2 State', 'P2 Home Address',
    'Entity Type',
    'Company Name', 'Company Personnel', 'Company ABN', 'Company ACN', 'Company TFN',
    'Trust Name', 'Trust Beneficiaries', 'Trust Address', 'Trust ABN', 'Trust TFN',
    'SMSF Name', 'SMSF Members', 'SMSF Address', 'SMSF ABN', 'SMSF TFN',
    'Motivation', 'Timeframe', 'Risk Tolerance',
    'Funding Method', 'Cash Savings', 'Annual Salary',
    'Dependants', 'Weekly Rent Paid', 'Other Debts',
    'Own Investment Properties?',
    ...propHeaders,
    'Has Broker?',
    'Broker Name', 'Broker Email', 'Broker Phone',
    'Broker Capacity', 'Broker Introduced?',
    'Has Accountant?',
    'Accountant Name', 'Accountant Email', 'Accountant Phone',
    'Accountant Introduced?',
    'States to Avoid?', 'States to Avoid List',
    'Max Purchase Price',
    'Own PPOR?',
    'PPOR State', 'PPOR Address', 'PPOR Type', 'PPOR Value',
    'PPOR Loan', 'PPOR Interest Rate', 'PPOR Loan Structure',
  ];
}

function buildSheetRow(timestamp, d) {
  const props = d.properties || [];
  const propCols = [];
  for (let i = 0; i < 7; i++) {
    const p = props[i] || {};
    const ownAnother = i < props.length - 1 ? 'Yes' : (props[i] ? 'No' : '');
    propCols.push(
      p.state || '', p.address || '', p.type || '', p.purchaseDate || '',
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
    // PPOR columns
    d.ownPpor || 'No',
    d.pporState || '', d.pporAddress || '', d.pporType || '', d.pporValue || '',
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
    const acqId = new URL(req.url).searchParams.get('acq');
    if (acqId) {
      // Return questionnaire for this acquisition (or prefill from original if not submitted)
      try {
        const store = getStore('fairway-questionnaires');
        const key = `${payload.sub}:${acqId}`;
        const existing = await store.get(key, { type: 'json' });
        if (existing) return json({ completed: true, data: existing });
        // Not submitted yet — prefill personal details only (not entity, which may change)
        const original = await store.get(blobKey(payload.email), { type: 'json' }).catch(() => null);
        if (original) {
          const { entityType, companyName, companyPersonnel, companyAbn, companyAcn, companyTfn,
                  trustName, trustBeneficiaries, trustAddress, trustAbn, trustTfn,
                  smsfName, smsfAbn, smsfTfn, smsfTrustee,
                  ...personal } = original;
          return json({ completed: false, prefill: personal });
        }
        return json({ completed: false });
      } catch {}
      return json({ completed: false });
    }
    try {
      const store = getStore('fairway-questionnaires');
      const existing = await store.get(blobKey(payload.email), { type: 'json' });
      if (existing) return json({ completed: true, data: existing });
    } catch {}
    return json({ completed: false });
  }

  const body = await req.json().catch(() => null);
  if (!body) return json({ error: 'Invalid request' }, 400);
  const { acqId, ...rest } = body; // acqId optional

  if (acqId) {
    // Store under acquisition-specific key
    try {
      const qStore = getStore('fairway-questionnaires');
      await qStore.setJSON(`${payload.sub}:${acqId}`, { ...rest, submittedAt: new Date().toISOString(), clientEmail: payload.email, clientName: payload.name });
    } catch (err) { console.error('Blobs save failed:', err?.message || err); }
    // Mark acquisition as submitted on client record
    try {
      const clientStore = getStore('fairway-clients');
      const clients = (await clientStore.get('all', { type: 'json' })) || [];
      const client = clients.find(c => c.id === payload.sub);
      if (client?.acquisitions) {
        const acq = client.acquisitions.find(a => a.id === acqId);
        if (acq) { acq.questionnaireSubmitted = true; await clientStore.setJSON('all', clients); }
      }
    } catch {}
    return json({ ok: true });
  }

  const submission = {
    ...rest,
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

  // Mark acquisitions[0].questionnaireSubmitted on the client record
  try {
    const clientStore = getStore('fairway-clients');
    const allClients = (await clientStore.get('all', { type: 'json' })) || [];
    const client = allClients.find(c => c.id === payload.sub);
    if (client?.acquisitions?.length > 0 && !client.acquisitions[0].questionnaireSubmitted) {
      client.acquisitions[0].questionnaireSubmitted = true;
      await clientStore.setJSON('all', allClients);
    }
  } catch (err) {
    console.error('Failed to mark questionnaire submitted on client record:', err?.message || err);
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

  // Slack notification
  const slackUrl = process.env.SLACK_QUESTIONNAIRE_WEBHOOK_URL;
  if (slackUrl) {
    fetch(slackUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: `📋 *${submission.clientName}* submitted their questionnaire — review in the admin portal.` }),
    }).catch(err => console.error('Questionnaire Slack notify failed:', err?.message || err));
  }

  // Fan-out: Google Sheets via Apps Script web app
  const sheetEndpoint = process.env.QUESTIONNAIRE_SHEET_ENDPOINT;
  if (sheetEndpoint) {
    try {
      const headers = buildSheetHeaders();
      const row = buildSheetRow(submission.submittedAt, submission);
      await fetch(sheetEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ headers, row }),
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

Each submission appends two rows: questions on one row, answers directly below.

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    if (data.headers && data.headers.length) {
      sheet.appendRow(data.headers);
      sheet.getRange(sheet.getLastRow(), 1, 1, data.headers.length)
        .setBackground('#bd7a70')
        .setFontColor('#ffffff')
        .setFontWeight('bold');
    }
    sheet.appendRow(data.row);
    return ContentService.createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
──────────────────────────────────────────────────────────────────────────── */
