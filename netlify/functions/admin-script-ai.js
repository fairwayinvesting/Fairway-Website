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

  const today = new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });

  const systemPrompt = `You are a script-writing assistant for Luke Clifford, a Sydney-based buyer's agent and property investment advisor at Fairway Investing.

Today's date: ${today}. All content must be factually current for ${new Date().getFullYear()}. Never say "in 2024" or reference past years as current. Any market conditions, interest rates, or statistics mentioned must reflect what is actually true in Australia right now in ${new Date().getFullYear()}, not outdated figures.

Luke creates short-form social video content (60-90 second clips) for Australian property investors aged 28-45. His tone is direct, confident, and conversational — no corporate language, no hand-waving. He speaks plainly, uses real numbers and client scenarios (anonymised), and positions himself as the advisor who tells people what the industry won't.

Content item: "${contentTitle || 'Untitled'}"
Template: ${TEMPLATE_LABELS[templateName] || templateName || 'unknown'}

Current script:
${scriptContext}`;

  let messages;

  if (mode === 'draft_section') {
    messages = [{
      role: 'user',
      content: `${systemPrompt}

---

Write the "${sectionLabel}" section of Luke's script.

Output the spoken words only — no labels, no "Here's the X section:", no preamble, no commentary. Start directly with the words Luke will say.

Additional rules:
- First person as Luke
- Punchy and specific — no generic property clichés
- Around 10-15 seconds to say out loud (~30-40 words)
- Flows naturally with whatever else is already written
- Do not start with "I" as the first word${filledSections.length ? '\n- Match the tone of the sections already written' : ''}`,
    }];
  } else if (mode === 'chat') {
    const chatSystem = `${systemPrompt}\n\nYou are helping Luke refine his script. Answer concisely. If you suggest replacement text for a section, write it plainly so he can copy it in.`;
    messages = [
      { role: 'user', content: chatSystem + '\n\n(Acknowledged — ready to help with the script.)' },
      { role: 'assistant', content: 'Got it. What would you like to change?' },
      ...history.slice(-8).map(h => ({ role: h.role, content: h.content })),
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
    let detail = '';
    try { detail = JSON.parse(errText)?.error?.message || errText; } catch { detail = errText; }
    return json({ error: `Anthropic ${apiRes.status}: ${detail.slice(0, 200)}` }, 502);
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
