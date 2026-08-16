import { checkAdmin } from './_admin-auth.js';
import { LUKE_VOICE } from './_voice.js';

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

export default async (req) => {
  if (!(await checkAdmin(req))) return json({ error: 'Unauthorized' }, 401);
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return json({ error: 'AI not configured' }, 503);

  let body;
  try { body = await req.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }

  const { contentTitle, guestName } = body;

  const today = new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });

  const prompt = `You are producing a podcast episode structure for Luke Clifford, buyer's agent at Fairway Investing, Sydney.

${LUKE_VOICE}

Today's date: ${today}. Historical comparisons and trend narratives are encouraged ("five years ago… vs today", "since rates peaked in…", "back in 2021 when…") — but "now", "current", "today", and "this year" must always refer to ${new Date().getFullYear()}. Never present past conditions as present ones.

Context: Podcast/long-form — this is the rawest version of Luke. Conversational, longer thoughts, "yeah", "actually", "I reckon", examples, side observations. The hook and talking points should sound like something Luke would genuinely say, not a producer's summary.

Generate a structured episode outline for a long-form podcast/interview.

Episode title: "${contentTitle || 'Untitled'}"
${guestName ? `Guest: ${guestName}` : 'Solo episode (no guest confirmed yet)'}

About Luke's show: He interviews professionals in and around property — buyer's agents, brokers, accountants, lawyers, property managers, players agents, builders. His audience is Australians aged 28-45 building property portfolios. They want practical, direct insight — not generic advice. Luke surfaces what others in the industry won't say.

Generate a full episode structure as JSON with this exact shape:
{
  "hook": "One compelling opening line or question that sets the tone",
  "topicBlocks": [
    {
      "title": "Short topic block title",
      "questions": [
        "Specific conversational question",
        "Another question"
      ]
    }
  ],
  "talkingPoints": ["Key insight Luke should make sure comes out"],
  "cta": "What Luke should ask listeners to do at the end"
}

Rules:
- 4-6 topic blocks, each with 2-4 questions
- Questions should be specific and conversational — not generic interview questions
- At least one block should take a contrarian or non-obvious angle
- If a guest is named, tailor questions to their specific expertise and likely experience
- talkingPoints should be things Luke wants to make sure get said (his own insights, not just questions)
- Return ONLY valid JSON, no other text`;

  let apiRes;
  try {
    apiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1800,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
  } catch { return json({ error: 'Failed to reach AI service' }, 502); }

  if (!apiRes.ok) {
    const errText = await apiRes.text().catch(() => '');
    let detail = '';
    try { detail = JSON.parse(errText)?.error?.message || errText; } catch { detail = errText; }
    return json({ error: `Anthropic ${apiRes.status}: ${detail.slice(0, 200)}` }, 502);
  }

  const aiData = await apiRes.json().catch(() => null);
  const rawText = aiData?.content?.[0]?.text || '';

  let result;
  try {
    const match = rawText.match(/\{[\s\S]*\}/);
    result = JSON.parse(match ? match[0] : rawText);
  } catch {
    return json({ error: 'Could not parse AI response', raw: rawText }, 502);
  }

  return json(result);
};

export const config = { path: '/api/admin/episode-ai', method: ['POST'] };
