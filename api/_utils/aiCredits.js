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

function triggerReferralVerify(authId) {
  fetch(`${SUPABASE_URL}/rest/v1/rpc/verify_referral_for_user`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, apikey: SUPABASE_SERVICE_KEY },
    body: JSON.stringify({ p_user_id: authId }),
  }).catch(() => {})
}

// Function names kept identical to the previous credit-based system —
// ai-tools.js, quiz.js, summarize.js, and generate-notes.js all call
// consumeAICredit(authId) with no second argument and keep working
// completely unchanged, still consuming exactly 1 unit per call. The
// unit underneath is now minutes rather than a generic "credit," and
// transcribe.js is the only caller that passes a real duration.
export async function consumeAICredit(authId, minutes = 1) {
  const rows = await rpc('consume_ai_minutes', { p_auth_id: authId, p_minutes: minutes })
  const row = Array.isArray(rows) ? rows[0] : rows
  const result = row || { allowed: false, source: null, reason: 'error', minutes_consumed: 0 }
  if (result.allowed) triggerReferralVerify(authId)
  return result
}

export async function releaseAICredit(authId, source, minutes = 1) {
  if (!source) return
  try { await rpc('release_ai_minutes', { p_auth_id: authId, p_source: source, p_minutes: minutes }) }
  catch (err) { console.error('releaseAICredit failed (non-critical):', err) }
}

export async function isAccountLocked(authId) {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/users?auth_id=eq.${authId}&select=plan_locked`, {
      headers: { Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, apikey: SUPABASE_SERVICE_KEY },
    })
    const data = await res.json()
    return !!data?.[0]?.plan_locked
  } catch { return false }
}
