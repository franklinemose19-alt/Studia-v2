const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

// Per-1M-token rates. gpt-5-mini was previously logged at an incorrect
// $0.15/$0.60 estimate — corrected to the real $0.25/$2.00 rate here.
// This doesn't change what anything actually costs, only makes the Admin
// Dashboard's cost figures accurate going forward.
const COSTS = {
  'gpt-5-mini':  { input: 0.25, output: 2.00 },
  'gpt-4o-mini': { input: 0.15, output: 0.60 },
  'gpt-4o':      { input: 2.50, output: 10.00 },
}
const EMBEDDING_COSTS = { 'text-embedding-3-small': 0.02 }

// Per-audio-minute rates, billed by duration rather than tokens — matches
// how OpenAI itself prices transcription.
const TRANSCRIPTION_COSTS_PER_MINUTE = {
  'gpt-4o-mini-transcribe': 0.003,
  'whisper-1': 0.006, // kept for reference only — no longer used going forward
}

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

// Renamed from logWhisperUsage — STUDIA no longer uses Whisper for new
// transcriptions, so the old name would have been misleading going forward.
export async function logTranscriptionUsage(userId, durationSeconds, model = 'gpt-4o-mini-transcribe', provider = 'openai') {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return
  const durationMinutes = (durationSeconds || 0) / 60
  const rate = TRANSCRIPTION_COSTS_PER_MINUTE[model] ?? TRANSCRIPTION_COSTS_PER_MINUTE['gpt-4o-mini-transcribe']
  const cost = durationMinutes * rate
  fetch(`${SUPABASE_URL}/rest/v1/token_usage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, apikey: SUPABASE_SERVICE_KEY, Prefer: 'return=minimal' },
    body: JSON.stringify({ user_id: userId || 'anonymous', feature: 'transcription', model, provider, prompt_tokens: 0, completion_tokens: 0, total_tokens: Math.round(durationMinutes * 1000), estimated_cost_usd: parseFloat(cost.toFixed(6)) }),
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
