import { getStore } from '@netlify/blobs';
import crypto from 'crypto';

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
