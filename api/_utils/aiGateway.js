import { logTokenUsage, logTranscriptionUsage, logEmbeddingUsage } from './tokenLogger.js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const OPENAI_MODEL_CHAT = 'gpt-5-mini'
const OPENAI_MODEL_EMBED = 'text-embedding-3-small'
const OPENAI_MODEL_TRANSCRIBE = 'gpt-4o-mini-transcribe'

async function supaFetch(path, options = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, apikey: SUPABASE_SERVICE_KEY, ...(options.headers || {}) },
  })
}

class GatewayError extends Error {
  constructor(kind, message, httpStatus) {
    super(message)
    this.kind = kind
    this.httpStatus = httpStatus
  }
}

async function fetchWithTimeout(url, options, timeoutMs = 25000) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } catch (err) {
    if (err.name === 'AbortError') { const e = new Error('Request timed out'); e.isTimeout = true; throw e }
    throw err
  } finally {
    clearTimeout(timeout)
  }
}

function mapHttpError(status) {
  if (status === 429) return 'rate_limited'
  if (status === 401 || status === 403) return 'auth_error'
  if (status >= 500) return 'unavailable'
  return 'error'
}

// ── Settings cache — avoids hitting Supabase on every single AI call ───────
let settingsCache = null
let settingsCacheAt = 0
const SETTINGS_TTL_MS = 20000

function invalidateSettingsCache() { settingsCache = null }

async function getGatewaySettings() {
  const now = Date.now()
  if (settingsCache && now - settingsCacheAt < SETTINGS_TTL_MS) return settingsCache

  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)
  const startIso = startOfMonth.toISOString()

  const [settingsRes, healthRes, budgetRes, spendRes] = await Promise.all([
    supaFetch(`system_settings?key=eq.ai_openai_enabled&select=key,value`),
    supaFetch(`ai_provider_health?provider=eq.openai&select=*`),
    supaFetch(`ai_provider_budgets?provider=eq.openai&select=*`),
    supaFetch(`token_usage?created_at=gte.${startIso}&select=estimated_cost_usd`),
  ])
  const settingsRows = await settingsRes.json().catch(() => [])
  const healthRows = await healthRes.json().catch(() => [])
  const budgetRows = await budgetRes.json().catch(() => [])
  const spendRows = await spendRes.json().catch(() => [])

  const enabled = Array.isArray(settingsRows) && settingsRows[0] ? settingsRows[0].value !== 'false' : true
  const health = Array.isArray(healthRows) ? healthRows[0] : null
  const budget = Array.isArray(budgetRows) ? budgetRows[0] : null
  const spend = (Array.isArray(spendRows) ? spendRows : []).reduce((s, r) => s + parseFloat(r.estimated_cost_usd || 0), 0)

  settingsCache = { enabled, health, budget, spend }
  settingsCacheAt = now
  return settingsCache
}

function isEligible(settings) {
  if (!settings.enabled) return { eligible: false, reason: 'disabled' }
  if (settings.health && settings.health.status === 'unavailable') return { eligible: false, reason: 'unhealthy' }
  const budget = settings.budget
  if (budget && budget.monthly_budget_usd > 0) {
    const thresholdUsd = budget.monthly_budget_usd * (budget.safety_threshold_pct / 100)
    if (settings.spend >= thresholdUsd) return { eligible: false, reason: 'budget_limited' }
  }
  if (!process.env.OPENAI_API_KEY) return { eligible: false, reason: 'not_configured' }
  return { eligible: true }
}

async function recordHealth(success, latencyMs) {
  try {
    const existingRes = await supaFetch(`ai_provider_health?provider=eq.openai&select=*`)
    const existing = (await existingRes.json())?.[0]
    const prevFailures = existing?.consecutive_failures || 0
    const prevAvgLatency = existing?.avg_latency_ms || latencyMs
    const newFailures = success ? 0 : prevFailures + 1
    const newAvgLatency = Math.round(prevAvgLatency * 0.8 + latencyMs * 0.2)
    const status = !success && newFailures >= 3 ? 'unavailable' : !success ? 'degraded' : 'healthy'

    await supaFetch(`ai_provider_health?provider=eq.openai`, {
      method: 'PATCH',
      body: JSON.stringify({
        status, consecutive_failures: newFailures, avg_latency_ms: newAvgLatency,
        [success ? 'last_success_at' : 'last_failure_at']: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }),
    })
    invalidateSettingsCache()
  } catch (err) { console.error('recordHealth failed (non-critical):', err) }
}

