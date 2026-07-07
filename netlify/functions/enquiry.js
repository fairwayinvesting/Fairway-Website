import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

function buildNotificationEmail(d) {
  const row = (label, value) => value
    ? `<tr><td style="padding:10px 0;border-bottom:1px solid rgba(28,24,21,0.08);font-size:12px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#B5715A;width:160px;vertical-align:top;">${label}</td><td style="padding:10px 0 10px 20px;border-bottom:1px solid rgba(28,24,21,0.08);font-size:15px;color:#1C1815;line-height:1.5;">${value}</td></tr>`
    : '';
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>New enquiry</title></head>
<body style="margin:0;padding:0;background:#FAF6F1;font-family:Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#FAF6F1"><tr><td align="center" style="padding:48px 24px 40px;">
<table width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;">
  <tr><td style="background:#1C1815;border-radius:16px 16px 0 0;padding:28px 48px;text-align:center;border-bottom:1px solid rgba(250,246,241,0.08);">
    <img src="https://fairwayinvesting.com.au/logo-word.png" width="180" height="27" alt="Fairway Investing" style="display:inline-block;border:0;max-width:180px;">
  </td></tr>
  <tr><td style="background:#ffffff;border:1px solid rgba(28,24,21,0.1);border-radius:0 0 16px 16px;padding:44px 48px;border-top:0;">
    <p style="font-size:11px;font-weight:600;letter-spacing:0.18em;text-transform:uppercase;color:#B5715A;margin:0 0 10px;">New enquiry</p>
    <h1 style="font-family:Georgia,'Times New Roman',serif;font-size:28px;font-weight:400;color:#1C1815;margin:0 0 28px;line-height:1.2;">${d.firstName} ${d.lastName}</h1>
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      ${row('Email', `<a href="mailto:${d.email}" style="color:#B5715A;text-decoration:none;">${d.email}</a>`)}
      ${row('Phone', d.phone || '—')}
      ${row('State', d.state)}
      ${row('Budget', d.budget)}
      ${row('Timeline', d.timeline)}
      ${row('Message', d.message.replace(/\n/g, '<br>'))}
    </table>
    <table cellpadding="0" cellspacing="0" border="0" style="margin-top:32px;"><tr>
      <td style="border-radius:100px;background:#B5715A;">
        <a href="mailto:${d.email}?subject=Re: Your Fairway enquiry" style="display:inline-block;font-size:14px;font-weight:500;color:#FAF6F1;text-decoration:none;padding:13px 28px;">Reply to ${d.firstName} &rarr;</a>
      </td>
    </tr></table>
  </td></tr>
  <tr><td style="padding:24px 0 0;text-align:center;">
    <p style="font-size:12px;color:rgba(28,24,21,0.4);margin:0;line-height:1.7;">Fairway Investing &middot; Crows Nest NSW 2065</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}

function buildAcknowledgementEmail(firstName) {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Thanks for reaching out</title></head>
<body style="margin:0;padding:0;background:#FAF6F1;font-family:Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#FAF6F1"><tr><td align="center" style="padding:48px 24px 40px;">
<table width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;">
  <tr><td style="padding:0 0 32px;text-align:center;">
    <span style="font-family:Georgia,'Times New Roman',serif;font-size:18px;font-weight:400;color:#1C1815;letter-spacing:0.25em;text-transform:uppercase;">FAIRWAY</span>
  </td></tr>
  <tr><td style="background:#1C1815;border-radius:18px;padding:44px 48px 44px;">
    <p style="margin:0 0 32px;padding-bottom:28px;border-bottom:1px solid rgba(250,246,241,0.08);text-align:center;">
      <img src="https://fairwayinvesting.com.au/logo-word.png" width="180" height="27" alt="Fairway Investing" style="display:inline-block;border:0;max-width:180px;">
    </p>
    <p style="font-size:11px;font-weight:600;letter-spacing:0.2em;text-transform:uppercase;color:#B5715A;margin:0 0 16px;">Got it</p>
    <h1 style="font-family:Georgia,'Times New Roman',serif;font-size:34px;font-weight:400;color:#FAF6F1;margin:0 0 16px;line-height:1.15;">Thanks, ${firstName}.</h1>
    <p style="font-size:16px;color:rgba(250,246,241,0.6);margin:0 0 28px;line-height:1.65;">Your enquiry has landed with Luke. He'll be in touch within one business day to talk through your goals.</p>
    <p style="font-size:15px;color:rgba(250,246,241,0.5);margin:0 0 8px;line-height:1.6;">In the meantime, if anything urgent comes up:</p>
    <p style="font-size:15px;color:rgba(250,246,241,0.5);margin:0 0 32px;line-height:1.6;">
      <a href="mailto:info@fairwayinvesting.com.au" style="color:#B5715A;text-decoration:none;">info@fairwayinvesting.com.au</a> &middot;
      <a href="tel:0416184333" style="color:#B5715A;text-decoration:none;">0416 184 333</a>
    </p>
    <p style="font-size:13px;color:rgba(250,246,241,0.3);margin:0;line-height:1.6;">&mdash; Luke Clifford, Fairway Investing</p>
  </td></tr>
  <tr><td style="padding:24px 0 0;text-align:center;">
    <p style="font-size:12px;color:rgba(28,24,21,0.4);margin:0;line-height:1.7;">Fairway Investing &middot; Suite 211, Level 2/5 Alexander Street, Crows Nest NSW 2065</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}

export default async (req) => {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });

  const data = await req.json().catch(() => null);
  if (!data) return json({ error: 'Invalid JSON' }, 400);

  // Honeypot
  if (data.website) return json({ ok: true });

  const { firstName, lastName, email, phone, state, budget, timeline, message } = data;
  if (!firstName || !lastName || !email || !state || !budget || !timeline || !message) {
    return json({ error: 'Missing required fields' }, 400);
  }

  const d = { firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim(), phone: (phone || '').trim(), state, budget, timeline, message: message.trim() };

  try {
    await Promise.all([
      resend.emails.send({
        from: 'Fairway Investing <info@fairwayinvesting.com.au>',
        to: ['luke@fairwayinvesting.com.au'],
        replyTo: d.email,
        subject: `New enquiry — ${d.firstName} ${d.lastName}`,
        html: buildNotificationEmail(d),
      }),
      resend.emails.send({
        from: 'Luke at Fairway <info@fairwayinvesting.com.au>',
        to: [d.email],
        replyTo: 'luke@fairwayinvesting.com.au',
        subject: `Thanks for reaching out — Fairway Investing`,
        html: buildAcknowledgementEmail(d.firstName),
      }),
    ]);
    return json({ ok: true });
  } catch (err) {
    console.error('Enquiry email error:', err);
    return json({ error: 'Failed to send' }, 500);
  }
};

export const config = { path: '/api/enquiry' };
