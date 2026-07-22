import PDFDocument from 'pdfkit';

const FAIRWAY = {
  name: 'Fairway Investing Pty Ltd',
  abn: '68 699 032 598',
  address: 'Suite 211, Level 2/5 Alexander Street, Crows Nest NSW 2065',
  email: 'info@fairwayinvesting.com.au',
  phone: '0416 184 333',
  bsb: '082-356',
  account: '75-642-5498',
  agentSig: 'L. Clifford',
  agentTitle: "Buyer's Agent — Fairway Investing Pty Ltd",
};

const COPPER = '#B5715A';
const DARK = '#1C1815';
const GREY = '#444444';
const MID = '#777777';
const LEFT = 55;

function fmt(n) {
  return '$' + Number(n).toLocaleString('en-AU');
}

function docBuffer(doc) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    doc.on('data', c => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });
}

export async function generateAgreementPdf(prospect, options = {}) {
  const doc = new PDFDocument({ margin: LEFT, size: 'A4', bufferPages: true, info: {
    Title: 'Buyer Engagement Agreement — Fairway Investing',
    Author: 'Fairway Investing Pty Ltd',
    Subject: `Engagement Agreement — ${prospect.name}`,
  }});

  const bufPromise = docBuffer(doc);
  const ag = prospect.agreement;
  const isSplit = ag.package === 'split';
  const effectiveFee = ag.customFee ?? ag.fee;
  const gst = Math.round(effectiveFee * 0.1);
  const total = effectiveFee + gst;
  const halfFee = Math.round(total / 2);
  const effectiveTerm = ag.customExclusivityTerm || ag.exclusivityTerm || '6 months';

  const signedDate = ag.signedAt
    ? new Date(ag.signedAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })
    : new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });

  const W = doc.page.width - LEFT * 2;

  const chk = (reserve = 100) => {
    if (doc.y > doc.page.height - reserve - LEFT) doc.addPage();
  };

  const hr = (opacity = 0.12) => {
    const y = doc.y;
    doc.moveTo(LEFT, y).lineTo(LEFT + W, y).strokeColor('#000').strokeOpacity(opacity).lineWidth(0.35).stroke();
    doc.strokeOpacity(1);
    doc.moveDown(0.6);
  };

  const clauseHead = (num, title) => {
    chk(130);
    doc.font('Helvetica-Bold').fontSize(9.5).fillColor(DARK).text(`${num}.   ${title}`);
    doc.moveDown(0.35);
  };

  const sub = (key, txt, extraIndent = 0) => {
    chk(60);
    const indent = 16 + extraIndent;
    const w = W - indent - 4;
    if (key) {
      const keyStr = `${key}.  `;
      const keyW = doc.widthOfString(keyStr, { font: 'Helvetica-Bold', size: 8.5 });
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor(DARK).text(keyStr, LEFT + indent, doc.y, { continued: true, width: keyW });
      doc.font('Helvetica').fontSize(8.5).fillColor(GREY).text(txt, { width: w - keyW, lineGap: 2 });
    } else {
      doc.font('Helvetica').fontSize(8.5).fillColor(GREY).text(txt, LEFT + indent, doc.y, { width: w, lineGap: 2 });
    }
    doc.moveDown(0.3);
  };

  // ── HEADER ───────────────────────────────────────────────────────────────
  doc.font('Helvetica-Bold').fontSize(9).fillColor(COPPER)
    .text('FAIRWAY INVESTING PTY LIMITED', LEFT, LEFT, { characterSpacing: 1.5, width: W });
  doc.font('Helvetica').fontSize(7.5).fillColor(MID)
    .text('TIME TO INVEST IN PROPERTY PROPERLY', LEFT, doc.y + 2, { characterSpacing: 2.5, width: W });
  doc.y = doc.y + 8;
  doc.moveTo(LEFT, doc.y).lineTo(LEFT + W, doc.y).strokeColor(COPPER).lineWidth(0.6).stroke();
  doc.moveDown(1.2);

  // ── TITLE ────────────────────────────────────────────────────────────────
  doc.font('Times-Roman').fontSize(18).fillColor(DARK)
    .text('BUYER ENGAGEMENT AGREEMENT', LEFT, doc.y, { align: 'center', width: W });
  doc.moveDown(1.2);

  // ── PARTY BOXES ──────────────────────────────────────────────────────────
  const boxTop = doc.y;
  const halfW = (W - 12) / 2;
  const rightX = LEFT + halfW + 12;

  doc.rect(LEFT, boxTop, halfW, 80).fillColor('#F9F7F4').fill();
  doc.rect(LEFT, boxTop, halfW, 80).strokeColor('#DDD5CC').lineWidth(0.4).stroke();
  doc.rect(rightX, boxTop, halfW, 80).fillColor('#F9F7F4').fill();
  doc.rect(rightX, boxTop, halfW, 80).strokeColor('#DDD5CC').lineWidth(0.4).stroke();

  let bY = boxTop + 10;
  doc.font('Helvetica-Bold').fontSize(7).fillColor(COPPER)
    .text('THE AGENT', LEFT + 10, bY).text('THE CLIENT', rightX + 10, bY);
  bY += 14;
  doc.font('Helvetica-Bold').fontSize(9.5).fillColor(DARK)
    .text(FAIRWAY.name, LEFT + 10, bY, { width: halfW - 20 })
    .text(prospect.name, rightX + 10, bY, { width: halfW - 20 });
  bY += 14;
  doc.font('Helvetica').fontSize(8).fillColor(MID)
    .text(`ABN: ${FAIRWAY.abn}`, LEFT + 10, bY)
    .text(prospect.email, rightX + 10, bY, { width: halfW - 20 });
  bY += 13;
  doc.font('Helvetica').fontSize(8).fillColor(MID)
    .text(FAIRWAY.address, LEFT + 10, bY, { width: halfW - 20 });
  if (ag.residentialAddress) {
    doc.text(ag.residentialAddress, rightX + 10, bY, { width: halfW - 20 });
  }

  doc.y = boxTop + 88;
  doc.moveDown(0.6);

  // ── DETAILS BOX ──────────────────────────────────────────────────────────
  const detTop = doc.y;
  const colW = W / 4;
  doc.rect(LEFT, detTop, W, 74).fillColor('#F4F0EB').fill();
  doc.rect(LEFT, detTop, W, 74).strokeColor('#D8CFCA').lineWidth(0.4).stroke();

  const row1 = [
    ['PACKAGE', isSplit ? '50/50 Split' : 'Pay in Full'],
    ['SERVICE FEE (EX GST)', `${fmt(effectiveFee)} + ${fmt(gst)} GST`],
    ['PAYMENT TERMS', isSplit ? '50% on signing; 50% on unconditional' : '100% upon signing'],
    ['EXCLUSIVE AGENCY TERM', effectiveTerm],
  ];
  const row2 = [
    ['TYPE OF PURCHASE', ag.purchaseType || 'Residential'],
    ['PRICE RANGE', ag.priceRange || '—'],
    ['EFFECTIVE DATE', signedDate],
    ['', ''],
  ];

  row1.forEach(([lbl, val], i) => {
    doc.font('Helvetica-Bold').fontSize(6.5).fillColor(COPPER)
      .text(lbl, LEFT + 10 + colW * i, detTop + 10, { width: colW - 8 });
    doc.font('Helvetica').fontSize(9).fillColor(DARK)
      .text(val, LEFT + 10 + colW * i, detTop + 21, { width: colW - 8, lineGap: 1 });
  });
  row2.forEach(([lbl, val], i) => {
    if (!lbl) return;
    doc.font('Helvetica-Bold').fontSize(6.5).fillColor(COPPER)
      .text(lbl, LEFT + 10 + colW * i, detTop + 46, { width: colW - 8 });
    doc.font('Helvetica').fontSize(9).fillColor(DARK)
      .text(val, LEFT + 10 + colW * i, detTop + 57, { width: colW - 8 });
  });

  doc.y = detTop + 82;
  doc.moveDown(0.8);

  // ── TERMS ────────────────────────────────────────────────────────────────
  doc.font('Helvetica-Bold').fontSize(11).fillColor(DARK).text('Terms of Agreement');
  doc.moveDown(0.3);
  hr(0.12);

  clauseHead('1', 'Appointment and Fees');
  sub('a', 'The Client appoints the Agent on an exclusive basis to perform the Services described in Annexure A, in accordance with the specifications provided by the Client and the terms of this Agreement. During the Term, the Client agrees not to engage any third party or entity to act as their agent (either directly or indirectly) to purchase property. This exclusivity allows the Agent to prioritise the Client\'s brief with full commitment and confidentiality.');
  const refundText = ag.customRefundClause
    ? `In consideration for the Services, the Client agrees to pay the Fee outlined in Annexure A. ${ag.customRefundClause}`
    : 'In consideration for the Services, the Client agrees to pay the Fee outlined in Annexure A. This Fee is refundable if the Client is dissatisfied with the service after a period of 5 weeks. There will be no refund if termination of this Agreement is made by the Client within the 5-week period.';
  sub('b', refundText);
  sub('c', 'If there is any inconsistency between this Agreement and Annexure A, the terms in Annexure A will prevail.');
  doc.moveDown(0.4);

  clauseHead('2', 'Effective Date');
  sub(null, 'This Agreement commences on the date the Client executes it (including electronically), or when the Agent receives any Fee payment from the Client — whichever occurs first.');
  doc.moveDown(0.4);

  clauseHead('3', 'Term');
  sub(null, `The term of this Agreement is the Minimum Exclusive Term of ${effectiveTerm} as set out above.`);
  doc.moveDown(0.4);

  clauseHead('4', 'Termination');
  sub(null, 'Either party may terminate this Agreement by providing seven (7) days\' written notice. Termination does not affect any rights or obligations accrued prior to the termination date.');
  doc.moveDown(0.4);

  clauseHead('5', 'Client Obligations');
  sub(null, 'The Client agrees to:');
  sub('i',  'Notify the Agent in writing of any changes to personal details, property requirements, or relevant circumstances that may impact the brief.', 14);
  sub('ii', 'Cooperate with the Agent by providing timely instructions and being available for property inspections and due diligence steps.', 14);
  sub('iii','Obtain independent legal, financial, tax, and investment advice relating to any purchase decision.', 14);
  sub('iv', 'Not proceed with the purchase of any property introduced by the Agent — verbally or in writing — unless through the Agent. This includes any property introduced during the Term, regardless of the purchase timing.', 14);
  sub('v',  'Not appoint another buyer\'s agent during the Term.', 14);
  doc.font('Helvetica').fontSize(8.5).fillColor(GREY).text('These obligations ensure alignment and transparency throughout the engagement and protect the Agent\'s work in identifying suitable properties on the Client\'s behalf.', LEFT + 16, doc.y, { width: W - 20, lineGap: 2 });
  doc.moveDown(0.7);

  clauseHead('6', 'Authority & Warranties');
  sub(null, 'The Client warrants that they have full legal authority to enter into this Agreement and have not signed conflicting agreements with any other buying agents.');
  doc.moveDown(0.4);

  clauseHead('7', 'Payment Terms');
  sub('a', 'In accordance with Annexure A, the Client agrees to pay the Fee:');
  if (isSplit) {
    sub('i',  `50% of the total Fee (${fmt(halfFee)} inclusive of GST) is payable upon signing this Agreement.`, 14);
    sub('ii', `The remaining 50% (${fmt(halfFee)} inclusive of GST) is payable when the property purchase becomes unconditional.`, 14);
  } else {
    sub('i',  'Upon signing this Agreement — regardless of whether the Agent introduced the property, whether the Client self-sourced the property, or whether the Client engaged another party.', 14);
    sub('ii', 'If the Client becomes the legal or beneficial owner of a property or shares in a company owning a property.', 14);
  }
  sub('iii', 'Within 6 months following termination, if a property introduced during the Term is purchased.', 14);
  doc.font('Helvetica').fontSize(8.5).fillColor(GREY).text('These terms ensure the Agent is fairly compensated for their expertise and efforts, including situations where a purchase occurs shortly after the engagement ends.', LEFT + 16, doc.y, { width: W - 20, lineGap: 2 });
  doc.moveDown(0.7);

  clauseHead('8', 'Indemnity & Warranties');
  sub('a', 'The Client indemnifies the Agent for any legal or recovery costs incurred in collecting outstanding Fees.');
  sub('b', 'The Agent is not liable for any indirect, incidental, or consequential losses, including but not limited to loss of income, opportunity, or goodwill.');
  sub('c', 'A failure or delay by the Agent to enforce any part of this Agreement does not constitute a waiver of rights.');
  sub('d', 'The Client indemnifies and holds the Agent harmless from all liabilities, claims, and expenses arising from the Client\'s breach of this Agreement or the Agent\'s proper execution of their duties.');
  sub('e', 'The Client is responsible for their final purchasing decision and acknowledges that the Agent makes no guarantee regarding any Property. Clients are encouraged to undertake appropriate due diligence to assess aspects such as building integrity, zoning, neighbourhood suitability, and long-term financial consequences.');
  doc.moveDown(0.4);

  clauseHead('9', 'Privacy, Data & Intellectual Property');
  sub('a', 'The Client acknowledges that any market insights, data, or information shared by the Agent are general in nature and do not constitute financial advice. The Agent is not a licensed financial advisor under s913B of the Corporations Act 2001 (Cth).');
  sub('b', 'Any such information is intended solely for the Client\'s use and must not be shared or relied upon by others.');
  sub('c', 'Where information incorporates third-party data, the Agent does not warrant its accuracy or completeness and disclaims any liability arising from it.');
  sub('d', 'All intellectual property, methodologies, client systems, databases, and tools developed or used by the Agent remain the exclusive property of the Agent. The Client agrees not to replicate, disclose, or misuse any of the Agent\'s intellectual property.');
  doc.moveDown(0.4);

  clauseHead('10', 'Referrals to Third Parties');
  sub('a', 'The Agent may recommend third-party professionals (e.g. conveyancers, brokers, pest inspectors) to assist the Client during the purchase process.');
  sub('b', 'These third parties are independent and not under the Agent\'s control. The Agent assumes no liability for their conduct or advice.');
  sub('c', 'Where third-party services are arranged by the Agent, the Client agrees to either pre-pay or reimburse these costs promptly upon invoicing.');
  sub('d', 'The Agent may receive a referral fee from these third parties. Any such arrangement does not increase the Client\'s cost or compromise the Agent\'s impartiality.');
  doc.moveDown(0.4);

  clauseHead('11', 'Entire Agreement');
  sub('a', 'If any part of this Agreement is found to be unenforceable, the remainder remains in full force.');
  sub('b', 'This Agreement does not establish a partnership or joint venture between the parties.');
  sub('c', 'This document constitutes the entire agreement between the parties. The Client confirms they have not relied on any representations outside of this Agreement.');
  sub('d', 'This Agreement supersedes all prior negotiations or communications.');
  sub('e', 'Amendments must be made in writing and signed by both parties.');
  doc.moveDown(0.4);

  clauseHead('12', 'Governing Laws');
  sub(null, 'This Agreement is governed by the laws of New South Wales, Australia.');
  doc.moveDown(0.5);

  if (ag.customClauses) {
    clauseHead('13', 'Special Conditions');
    sub(null, ag.customClauses);
    doc.moveDown(0.5);
  }

  // ── SIGNATURE BLOCK ──────────────────────────────────────────────────────
  chk(130);
  doc.moveDown(0.5);
  hr(0.1);
  doc.font('Helvetica').fontSize(8.5).fillColor(GREY)
    .text('By executing this Agreement (including electronically), both parties confirm they have read, understood, and agree to be bound by these Terms and Conditions.', LEFT, doc.y, { width: W, lineGap: 2 });
  doc.moveDown(1.2);

  const sigY = doc.y;
  const thirdW = W / 3;
  const lineLen = thirdW - 24;

  doc.moveTo(LEFT, sigY + 32).lineTo(LEFT + lineLen, sigY + 32).strokeColor('#999').lineWidth(0.5).stroke();
  doc.moveTo(LEFT + thirdW + 12, sigY + 32).lineTo(LEFT + thirdW + 12 + lineLen, sigY + 32).strokeColor('#999').lineWidth(0.5).stroke();
  doc.moveTo(LEFT + thirdW * 2 + 12, sigY + 32).lineTo(LEFT + W, sigY + 32).strokeColor('#999').lineWidth(0.5).stroke();

  // Agent signature (left)
  if (options.agentSignatureData) {
    try { doc.image(options.agentSignatureData, LEFT, sigY, { fit: [lineLen, 30], align: 'left' }); } catch {}
  } else {
    doc.font('Times-Italic').fontSize(14).fillColor(DARK).text(FAIRWAY.agentSig, LEFT, sigY + 8, { width: lineLen });
  }
  // Client signature (middle)
  if (ag.signerSignatureUrl) {
    try {
      const clientBuf = Buffer.from(ag.signerSignatureUrl.replace(/^data:[^,]+,/, ''), 'base64');
      doc.image(clientBuf, LEFT + thirdW + 12, sigY, { fit: [lineLen, 30], align: 'left' });
    } catch {}
  } else if (ag.signerName) {
    doc.font('Times-Italic').fontSize(14).fillColor(DARK)
      .text(ag.signerName, LEFT + thirdW + 12, sigY + 8, { width: lineLen });
  }
  doc.font('Helvetica').fontSize(9).fillColor(DARK)
    .text(signedDate, LEFT + thirdW * 2 + 12, sigY + 14, { width: lineLen });

  doc.font('Helvetica').fontSize(7.5).fillColor(MID)
    .text("Buyer's Agent", LEFT, sigY + 38, { width: lineLen })
    .text("Client's Signature", LEFT + thirdW + 12, sigY + 38, { width: lineLen })
    .text('Date', LEFT + thirdW * 2 + 12, sigY + 38);

  if (ag.signerName) {
    const noteY = sigY + 58;
    doc.rect(LEFT, noteY, W, 26).fillColor('#F4F0EB').fill();
    doc.rect(LEFT, noteY, W, 26).strokeColor('#D8CFCA').lineWidth(0.3).stroke();
    doc.font('Helvetica').fontSize(7.5).fillColor(MID)
      .text(
        `Electronically signed by ${ag.signerName} on ${signedDate}${ag.signerIp ? ` from IP ${ag.signerIp}` : ''}. ` +
        `Legally binding under the Electronic Transactions Act 1999 (Cth).`,
        LEFT + 10, noteY + 8, { width: W - 20, lineGap: 1.5 }
      );
  }

  // ── ANNEXURE A ───────────────────────────────────────────────────────────
  doc.addPage();
  doc.font('Helvetica-Bold').fontSize(9).fillColor(COPPER)
    .text('FAIRWAY INVESTING PTY LIMITED', LEFT, LEFT, { characterSpacing: 1.5, width: W });
  doc.font('Helvetica').fontSize(7.5).fillColor(MID)
    .text('TIME TO INVEST IN PROPERTY PROPERLY', LEFT, doc.y + 2, { characterSpacing: 2.5, width: W });
  doc.y = doc.y + 8;
  doc.moveTo(LEFT, doc.y).lineTo(LEFT + W, doc.y).strokeColor(COPPER).lineWidth(0.6).stroke();
  doc.moveDown(1);

  doc.font('Times-Roman').fontSize(16).fillColor(DARK).text('ANNEXURE A', LEFT, doc.y, { align: 'center', width: W });
  doc.moveDown(0.3);
  doc.font('Helvetica-Bold').fontSize(10).fillColor(COPPER)
    .text('Fairway Strategic Residential Purchase Service', LEFT, doc.y, { align: 'center', width: W });
  doc.moveDown(1);
  hr(0.1);

  // 1. Services
  doc.font('Helvetica-Bold').fontSize(10).fillColor(DARK).text('1.   Services / Inclusions');
  doc.moveDown(0.4);
  doc.font('Helvetica').fontSize(8.5).fillColor(GREY)
    .text('The following list of services includes but is not limited to:', LEFT, doc.y, { width: W, lineGap: 2 });
  doc.moveDown(0.4);
  ['Access to relevant Fairway staff', 'Property and market reports', 'Search and identify suitable properties', 'Property negotiation', 'Introduction to professionals (e.g. conveyancers, brokers, inspectors)']
    .forEach((s, i) => sub(String.fromCharCode(97 + i), s));
  doc.moveDown(0.7);

  // 2. Payment Terms
  doc.font('Helvetica-Bold').fontSize(10).fillColor(DARK).text('2.   Payment Terms');
  doc.moveDown(0.4);
  doc.font('Helvetica').fontSize(8.5).fillColor(GREY)
    .text('Pursuant to Clause 7 of the General Terms and Conditions, the Client agrees to pay the Agent the Fee on the following basis:', LEFT, doc.y, { width: W, lineGap: 2 });
  doc.moveDown(0.4);
  if (isSplit) {
    sub('a', `50% of the Fee (${fmt(halfFee)} inclusive of GST) is payable upon signing of this Agreement.`);
    sub('b', `The remaining 50% (${fmt(halfFee)} inclusive of GST) is payable when the property purchase becomes unconditional.`);
  } else {
    sub('a', `100% of the Fee (${fmt(total)} inclusive of GST) is payable upon signing of this Agreement.`);
  }
  doc.moveDown(0.7);

  // 3. Fee Summary
  doc.font('Helvetica-Bold').fontSize(10).fillColor(DARK).text('3.   Fee Summary');
  doc.moveDown(0.4);
  const feeBoxH = isSplit ? 72 : 58;
  const feeTop = doc.y;
  doc.rect(LEFT, feeTop, W, feeBoxH).fillColor('#F9F7F4').fill();
  doc.rect(LEFT, feeTop, W, feeBoxH).strokeColor('#DDD5CC').lineWidth(0.4).stroke();
  doc.font('Helvetica').fontSize(9).fillColor(GREY)
    .text('Base Fee (ex GST)', LEFT + 12, feeTop + 10).text(fmt(effectiveFee), LEFT + W - 90, feeTop + 10, { width: 78, align: 'right' });
  doc.text('GST (10%)', LEFT + 12, feeTop + 24).text(fmt(gst), LEFT + W - 90, feeTop + 24, { width: 78, align: 'right' });
  doc.moveTo(LEFT + 12, feeTop + 38).lineTo(LEFT + W - 12, feeTop + 38).strokeColor('#CCC').lineWidth(0.3).stroke();
  doc.font('Helvetica-Bold').fontSize(10).fillColor(DARK)
    .text('Total Fee (inc GST)', LEFT + 12, feeTop + 42).text(fmt(total), LEFT + W - 90, feeTop + 42, { width: 78, align: 'right' });
  if (isSplit) {
    doc.font('Helvetica').fontSize(8).fillColor(MID)
      .text(`Payment 1 (on signing): ${fmt(halfFee)}   ·   Payment 2 (on unconditional): ${fmt(halfFee)}`, LEFT + 12, feeTop + 57, { width: W - 24 });
  }
  doc.y = feeTop + feeBoxH + 10;
  doc.moveDown(0.8);

  // 4. Bank Details
  doc.font('Helvetica-Bold').fontSize(10).fillColor(DARK).text('4.   Bank Details for Payment');
  doc.moveDown(0.4);
  const bankTop = doc.y;
  doc.rect(LEFT, bankTop, W, 76).fillColor('#F4F0EB').fill();
  doc.rect(LEFT, bankTop, W, 76).strokeColor('#D8CFCA').lineWidth(0.4).stroke();
  [
    ['Account Name', FAIRWAY.name],
    ['BSB', FAIRWAY.bsb],
    ['Account Number', FAIRWAY.account],
    ['Reference', 'Please include your full name as the reference for this transaction'],
  ].forEach(([lbl, val], i) => {
    doc.font('Helvetica-Bold').fontSize(8).fillColor(MID).text(lbl, LEFT + 14, bankTop + 12 + i * 16, { width: 130 });
    doc.font('Helvetica').fontSize(9).fillColor(DARK).text(val, LEFT + 150, bankTop + 12 + i * 16, { width: W - 160 });
  });
  doc.y = bankTop + 84;
  doc.moveDown(1);

  // Annexure signature block
  hr(0.1);
  doc.font('Helvetica').fontSize(8.5).fillColor(GREY)
    .text('Both parties confirm the services, payment terms, and bank details set out in this Annexure A.', LEFT, doc.y, { width: W, lineGap: 2 });
  doc.moveDown(1.2);

  const aSigY = doc.y;
  doc.moveTo(LEFT, aSigY + 32).lineTo(LEFT + lineLen, aSigY + 32).strokeColor('#999').lineWidth(0.5).stroke();
  doc.moveTo(LEFT + thirdW + 12, aSigY + 32).lineTo(LEFT + thirdW + 12 + lineLen, aSigY + 32).strokeColor('#999').lineWidth(0.5).stroke();
  doc.moveTo(LEFT + thirdW * 2 + 12, aSigY + 32).lineTo(LEFT + W, aSigY + 32).strokeColor('#999').lineWidth(0.5).stroke();

  // Agent signature (left) — Annexure A
  if (options.agentSignatureData) {
    try { doc.image(options.agentSignatureData, LEFT, aSigY, { fit: [lineLen, 30], align: 'left' }); } catch {}
  } else {
    doc.font('Times-Italic').fontSize(14).fillColor(DARK).text(FAIRWAY.agentSig, LEFT, aSigY + 8, { width: lineLen });
  }
  // Client signature (middle) — Annexure A
  if (ag.signerSignatureUrl) {
    try {
      const clientBuf = Buffer.from(ag.signerSignatureUrl.replace(/^data:[^,]+,/, ''), 'base64');
      doc.image(clientBuf, LEFT + thirdW + 12, aSigY, { fit: [lineLen, 30], align: 'left' });
    } catch {}
  } else if (ag.signerName) {
    doc.font('Times-Italic').fontSize(14).fillColor(DARK)
      .text(ag.signerName, LEFT + thirdW + 12, aSigY + 8, { width: lineLen });
  }
  doc.font('Helvetica').fontSize(9).fillColor(DARK).text(signedDate, LEFT + thirdW * 2 + 12, aSigY + 14, { width: lineLen });
  doc.font('Helvetica').fontSize(7.5).fillColor(MID)
    .text("Buyer's Agent", LEFT, aSigY + 38, { width: lineLen })
    .text("Client's Signature", LEFT + thirdW + 12, aSigY + 38, { width: lineLen })
    .text('Date', LEFT + thirdW * 2 + 12, aSigY + 38);

  doc.end();
  return bufPromise;
}

