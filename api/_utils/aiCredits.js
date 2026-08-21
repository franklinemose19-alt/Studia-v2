const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

async function rpc(name, params) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, apikey: SUPABASE_SERVICE_KEY },
    body: JSON.stringify(params),
  })
  if (!res.ok) throw new Error(`RPC ${name} failed: ${res.status} ${await res.text().catch(() => '')}`)
  return res.json()
}

// Call BEFORE any AI work. Atomically decides the right source (paid →
// bonus → explorer free, in that order) and consumes it in one locked
// database statement — this is what makes it race-safe.
export async function consumeAICredit(authId) {
  const rows = await rpc('consume_ai_credit', { p_auth_id: authId })
  const row = Array.isArray(rows) ? rows[0] : rows
  return row || { allowed: false, source: null, reason: 'error' }
}

// Call ONLY if the AI provider genuinely failed after consumeAICredit
// returned allowed:true — refunds the exact credit that was taken.
export async function releaseAICredit(authId, source) {
  if (!source) return
  try { await rpc('release_ai_credit', { p_auth_id: authId, p_source: source }) }
  catch (err) { console.error('releaseAICredit failed (non-critical):', err) }
}

// Lightweight, read-only — for actions that don't consume a credit
// (like SAGE chat) but should still be fully blocked once locked.
export async function isAccountLocked(authId) {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/users?auth_id=eq.${authId}&select=plan_locked`, {
      headers: { Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, apikey: SUPABASE_SERVICE_KEY },
    })
    const data = await res.json()
    return !!data?.[0]?.plan_locked
  } catch { return false }
}
