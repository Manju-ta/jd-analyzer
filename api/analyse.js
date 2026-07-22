export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { jd } = req.body;

  if (!jd || jd.length < 10) {
    return res.status(400).json({ error: 'JD too short' });
  }

  const prompt = `You are an expert technical recruiter. Analyze this job description and return ONLY a valid JSON object — no markdown, no backticks, no explanation. Be concise; keep each string short.

Keys required:
- mustHaveSkills: array of 5 strings (short, e.g. "Golang", "Kubernetes")
- niceToHaveSkills: array of 4 short strings
- experienceLevel: single short string e.g. "Senior · 5-8 yrs"
- redFlags: array of 3 short strings
- idealBackground: array of 4 short strings
- booleans: array of 3 objects each with "label" (short) and "string" (the boolean query, keep under 120 chars)
- targetCompanies: array of 12 company name strings only
- sourcingStrategy: array of 4 objects each with "title" (5 words max) and "detail" (1-2 sentences max, under 100 chars)
- outreachMessage: single string, 3-4 sentences max, no placeholders in brackets, ready to send

JOB DESCRIPTION:
${jd}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 4000,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || 'API error' });
    }

    const raw = data.content.map(b => b.text || '').join('');
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in response');

    const result = JSON.parse(jsonMatch[0]);
    return res.status(200).json(result);

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}
