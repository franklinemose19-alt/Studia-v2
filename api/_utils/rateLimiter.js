const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const WINDOW_SECONDS = 300     // 5 minutes
const MAX_REQUESTS = 20        // per window, shared across all AI endpoints
const COOLDOWN_SECONDS = 300   // 5 minute block once tripped

async function supaFetch(path, options = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      apikey: SUPABASE_SERVICE_KEY,
      ...(options.headers || {}),
    },
  })
}

async function notifyAdmins(message) {
  try {
    const adminsRes = await supaFetch('users?is_admin=eq.true&select=auth_id')
    const admins = await adminsRes.json()
    if (!Array.isArray(admins)) return
    await Promise.all(admins.map(a =>
      supaFetch('notifications', {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({
          user_id: a.auth_id,
          title: '⚠️ Unusual activity detected',
          message,
          type: 'warning',
        }),
      })
    ))
  } catch (err) {
    console.error('notifyAdmins failed:', err)
  }
}

function logSecurityEvent(userId, eventType, detail) {
  supaFetch('security_events', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ user_id: userId || 'unknown', event_type: eventType, detail }),
  }).catch(err => console.error('logSecurityEvent failed:', err))
}

// Returns { allowed: true } or { allowed: false, retryAfterSeconds, reason }
export async function checkRateLimit(userId, endpoint) {
  if (!userId) {
    // Legitimate STUDIA traffic always sends a userId. No identity, no access.
    return { allowed: false, retryAfterSeconds: 60, reason: 'missing_user_id' }
  }

  try {
    const res = await supaFetch(`api_rate_limits?user_id=eq.${encodeURIComponent(userId)}&select=*`)
    const rows = await res.json()
    const row = Array.isArray(rows) ? rows[0] : null
    const now = new Date()

    if (row?.blocked_until && new Date(row.blocked_until) > now) {
      const retryAfterSeconds = Math.ceil((new Date(row.blocked_until).getTime() - now.getTime()) / 1000)
      return { allowed: false, retryAfterSeconds, reason: 'cooldown' }
    }

    if (!row) {
      await supaFetch('api_rate_limits', {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ user_id: userId, window_start: now.toISOString(), request_count: 1 }),
      })
      return { allowed: true }
    }

    const windowStart = new Date(row.window_start)
    const windowExpired = (now.getTime() - windowStart.getTime()) / 1000 > WINDOW_SECONDS

    if (windowExpired) {
      await supaFetch(`api_rate_limits?user_id=eq.${encodeURIComponent(userId)}`, {
        method: 'PATCH',
        body: JSON.stringify({ window_start: now.toISOString(), request_count: 1, blocked_until: null }),
      })
      return { allowed: true }
    }

    const newCount = (row.request_count || 0) + 1

    if (newCount > MAX_REQUESTS) {
      const blockedUntil = new Date(now.getTime() + COOLDOWN_SECONDS * 1000)
      await supaFetch(`api_rate_limits?user_id=eq.${encodeURIComponent(userId)}`, {
        method: 'PATCH',
        body: JSON.stringify({ request_count: newCount, blocked_until: blockedUntil.toISOString() }),
      })
      logSecurityEvent(userId, 'rate_limit_tripped', `${newCount} requests to ${endpoint} within ${WINDOW_SECONDS}s`)
      notifyAdmins(`User ${userId.slice(0, 8)}… made ${newCount} AI requests in under ${Math.round(WINDOW_SECONDS / 60)} minutes (${endpoint}) and has been temporarily blocked.`)
      return { allowed: false, retryAfterSeconds: COOLDOWN_SECONDS, reason: 'limit_exceeded' }
    }

    await supaFetch(`api_rate_limits?user_id=eq.${encodeURIComponent(userId)}`, {
      method: 'PATCH',
      body: JSON.stringify({ request_count: newCount }),
    })
    return { allowed: true }
  } catch (err) {
    console.error('checkRateLimit failed, failing open:', err)
    // If the limiter itself breaks, don't take the whole app down for every student —
    // fail open. A transient infra error shouldn't cost more than the abuse it guards against.
    return { allowed: true }
  }
}
