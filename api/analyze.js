export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { jd } = req.body;
  if (!jd) return res.status(400).json({ error: 'No JD provided' });

  const prompt = `You are an expert technical recruiter. Analyze this job description and return ONLY a valid JSON object — no markdown, no backticks, no explanation.

Keys required:
- mustHaveSkills: array of 5 short strings
- niceToHaveSkills: array of 4 short strings
- experienceLevel: single short string e.g. "Senior · 5-8 yrs"
- redFlags: array of 3 short strings
- idealBackground: array of 4 short strings
- booleans: array of 3 objects each with "label" and "string" (under 120 chars)
- targetCompanies: array of 12 company name strings
- sourcingStrategy: array of 4 objects each with "title" (5 words max) and "detail" (under 100 chars)
- outreachMessage: single string, 3-4 sentences, ready to send

JOB DESCRIPTION:
${jd}`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3 }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || 'Gemini API error' });
    }

    const raw = data.candidates[0].content.parts[0].text;
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in response');

    const result = JSON.parse(jsonMatch[0]);
    return res.status(200).json(result);

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}
