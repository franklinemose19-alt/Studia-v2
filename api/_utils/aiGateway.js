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
  constructor(provider, kind, message, httpStatus) {
    super(message)
    this.provider = provider
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

  const [settingsRes, healthRes, budgetsRes, spendRes] = await Promise.all([
    supaFetch(`system_settings?key=in.(ai_openai_enabled,ai_azure_enabled)&select=key,value`),
    supaFetch(`ai_provider_health?select=*`),
    supaFetch(`ai_provider_budgets?select=*`),
    supaFetch(`token_usage?created_at=gte.${startIso}&select=provider,estimated_cost_usd`),
  ])
  const settingsRows = await settingsRes.json().catch(() => [])
  const healthRows = await healthRes.json().catch(() => [])
  const budgetRows = await budgetsRes.json().catch(() => [])
  const spendRows = await spendRes.json().catch(() => [])

  const enabled = {}
  ;(Array.isArray(settingsRows) ? settingsRows : []).forEach(r => { enabled[r.key] = r.value === 'true' })

  const health = {}
  ;(Array.isArray(healthRows) ? healthRows : []).forEach(r => { health[r.provider] = r })

  const budgets = {}
  ;(Array.isArray(budgetRows) ? budgetRows : []).forEach(r => { budgets[r.provider] = r })

  const spend = { openai: 0, azure: 0 }
  ;(Array.isArray(spendRows) ? spendRows : []).forEach(r => {
    const p = r.provider || 'openai'
    spend[p] = (spend[p] || 0) + parseFloat(r.estimated_cost_usd || 0)
  })

  settingsCache = {
    openaiEnabled: enabled.ai_openai_enabled !== false,
    azureEnabled: enabled.ai_azure_enabled === true,
    health, budgets, spend,
  }
  settingsCacheAt = now
  return settingsCache
}

function isProviderEligible(provider, settings) {
  const enabledFlag = provider === 'openai' ? settings.openaiEnabled : settings.azureEnabled
  if (!enabledFlag) return { eligible: false, reason: 'disabled' }

  const health = settings.health[provider]
  if (health && health.status === 'unavailable') return { eligible: false, reason: 'unhealthy' }

  const budget = settings.budgets[provider]
  const spend = settings.spend[provider] || 0
  if (budget && budget.monthly_budget_usd > 0) {
    const thresholdUsd = budget.monthly_budget_usd * (budget.safety_threshold_pct / 100)
    if (spend >= thresholdUsd) return { eligible: false, reason: 'budget_limited' }
  }

  if (provider === 'openai' && !process.env.OPENAI_API_KEY) return { eligible: false, reason: 'not_configured' }
  if (provider === 'azure' && (!process.env.AZURE_OPENAI_ENDPOINT || !process.env.AZURE_OPENAI_API_KEY || !process.env.AZURE_OPENAI_DEPLOYMENT_CHAT)) {
    return { eligible: false, reason: 'not_configured' }
  }
  return { eligible: true }
}

function selectProvider(settings) {
  const candidates = ['openai', 'azure'].filter(p => isProviderEligible(p, settings).eligible)
  if (candidates.length === 0) return null
  if (candidates.length === 1) return candidates[0]

  const weights = candidates.map(p => {
    const health = settings.health[p]
    const latency = health?.avg_latency_ms || 1000
    const budget = settings.budgets[p]
    const spend = settings.spend[p] || 0
    const headroomPct = budget && budget.monthly_budget_usd > 0 ? Math.max(0.05, 1 - spend / budget.monthly_budget_usd) : 1
    const latencyScore = 1000 / Math.max(200, latency)
    return Math.max(0.01, latencyScore * headroomPct)
  })
  const total = weights.reduce((a, b) => a + b, 0)
  let r = Math.random() * total
  for (let i = 0; i < candidates.length; i++) { r -= weights[i]; if (r <= 0) return candidates[i] }
  return candidates[0]
}

