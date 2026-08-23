import { getStore } from '@netlify/blobs';
import crypto from 'crypto';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

function buildResetEmail(name, resetLink) {
  const firstName = name.split(' ')[0];
  return `<!DOCTYPE html><html lang="en" style="background:#181614;"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Reset your password — Fairway</title></head>
<body style="margin:0;padding:0;background:#181614;font-family:Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#181614"><tr><td align="center" style="padding:40px 16px;">
<table width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;">
  <tr><td style="background:#1C1815;border-radius:20px;border:1px solid rgba(181,113,90,0.2);padding:44px 48px;">
    <p style="margin:0 0 36px;padding-bottom:32px;border-bottom:1px solid rgba(250,246,241,0.08);text-align:center;">
      <img src="https://fairwayinvesting.com.au/logo-icon.png" width="28" height="28" alt="" style="display:inline-block;border:0;vertical-align:middle;margin-right:10px;">
      <img src="https://fairwayinvesting.com.au/logo-word.png" width="160" height="24" alt="Fairway Investing" style="display:inline-block;border:0;vertical-align:middle;">
    </p>
    <p style="font-size:11px;font-weight:600;letter-spacing:0.2em;text-transform:uppercase;color:#B5715A;margin:0 0 16px;">Staff portal</p>
    <h1 style="font-family:Georgia,'Times New Roman',serif;font-size:30px;font-weight:400;color:#FAF6F1;margin:0 0 12px;line-height:1.2;">Reset your password, ${firstName}.</h1>
    <p style="font-size:16px;color:rgba(250,246,241,0.6);margin:0 0 32px;line-height:1.65;">Click below to set a new password for your Fairway staff portal.</p>
    <table cellpadding="0" cellspacing="0" border="0"><tr>
      <td style="border-radius:100px;background:#B5715A;">
        <a href="${resetLink}" style="display:inline-block;font-size:15px;font-weight:500;color:#FAF6F1;text-decoration:none;padding:15px 34px;">Set new password &rarr;</a>
      </td>
    </tr></table>
    <p style="font-size:12px;color:rgba(250,246,241,0.25);margin:20px 0 0;line-height:1.6;">This link expires in 24 hours. If you didn't request a reset, ignore this email.</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

export default async (req) => {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });

  let body;
  try { body = await req.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
  const { email } = body;
  if (!email) return json({ error: 'Email required' }, 400);

  const emailNorm = email.toLowerCase().trim();
  const store = getStore({ name: 'fairway-staff', consistency: 'strong' });
  const all = (await store.get('all', { type: 'json' }).catch(() => null)) || [];
  const idx = all.findIndex(u => !u.deletedAt && u.active && u.email?.toLowerCase() === emailNorm);

  // Always return ok to prevent user enumeration
  if (idx !== -1) {
    const token = crypto.randomBytes(32).toString('hex');
    all[idx].setupToken = token;
    all[idx].setupTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    await store.set('all', JSON.stringify(all));
    const resetLink = `https://fairwayinvesting.com.au/staff/setup.html?token=${token}`;
    try {
      await resend.emails.send({
        from: 'Fairway Portal <info@fairwayinvesting.com.au>',
        to: [emailNorm],
        subject: 'Reset your Fairway staff portal password',
        html: buildResetEmail(all[idx].name, resetLink),
      });
    } catch (err) {
      console.error('Staff reset email failed:', err?.message || err);
    }
  }

  return json({ ok: true });
};

export const config = { path: '/api/staff/reset-password', method: ['POST'] };