// ── OpenAI calls — the only provider now ────────────────────────────────────
async function callOpenAIChat({ messages, maxTokens, temperature, responseFormat }) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new GatewayError('not_configured', 'OPENAI_API_KEY not set')
  const body = { model: OPENAI_MODEL_CHAT, messages, max_tokens: maxTokens || 1000 }
  if (temperature !== undefined) body.temperature = temperature
  if (responseFormat) body.response_format = responseFormat

  const res = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` }, body: JSON.stringify(body),
  })
  const data = await res.json()
  if (!res.ok) throw new GatewayError(mapHttpError(res.status), data.error?.message || 'OpenAI request failed', res.status)
  return { content: data.choices?.[0]?.message?.content || '', usage: data.usage, model: OPENAI_MODEL_CHAT }
}

async function callOpenAIEmbed({ input }) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new GatewayError('not_configured', 'OPENAI_API_KEY not set')
  const res = await fetchWithTimeout('https://api.openai.com/v1/embeddings', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: OPENAI_MODEL_EMBED, input }),
  })
  const data = await res.json()
  if (!res.ok) throw new GatewayError(mapHttpError(res.status), data.error?.message || 'Embedding failed', res.status)
  return { embeddings: (data.data || []).map(d => d.embedding), usage: data.usage }
}

async function callOpenAITranscribe({ audioBuffer, mimeType }) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new GatewayError('not_configured', 'OPENAI_API_KEY not set')
  const audioBlob = new Blob([audioBuffer], { type: mimeType })
  const formData = new FormData()
  formData.append('file', audioBlob, 'lecture.webm')
  formData.append('model', OPENAI_MODEL_TRANSCRIBE)
  formData.append('response_format', 'json')

  const res = await fetchWithTimeout('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST', headers: { Authorization: `Bearer ${apiKey}` }, body: formData,
  }, 60000)
  const data = await res.json()
  if (!res.ok) throw new GatewayError(mapHttpError(res.status), data.error?.message || 'Transcription failed', res.status)
  return {
    transcript: data.text || '',
    duration: typeof data.duration === 'number' ? data.duration : null,
    segments: Array.isArray(data.segments) ? data.segments : [],
    model: OPENAI_MODEL_TRANSCRIBE,
  }
}

// ── Public gateway functions — same names and shapes as before. Every
// caller (ai-tools.js, quiz.js, summarize.js, generate-notes.js,
// generate-lecture-notes.js, parse-timetable.js, transcribe.js) needs
// zero changes — this is exactly why none of those files appear below. ──

export async function chatCompletion({ messages, maxTokens, temperature, responseFormat, feature, userId }) {
  const settings = await getGatewaySettings()
  if (!isEligible(settings).eligible) throw new Error('AI service is temporarily unavailable. Please try again shortly.')

  const attempt = async () => {
    const start = Date.now()
    try {
      const result = await callOpenAIChat({ messages, maxTokens, temperature, responseFormat })
      recordHealth(true, Date.now() - start).catch(() => {})
      logTokenUsage(userId, feature, result.model, result.usage, 'openai').catch(() => {})
      return result
    } catch (err) {
      recordHealth(false, Date.now() - start).catch(() => {})
      throw err
    }
  }

  try { return await attempt() }
  catch (err) {
    console.error(`Gateway: OpenAI failed for ${feature}, retrying once:`, err.message)
    try { return await attempt() }
    catch { throw new Error('AI service is temporarily unavailable. Please try again shortly.') }
  }
}

export async function embed({ input, feature, userId }) {
  const settings = await getGatewaySettings()
  if (!isEligible(settings).eligible) throw new Error('Embedding service is temporarily unavailable.')

  const attempt = async () => {
    const start = Date.now()
    try {
      const result = await callOpenAIEmbed({ input })
      recordHealth(true, Date.now() - start).catch(() => {})
      logEmbeddingUsage(userId, feature, result.usage?.total_tokens || 0, 'openai').catch(() => {})
      return result
    } catch (err) {
      recordHealth(false, Date.now() - start).catch(() => {})
      throw err
    }
  }

  try { return await attempt() }
  catch {
    try { return await attempt() }
    catch { throw new Error('Embedding service is temporarily unavailable.') }
  }
}

export async function transcribe({ audioBuffer, mimeType, feature, userId }) {
  const settings = await getGatewaySettings()
  if (!isEligible(settings).eligible) throw new Error('Transcription is temporarily unavailable. Please try again shortly.')

  const attempt = async () => {
    const start = Date.now()
    try {
      const result = await callOpenAITranscribe({ audioBuffer, mimeType })
      recordHealth(true, Date.now() - start).catch(() => {})
      logTranscriptionUsage(userId, result.duration || 0, result.model, 'openai').catch(() => {})
      return result
    } catch (err) {
      recordHealth(false, Date.now() - start).catch(() => {})
      throw err
    }
  }

  try { return await attempt() }
  catch {
    try { return await attempt() }
    catch { throw new Error('Transcription is temporarily unavailable. Please try again shortly.') }
  }
}
