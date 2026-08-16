import { checkAdmin } from './_admin-auth.js';

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

export default async (req) => {
  if (!(await checkAdmin(req))) return json({ error: 'Unauthorized' }, 401);
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return json({ error: 'AI not configured — add ANTHROPIC_API_KEY to Netlify env vars' }, 503);

  let body;
  try { body = await req.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }

  const { topic, guestName, type = 'both', recentTitles = [] } = body;

  const typeContext = type === 'long_form'
    ? 'long-form podcast/interview episodes (30-60 mins)'
    : type === 'short_form'
    ? 'short-form social video clips (60-90 seconds)'
    : 'both long-form podcast episodes AND short-form social clips';

  const recentContext = recentTitles.length
    ? `\nAvoid repeating these recent topics:\n${recentTitles.map(t => `- ${t}`).join('\n')}`
    : '';

  const guestContext = guestName
    ? `Guest/collaborator: ${guestName}.`
    : 'No specific guest — could be solo or with a guest.';

  const today = new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });

  const prompt = `You are a content strategist for Fairway Investing, an Australian property investment advisory firm. Generate content ideas for ${typeContext}.

Today's date: ${today}. Use this as your reference point for all content. Historical comparisons and trend narratives are encouraged (e.g. "five years ago... vs today", "since 2020...", "back when rates were at X...") — but "now", "current", "today", and "this year" must always refer to ${new Date().getFullYear()}. Never present past conditions as present ones.

${guestContext}
${topic ? `Topic/theme focus: ${topic}` : 'Open topic — what would resonate with aspiring Australian property investors?'}
${recentContext}

Return EXACTLY 6 ideas as a JSON array. Each idea should be an object with:
- "title": punchy, specific title (not generic)
- "hook": one sentence on why this will engage the audience
- "type": "long_form" or "short_form" (or both if flexible)

Audience: Australians aged 28-45 who want to build a property portfolio. They are busy professionals, slightly risk-averse, and want practical advice they can act on.

Return ONLY valid JSON, no other text.`;

  let aiRes;
  try {
    aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
  } catch (err) {
    return json({ error: 'Failed to reach AI service' }, 502);
  }

  if (!aiRes.ok) {
    const errText = await aiRes.text().catch(() => '');
    console.error('Anthropic API error:', aiRes.status, errText);
    return json({ error: 'AI service error — check your API key and credits' }, 502);
  }

  const aiData = await aiRes.json();
  const rawText = aiData?.content?.[0]?.text || '';

  let ideas;
  try {
    const match = rawText.match(/\[[\s\S]*\]/);
    ideas = JSON.parse(match ? match[0] : rawText);
  } catch {
    return json({ error: 'Could not parse AI response', raw: rawText }, 502);
  }

  return json({ ideas });
};

export const config = {
  path: '/api/admin/content-ideas',
  method: ['POST'],
};