async function recordHealth(provider, success, latencyMs) {
  try {
    const existingRes = await supaFetch(`ai_provider_health?provider=eq.${provider}&select=*`)
    const existing = (await existingRes.json())?.[0]
    const prevFailures = existing?.consecutive_failures || 0
    const prevAvgLatency = existing?.avg_latency_ms || latencyMs
    const newFailures = success ? 0 : prevFailures + 1
    const newAvgLatency = Math.round(prevAvgLatency * 0.8 + latencyMs * 0.2)
    const status = !success && newFailures >= 3 ? 'unavailable' : !success ? 'degraded' : 'healthy'

    await supaFetch(`ai_provider_health?provider=eq.${provider}`, {
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

function logFailover(feature, primaryProvider, fallbackProvider, reason, succeeded) {
  supaFetch('ai_failovers', {
    method: 'POST', headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ feature, primary_provider: primaryProvider, fallback_provider: fallbackProvider, reason, succeeded }),
  }).catch(() => {})
}

// ── OpenAI provider calls ───────────────────────────────────────────────────
async function callOpenAIChat({ messages, maxTokens, temperature, responseFormat }) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new GatewayError('openai', 'not_configured', 'OPENAI_API_KEY not set')
  const body = { model: OPENAI_MODEL_CHAT, messages, max_tokens: maxTokens || 1000 }
  if (temperature !== undefined) body.temperature = temperature
  if (responseFormat) body.response_format = responseFormat

  const res = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` }, body: JSON.stringify(body),
  })
  const data = await res.json()
  if (!res.ok) throw new GatewayError('openai', mapHttpError(res.status), data.error?.message || 'OpenAI request failed', res.status)
  return { content: data.choices?.[0]?.message?.content || '', usage: data.usage, model: OPENAI_MODEL_CHAT }
}

async function callOpenAIEmbed({ input }) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new GatewayError('openai', 'not_configured', 'OPENAI_API_KEY not set')
  const res = await fetchWithTimeout('https://api.openai.com/v1/embeddings', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: OPENAI_MODEL_EMBED, input }),
  })
  const data = await res.json()
  if (!res.ok) throw new GatewayError('openai', mapHttpError(res.status), data.error?.message || 'Embedding failed', res.status)
  return { embeddings: (data.data || []).map(d => d.embedding), usage: data.usage }
}

// Uses gpt-4o-mini-transcribe (half the cost of Whisper). Requests the
// simpler 'json' response format rather than 'verbose_json' — this newer
// model's exact support for segment-level timestamps isn't something I
// have confident knowledge of, so this is the safer, more broadly
// compatible choice. If 'data.duration' isn't present in the response,
// the caller (api/transcribe.js) falls back to the client-reported
// duration for billing purposes — see the comment there.
async function callOpenAITranscribe({ audioBuffer, mimeType }) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new GatewayError('openai', 'not_configured', 'OPENAI_API_KEY not set')
  const audioBlob = new Blob([audioBuffer], { type: mimeType })
  const formData = new FormData()
  formData.append('file', audioBlob, 'lecture.webm')
  formData.append('model', OPENAI_MODEL_TRANSCRIBE)
  formData.append('response_format', 'json')

  const res = await fetchWithTimeout('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST', headers: { Authorization: `Bearer ${apiKey}` }, body: formData,
  }, 60000)
  const data = await res.json()
  if (!res.ok) throw new GatewayError('openai', mapHttpError(res.status), data.error?.message || 'Transcription failed', res.status)
  return {
    transcript: data.text || '',
    duration: typeof data.duration === 'number' ? data.duration : null,
    segments: Array.isArray(data.segments) ? data.segments : [],
    model: OPENAI_MODEL_TRANSCRIBE,
  }
}

// ── Azure provider calls ────────────────────────────────────────────────────
const DEFAULT_AZURE_API_VERSION = '2024-08-01-preview'

async function callAzureChat({ messages, maxTokens, temperature, responseFormat }) {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT
  const apiKey = process.env.AZURE_OPENAI_API_KEY
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT_CHAT
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION || DEFAULT_AZURE_API_VERSION
  if (!endpoint || !apiKey || !deployment) throw new GatewayError('azure', 'not_configured', 'Azure OpenAI env vars not fully set')

  const body = { messages, max_tokens: maxTokens || 1000 }
  if (temperature !== undefined) body.temperature = temperature
  if (responseFormat) body.response_format = responseFormat

  const url = `${endpoint.replace(/\/$/, '')}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`
  const res = await fetchWithTimeout(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'api-key': apiKey }, body: JSON.stringify(body) })
  const data = await res.json()
  if (!res.ok) throw new GatewayError('azure', mapHttpError(res.status), data.error?.message || 'Azure OpenAI request failed', res.status)
  return { content: data.choices?.[0]?.message?.content || '', usage: data.usage, model: deployment }
}

async function callAzureEmbed({ input }) {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT
  const apiKey = process.env.AZURE_OPENAI_API_KEY
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT_EMBEDDING
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION || DEFAULT_AZURE_API_VERSION
  if (!endpoint || !apiKey || !deployment) throw new GatewayError('azure', 'not_configured', 'Azure embedding deployment not configured')

  const url = `${endpoint.replace(/\/$/, '')}/openai/deployments/${deployment}/embeddings?api-version=${apiVersion}`
  const res = await fetchWithTimeout(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'api-key': apiKey }, body: JSON.stringify({ input }) })
  const data = await res.json()
  if (!res.ok) throw new GatewayError('azure', mapHttpError(res.status), data.error?.message || 'Azure embedding failed', res.status)
  return { embeddings: (data.data || []).map(d => d.embedding), usage: data.usage }
}

// Azure deployment names are chosen by you at deploy time — the model this
// points to on Azure's side may not be an exact gpt-4o-mini-transcribe
// match. Since Azure is currently disabled/unconfigured in your setup,
// this is low-priority to verify until you actually turn Azure on.
async function callAzureTranscribe({ audioBuffer, mimeType }) {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT
  const apiKey = process.env.AZURE_OPENAI_API_KEY
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT_WHISPER
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION || DEFAULT_AZURE_API_VERSION
  if (!endpoint || !apiKey || !deployment) throw new GatewayError('azure', 'not_configured', 'Azure transcription deployment not configured')

  const audioBlob = new Blob([audioBuffer], { type: mimeType })
  const formData = new FormData()
  formData.append('file', audioBlob, 'lecture.webm')
  formData.append('response_format', 'json')

  const url = `${endpoint.replace(/\/$/, '')}/openai/deployments/${deployment}/audio/transcriptions?api-version=${apiVersion}`
  const res = await fetchWithTimeout(url, { method: 'POST', headers: { 'api-key': apiKey }, body: formData }, 60000)
  const data = await res.json()
  if (!res.ok) throw new GatewayError('azure', mapHttpError(res.status), data.error?.message || 'Azure transcription failed', res.status)
  return {
    transcript: data.text || '',
    duration: typeof data.duration === 'number' ? data.duration : null,
    segments: Array.isArray(data.segments) ? data.segments : [],
    model: deployment,
  }
}

// ── Public gateway functions — everything in STUDIA calls only these ───────

export async function chatCompletion({ messages, maxTokens, temperature, responseFormat, feature, userId }) {
  const settings = await getGatewaySettings()
  const primary = selectProvider(settings)
  if (!primary) throw new Error('No AI provider is currently available. Please try again shortly.')

  const attempt = async (provider) => {
    const start = Date.now()
    try {
      const result = provider === 'azure' ? await callAzureChat({ messages, maxTokens, temperature, responseFormat }) : await callOpenAIChat({ messages, maxTokens, temperature, responseFormat })
      recordHealth(provider, true, Date.now() - start).catch(() => {})
      logTokenUsage(userId, feature, result.model, result.usage, provider).catch(() => {})
      return { ...result, provider }
    } catch (err) {
      recordHealth(provider, false, Date.now() - start).catch(() => {})
      throw err
    }
  }

  try { return await attempt(primary) }
  catch (primaryErr) {
    console.error(`Gateway: ${primary} failed for ${feature}:`, primaryErr.message)
    const fallback = primary === 'openai' ? 'azure' : 'openai'
    if (!isProviderEligible(fallback, settings).eligible) throw new Error('AI service is temporarily unavailable. Please try again shortly.')
    try {
      const result = await attempt(fallback)
      logFailover(feature, primary, fallback, primaryErr.message, true)
      return result
    } catch (fallbackErr) {
      logFailover(feature, primary, fallback, fallbackErr.message, false)
      throw new Error('AI service is temporarily unavailable. Please try again shortly.')
    }
  }
}

export async function embed({ input, feature, userId }) {
  const settings = await getGatewaySettings()
  const primary = selectProvider(settings)
  if (!primary) throw new Error('No AI provider is currently available.')

  const attempt = async (provider) => {
    const start = Date.now()
    try {
      const result = provider === 'azure' ? await callAzureEmbed({ input }) : await callOpenAIEmbed({ input })
      recordHealth(provider, true, Date.now() - start).catch(() => {})
      logEmbeddingUsage(userId, feature, result.usage?.total_tokens || 0, provider).catch(() => {})
      return { ...result, provider }
    } catch (err) {
      recordHealth(provider, false, Date.now() - start).catch(() => {})
      throw err
    }
  }

  try { return await attempt(primary) }
  catch (primaryErr) {
    const fallback = primary === 'openai' ? 'azure' : 'openai'
    if (!isProviderEligible(fallback, settings).eligible) throw new Error('Embedding service is temporarily unavailable.')
    try {
      const result = await attempt(fallback)
      logFailover(feature, primary, fallback, primaryErr.message, true)
      return result
    } catch {
      logFailover(feature, primary, fallback, primaryErr.message, false)
      throw new Error('Embedding service is temporarily unavailable.')
    }
  }
}

export async function transcribe({ audioBuffer, mimeType, feature, userId }) {
  const settings = await getGatewaySettings()
  const primary = selectProvider(settings)
  if (!primary) throw new Error('No transcription provider is currently available.')

  const attempt = async (provider) => {
    const start = Date.now()
    try {
      const result = provider === 'azure' ? await callAzureTranscribe({ audioBuffer, mimeType }) : await callOpenAITranscribe({ audioBuffer, mimeType })
      recordHealth(provider, true, Date.now() - start).catch(() => {})
      logTranscriptionUsage(userId, result.duration || 0, result.model, provider).catch(() => {})
      return { ...result, provider }
    } catch (err) {
      recordHealth(provider, false, Date.now() - start).catch(() => {})
      throw err
    }
  }

  try { return await attempt(primary) }
  catch (primaryErr) {
    const fallback = primary === 'openai' ? 'azure' : 'openai'
    if (!isProviderEligible(fallback, settings).eligible) throw new Error('Transcription is temporarily unavailable. Please try again shortly.')
    try {
      const result = await attempt(fallback)
      logFailover(feature, primary, fallback, primaryErr.message, true)
      return result
    } catch {
      logFailover(feature, primary, fallback, primaryErr.message, false)
      throw new Error('Transcription is temporarily unavailable. Please try again shortly.')
    }
  }
}
