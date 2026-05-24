const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const Groq = require('groq-sdk');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Helper function to call Groq
async function callGroq(systemPrompt, userPrompt, returnJson = false) {
  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: returnJson ? 0.7 : 0.8,
  });
  let content = response.choices[0].message.content;
  
  // Strip markdown code blocks if present
  if (returnJson && content.includes('```')) {
    content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  }
  
  return content;
}

app.get('/health', (req, res) => {
  res.json({ status: 'Skope is alive' });
});

app.post('/api/adaptive-questions', async (req, res) => {
  try {
    const { answers } = req.body;

    const systemPrompt = `You are an expert Indian college and career counsellor.
Generate exactly 5 deeply personalized follow-up questions based on the student's answers.
Questions must feel conversational and specific — not generic.
Return ONLY valid JSON: { "questions": ["q1","q2","q3","q4","q5"] }`;

    const userPrompt = `Student answered:
Stream/subjects: "${answers.q1}"
Hobbies/interests: "${answers.q2}"
Career thoughts: "${answers.q3}"

Generate 5 follow-up questions specific to this student's situation.`;

    const response = await callGroq(systemPrompt, userPrompt, true);
    res.json(JSON.parse(response));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/generate-report', async (req, res) => {
  try {
    const { phase1, phase2 } = req.body;

    const phase2Text = Object.entries(phase2)
      .map(([q, a]) => `Q: ${q}\nA: ${a}`)
      .join('\n\n');

    const systemPrompt = `You are India's most experienced college counsellor with 25 years of practice.
You know every college in India — IITs, NITs, IIMs, AIIMS, NLUs, IIITs, central universities,
private universities (Ashoka, VIT, Manipal, SRM, Symbiosis, Christ, Flame, Krea etc),
design institutes (NID, NIFT), hotel management (IHM), and all entrance exams.
Give brutally honest, accurate, specific advice. Never recommend fake colleges.
Return ONLY valid JSON — no markdown, no explanation.`;

    const userPrompt = `Student profile:
Phase 1:
Stream: "${phase1.q1}"
Interests: "${phase1.q2}"  
Career thoughts: "${phase1.q3}"

Phase 2:
${phase2Text}

Return this exact JSON:
{
  "profile_summary": "4-5 line summary",
  "key_insight": "1 powerful observation",
  "strengths": ["s1","s2","s3","s4"],
  "gaps": ["g1","g2","g3"],
  "careers": [{"title":"","why_it_fits":"","entrance_exams":[],"earning_range":"","reality_check":""}],
  "colleges": [{"name":"","city":"","type":"","course_to_target":"","entrance_exam":"","why_this_fits":"","difficulty":"Reach/Target/Safe"}],
  "emerging_roles": [{"title":"","description":"","why_relevant":""}],
  "next_30_days": ["a1","a2","a3","a4","a5"]
}
Return 3 careers, 8 colleges mixed Reach/Target/Safe, 2 emerging roles.`;

    const response = await callGroq(systemPrompt, userPrompt, true);
    res.json(JSON.parse(response));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/chat', async (req, res) => {
  try {
    const { message, pathreport, history } = req.body;

    const systemPrompt = `You are a personal career counsellor for an Indian Class 12 student.
Their PathReport is below. Answer specifically based on their profile — never generic advice.
If they share new info, tell them exactly what changes. Name real colleges and exams.
Keep replies to 3-5 lines unless they ask for detail. Be direct and warm.

PATHREPORT: ${JSON.stringify(pathreport)}`;

    // Build conversation messages
    const messages = [
      { role: 'system', content: systemPrompt },
      ...(history || []),
      { role: 'user', content: message }
    ];

    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: messages,
      max_tokens: 400,
      temperature: 0.8,
    });

    const reply = response.choices[0].message.content;
    res.json({ reply });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;

// Export for Vercel
module.exports = app;

// Listen locally
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => console.log(`Skope running on http://localhost:${PORT}`));
}

