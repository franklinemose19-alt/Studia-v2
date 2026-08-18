const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const COSTS = {
  'gpt-5-mini':  { input: 0.15, output: 0.60 },
  'gpt-4o-mini': { input: 0.15, output: 0.60 },
  'gpt-4o':      { input: 2.50, output: 10.00 },
}
const EMBEDDING_COSTS = { 'text-embedding-3-small': 0.02 }

export async function logTokenUsage(userId, feature, model, usage, provider = 'openai') {
  if (!usage || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) return
  const costs = COSTS[model] || COSTS['gpt-5-mini']
  const cost = ((usage.prompt_tokens || 0) / 1_000_000) * costs.input + ((usage.completion_tokens || 0) / 1_000_000) * costs.output
  fetch(`${SUPABASE_URL}/rest/v1/token_usage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, apikey: SUPABASE_SERVICE_KEY, Prefer: 'return=minimal' },
    body: JSON.stringify({ user_id: userId || 'anonymous', feature, model, provider, prompt_tokens: usage.prompt_tokens || 0, completion_tokens: usage.completion_tokens || 0, total_tokens: usage.total_tokens || 0, estimated_cost_usd: parseFloat(cost.toFixed(6)) }),
  }).catch(() => {})
}

export async function logWhisperUsage(userId, durationSeconds, provider = 'openai') {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return
  const durationMinutes = (durationSeconds || 0) / 60
  const cost = durationMinutes * 0.006
  fetch(`${SUPABASE_URL}/rest/v1/token_usage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, apikey: SUPABASE_SERVICE_KEY, Prefer: 'return=minimal' },
    body: JSON.stringify({ user_id: userId || 'anonymous', feature: 'transcription', model: 'whisper-1', provider, prompt_tokens: 0, completion_tokens: 0, total_tokens: Math.round(durationMinutes * 1000), estimated_cost_usd: parseFloat(cost.toFixed(6)) }),
  }).catch(() => {})
}

export async function logEmbeddingUsage(userId, feature, tokenCount, provider = 'openai') {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return
  const cost = ((tokenCount || 0) / 1_000_000) * EMBEDDING_COSTS['text-embedding-3-small']
  fetch(`${SUPABASE_URL}/rest/v1/token_usage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, apikey: SUPABASE_SERVICE_KEY, Prefer: 'return=minimal' },
    body: JSON.stringify({ user_id: userId || 'anonymous', feature, model: 'text-embedding-3-small', provider, prompt_tokens: tokenCount || 0, completion_tokens: 0, total_tokens: tokenCount || 0, estimated_cost_usd: parseFloat(cost.toFixed(6)) }),
  }).catch(() => {})
}
