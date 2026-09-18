const express = require('express');
const { simpleRateLimit } = require('../middleware/rateLimit');
const router = express.Router();

// Protects the AI provider keys from being burned by abuse/spam scripts.
const aiRateLimit = simpleRateLimit({ windowMs: 60 * 60 * 1000, max: 25 }); // 25 requests / hour / IP

const MODELS = {
  gemini: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
  deepseek: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
  groq: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
};

function cleanPrompt(prompt) {
  if (typeof prompt !== 'string') return '';
  return prompt.slice(0, 50000);
}

async function callGemini(prompt) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY is not configured.');
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODELS.gemini)}:generateContent`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 1200, temperature: 0.4 },
    }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || 'Gemini request failed.');
  return (data.candidates || []).flatMap(c => c.content?.parts || [])
    .filter(p => p.type === 'text' || typeof p.text === 'string')
    .map(p => p.text).join('\n').trim();
}

async function callOpenAICompatible(provider, prompt) {
  const config = provider === 'deepseek'
    ? { key: process.env.DEEPSEEK_API_KEY, base: 'https://api.deepseek.com/chat/completions', name: 'DeepSeek' }
    : { key: process.env.GROQ_API_KEY, base: 'https://api.groq.com/openai/v1/chat/completions', name: 'Groq' };
  if (!config.key) throw new Error(`${provider.toUpperCase()}_API_KEY is not configured.`);
  const response = await fetch(config.base, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.key}` },
    body: JSON.stringify({
      model: MODELS[provider],
      messages: [
        { role: 'system', content: "You are Inkling, a precise writing assistant. Follow the user's task exactly. Return only the requested output, with no preamble." },
        { role: 'user', content: prompt },
      ],
      max_tokens: 1200,
      temperature: 0.4,
      stream: false,
    }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || `${config.name} request failed.`);
  return data.choices?.[0]?.message?.content?.trim() || '';
}

router.use(express.json());

router.post('/ai', aiRateLimit, async (req, res) => {
  try {
    const provider = ['gemini', 'deepseek', 'groq'].includes(req.body.provider) ? req.body.provider : 'gemini';
    const prompt = cleanPrompt(req.body.prompt);
    if (!prompt) return res.status(400).json({ error: 'A prompt is required.' });

    const text = provider === 'gemini'
      ? await callGemini(prompt)
      : await callOpenAICompatible(provider, prompt);

    if (!text) return res.status(502).json({ error: 'The provider returned an empty response.' });
    res.json({ text, provider });
  } catch (error) {
    console.error('Inkling AI error:', error);
    res.status(500).json({ error: error.message || 'AI request failed.' });
  }
});

module.exports = router;
