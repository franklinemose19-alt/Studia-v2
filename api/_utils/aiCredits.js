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

// FIXED: this previously checked only the raw plan_locked flag, which is
// set once, permanently, the moment a student's 3rd free Explorer lecture
// completes — and was never cleared again on subscription activation. A
// student who exhausted their free trial and THEN paid for Excellence or
// Valedictorian still showed plan_locked=true, and this function reported
// them as locked, blocking SAGE chat outright. Now checks subscription
// status and purchased minutes first — an active subscription or any
// remaining purchased balance always overrides a stale lock.
export async function isAccountLocked(authId) {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/users?auth_id=eq.${authId}&select=plan_locked,subscription_status,current_plan,purchased_minutes_remaining`, {
      headers: { Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, apikey: SUPABASE_SERVICE_KEY },
    })
    const data = await res.json()
    const row = data?.[0]
    if (!row) return false
    const isActiveSubscriber = row.subscription_status === 'active' && ['excellence', 'valedictorian'].includes(row.current_plan)
    if (isActiveSubscriber) return false
    if ((row.purchased_minutes_remaining || 0) > 0) return false
    return !!row.plan_locked
  } catch { return false }
}