export async function generateInvoicePdf(prospect, invoiceData) {
  const { invoiceNumber, invoiceEntity, items, issuedDate } = invoiceData;

  const doc = new PDFDocument({ margin: LEFT, size: 'A4', info: {
    Title: `Tax Invoice ${invoiceNumber} — Fairway Investing`,
    Author: 'Fairway Investing Pty Ltd',
  }});

  const bufPromise = docBuffer(doc);
  const W = doc.page.width - LEFT * 2;

  // ── HEADER ───────────────────────────────────────────────────────────────
  doc.font('Helvetica-Bold').fontSize(9).fillColor(COPPER)
    .text('FAIRWAY INVESTING PTY LIMITED', LEFT, LEFT, { characterSpacing: 1.5, width: W });
  doc.font('Helvetica').fontSize(8).fillColor(MID)
    .text(`ABN: ${FAIRWAY.abn}   ·   ${FAIRWAY.address}   ·   ${FAIRWAY.email}`, LEFT, doc.y + 3, { width: W });
  doc.y = doc.y + 8;
  doc.moveTo(LEFT, doc.y).lineTo(LEFT + W, doc.y).strokeColor(COPPER).lineWidth(0.6).stroke();
  doc.moveDown(1.2);

  // ── INVOICE TITLE ────────────────────────────────────────────────────────
  const titleY = doc.y;
  doc.font('Times-Roman').fontSize(22).fillColor(DARK).text('TAX INVOICE', LEFT, titleY, { width: W / 2 });
  doc.font('Helvetica').fontSize(9).fillColor(MID)
    .text('Invoice Number', LEFT + W / 2, titleY + 4, { width: W / 2, align: 'right' })
    .text(`#${invoiceNumber}`, LEFT + W / 2, titleY + 18, { width: W / 2, align: 'right' })
    .text(`Date Issued: ${issuedDate}`, LEFT + W / 2, titleY + 33, { width: W / 2, align: 'right' });
  doc.y = titleY + 54;
  doc.moveDown(0.8);

  // ── BILLED TO ────────────────────────────────────────────────────────────
  doc.font('Helvetica-Bold').fontSize(7.5).fillColor(COPPER).text('BILLED TO');
  doc.font('Helvetica-Bold').fontSize(11).fillColor(DARK).text(invoiceEntity || prospect.name);
  doc.font('Helvetica').fontSize(9).fillColor(MID).text(prospect.email);
  doc.moveDown(1.2);

  // ── ITEMS TABLE ───────────────────────────────────────────────────────────
  const tblTop = doc.y;
  doc.rect(LEFT, tblTop, W, 26).fillColor('#F4F0EB').fill();
  doc.font('Helvetica-Bold').fontSize(8.5).fillColor(DARK)
    .text('Description', LEFT + 10, tblTop + 8, { width: W - 165 })
    .text('Ex GST', LEFT + W - 155, tblTop + 8, { width: 65, align: 'right' })
    .text('GST', LEFT + W - 80, tblTop + 8, { width: 38, align: 'right' })
    .text('Total', LEFT + W - 35, tblTop + 8, { width: 35, align: 'right' });

  let rowY = tblTop + 26;
  let totalExGst = 0, totalGst = 0, totalInc = 0;

  for (const item of items) {
    const gst = Math.round(item.amount * 0.1);
    const inc = item.amount + gst;
    totalExGst += item.amount; totalGst += gst; totalInc += inc;
    doc.moveTo(LEFT, rowY).lineTo(LEFT + W, rowY).strokeColor('#EEE').lineWidth(0.3).stroke();
    doc.font('Helvetica').fontSize(9).fillColor(DARK)
      .text(item.desc, LEFT + 10, rowY + 8, { width: W - 165 })
      .text(fmt(item.amount), LEFT + W - 155, rowY + 8, { width: 65, align: 'right' })
      .text(fmt(gst), LEFT + W - 80, rowY + 8, { width: 38, align: 'right' })
      .text(fmt(inc), LEFT + W - 35, rowY + 8, { width: 35, align: 'right' });
    rowY += 30;
  }

  doc.moveTo(LEFT, rowY).lineTo(LEFT + W, rowY).strokeColor('#BBB').lineWidth(0.5).stroke();
  rowY += 10;
  doc.font('Helvetica').fontSize(9).fillColor(MID)
    .text('Subtotal (ex GST)', LEFT + W - 200, rowY, { width: 160, align: 'right' })
    .text(fmt(totalExGst), LEFT + W - 35, rowY, { width: 35, align: 'right' });
  rowY += 16;
  doc.text('GST (10%)', LEFT + W - 200, rowY, { width: 160, align: 'right' })
    .text(fmt(totalGst), LEFT + W - 35, rowY, { width: 35, align: 'right' });
  rowY += 8;
  doc.moveTo(LEFT + W - 200, rowY).lineTo(LEFT + W, rowY).strokeColor('#CCC').lineWidth(0.3).stroke();
  rowY += 8;
  doc.font('Helvetica-Bold').fontSize(10.5).fillColor(DARK)
    .text('Total', LEFT + W - 200, rowY, { width: 160, align: 'right' })
    .text(fmt(totalInc), LEFT + W - 35, rowY, { width: 35, align: 'right' });
  rowY += 32;

  // PAID stamp
  doc.rect(LEFT + W - 96, rowY - 8, 96, 32).fillColor('#E8F5E9').fill();
  doc.rect(LEFT + W - 96, rowY - 8, 96, 32).strokeColor('#66BB6A').lineWidth(1).stroke();
  doc.font('Helvetica-Bold').fontSize(15).fillColor('#2E7D32')
    .text('PAID', LEFT + W - 86, rowY + 2, { width: 76, align: 'center' });
  rowY += 50;

  // Footer note
  doc.font('Helvetica').fontSize(8).fillColor(MID)
    .text(`Payment received by ${FAIRWAY.name}. ABN: ${FAIRWAY.abn}. This is a tax invoice for GST purposes.`, LEFT, rowY, { width: W, lineGap: 2 });

  // Page footer
  doc.font('Helvetica').fontSize(7.5).fillColor(MID)
    .text(`${FAIRWAY.name}   ·   ABN: ${FAIRWAY.abn}   ·   ${FAIRWAY.address}`, LEFT, doc.page.height - 46, { width: W, align: 'center' });

  doc.end();
  return bufPromise;
}
