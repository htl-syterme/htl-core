import { trustFetch, generateTrustToken, verifyTrustToken, computeBehavioralScore } from '../src/index.js';

const htl = process.env.HTL_SECRET ?? '';
const orKey = process.env.OPENROUTER_KEY ?? '';
if (!htl || !orKey) {
  console.error('Usage: export HTL_SECRET + OPENROUTER_KEY puis node dist/examples/demo-llm.js');
  process.exit(1);
}

const signals = { source: 'codespaces-demo', ts: Date.now() };
const score = computeBehavioralScore(signals);
const token = generateTrustToken({ sub: 'demo-llm-1', score }, htl);
const local = verifyTrustToken(token, htl);
console.log('[HTL] score biométrique :', score);
console.log('[HTL] vérif locale :', local ? 'OK' : 'ECHEC');

const res = await trustFetch('https://openrouter.ai/api/v1/chat/completions', {
  method: 'POST',
  trust: { sub: 'demo-llm-1', signals },
  headers: { Authorization: `Bearer ${orKey}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: 'meta-llama/llama-3.3-70b-instruct:free',
    messages: [{ role: 'user', content: 'Réponds en un seul mot : humain ou robot ?' }],
    max_tokens: 8
  })
});

const data: any = await res.json();
console.log('[LLM] HTTP', res.status);
console.log('[LLM] réponse :', data?.choices?.[0]?.message?.content ?? JSON.stringify(data).slice(0, 300));
