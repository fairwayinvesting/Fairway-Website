import { checkAdmin } from './_admin-auth.js';

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

const TEMPLATE_LABELS = {
  tip: 'Quick Tip (hook → setup → tip → example → CTA)',
  myth_bust: 'Myth-Bust (hook → myth → truth → proof → CTA)',
  case_study: 'Case Study (hook → situation → strategy → outcome → CTA)',
  stat_hook: 'Stat Hook (stat → meaning → implication → your angle → CTA)',
  raw: 'Freewrite (free-form)',
};

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204 });
  if (!(await checkAdmin(req))) return json({ error: 'Unauthorized' }, 401);
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return json({ error: 'AI not configured — add ANTHROPIC_API_KEY to Netlify env vars' }, 503);

  let body;
  try { body = await req.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }

  const { mode, contentTitle, templateName, sectionKey, sectionLabel, currentSections = {}, message, history = [] } = body;

  const filledSections = Object.entries(currentSections).filter(([, v]) => v?.trim());
  const scriptContext = filledSections.length
    ? filledSections.map(([k, v]) => `[${k.toUpperCase()}]: ${v}`).join('\n')
    : '(nothing written yet)';

  const systemPrompt = `You are a script-writing assistant for Luke Clifford, a Sydney-based buyer's agent and property investment advisor at Fairway Investing.

Luke creates short-form social video content (60-90 second clips) for Australian property investors aged 28-45. His tone is direct, confident, and conversational — no corporate language, no hand-waving. He speaks plainly, uses real numbers and client scenarios (anonymised), and positions himself as the advisor who tells people what the industry won't.

Content item: "${contentTitle || 'Untitled'}"
Template: ${TEMPLATE_LABELS[templateName] || templateName || 'unknown'}

Current script:
${scriptContext}`;

  let messages;

  if (mode === 'draft_section') {
    messages = [{
      role: 'user',
      content: `Write the "${sectionLabel}" section of Luke's script.

Rules:
- Output ONLY the words Luke speaks — no headings, labels, or meta-commentary
- Write in first person as Luke
- Be punchy and specific — no generic property clichés
- This section should take around 10-15 seconds to say out loud (roughly 30-40 words)
- Make it flow naturally with whatever else is already written
- Never start with "I" as the first word${filledSections.length ? '\n- Maintain tonal consistency with the sections already written' : ''}`,
    }];
  } else if (mode === 'chat') {
    messages = [
      ...history.slice(-10).map(h => ({ role: h.role, content: h.content })),
      { role: 'user', content: message },
    ];
  } else {
    return json({ error: 'Invalid mode' }, 400);
  }

  let apiRes;
  try {
    apiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 512,
        system: systemPrompt,
        messages,
      }),
    });
  } catch (err) {
    console.error('Fetch to Anthropic failed:', err);
    return json({ error: 'Failed to reach AI service' }, 502);
  }

  if (!apiRes.ok) {
    const errText = await apiRes.text().catch(() => '');
    console.error('Anthropic API error:', apiRes.status, errText);
    return json({ error: `AI service error (${apiRes.status})` }, 502);
  }

  let aiData;
  try { aiData = await apiRes.json(); } catch { return json({ error: 'Could not parse AI response' }, 502); }

  const text = aiData?.content?.[0]?.text?.trim() || '';
  return json({ text });
};

export const config = {
  path: '/api/admin/script-ai',
  method: ['POST', 'OPTIONS'],
};
