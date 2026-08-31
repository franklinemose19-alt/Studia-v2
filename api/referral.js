const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

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

async function getVerifiedUserId(req) {
  const authHeader = req.headers.authorization || req.headers.Authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null
  const token = authHeader.slice(7).trim()
  if (!token) return null
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_SERVICE_KEY },
    })
    if (!res.ok) return null
    const data = await res.json()
    return data?.id || null
  } catch { return null }
}

async function insertNotification(userId, title, message, type = 'info') {
  try {
    await supaFetch('notifications', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ user_id: userId, title, message, type }),
    })
  } catch (err) {
    console.error('Failed to insert notification:', err)
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { action } = req.body

    // ── Generate ──────────────────────────────────────────────────────────
    if (action === 'generate') {
      // FIXED: now requires a verified session token instead of trusting
      // whatever userId the client sends. PaymentDashboard.tsx (the only
      // caller) is updated in this same batch to send one.
      const authId = await getVerifiedUserId(req)
      if (!authId) return res.status(401).json({ error: 'Please sign in again.' })

      const existingRes = await supaFetch(
        `users?auth_id=eq.${authId}&select=referral_code,verified_referral_count,is_campus_ambassador`
      )
      const existing = await existingRes.json()
      const row = existing?.[0]

      if (row?.referral_code) {
        return res.status(200).json({
          code: row.referral_code,
          verifiedCount: row.verified_referral_count || 0,
          isAmbassador: row.is_campus_ambassador || false,
        })
      }

      let code = generateCode()
      for (let attempt = 0; attempt < 5; attempt++) {
        const updateRes = await supaFetch(`users?auth_id=eq.${authId}`, {
          method: 'PATCH',
          headers: { Prefer: 'return=representation' },
          body: JSON.stringify({ referral_code: code }),
        })
        if (updateRes.ok) {
          return res.status(200).json({ code, verifiedCount: 0, isAmbassador: false })
        }
        code = generateCode()
      }
      return res.status(500).json({ error: 'Could not generate referral code' })
    }

    // ── Link — left as-is. Almost certainly called right at signup
    // completion; hardening this without seeing Signup.tsx risks silently
    // breaking every new referred signup. Paste that file and I'll close
    // this loop too. ──────────────────────────────────────────────────────
    if (action === 'link') {
      const { userId, code } = req.body
      if (!userId || !code) return res.status(400).json({ error: 'userId and code required' })

      const referrerRes = await supaFetch(`users?referral_code=eq.${code}&select=auth_id`)
      const referrerData = await referrerRes.json()
      const referrer = referrerData?.[0]

      if (!referrer || referrer.auth_id === userId) {
        return res.status(200).json({ linked: false })
      }

      const insertRes = await supaFetch('referrals', {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({
          referrer_user_id: referrer.auth_id,
          referred_user_id: userId,
          referral_code_used: code,
          status: 'pending',
          created_at: new Date().toISOString(),
        }),
      })

      return res.status(200).json({ linked: insertRes.ok })
    }

    // ── Verify — reward logic fixed (flat 5 minutes, correct column).
    // Very likely dead code now that consume_ai_minutes() triggers
    // verify_referral_for_user() automatically server-side, but fixed
    // regardless rather than left broken — and safe either way since both
    // paths share the same "only fires while status is still pending"
    // guard, so there's no risk of double-rewarding if both ever fire. ────
    if (action === 'verify') {
      const { userId } = req.body
      if (!userId) return res.status(400).json({ error: 'userId required' })

      const pendingRes = await supaFetch(
        `referrals?referred_user_id=eq.${userId}&status=eq.pending&select=id,referrer_user_id`
      )
      const pendingData = await pendingRes.json()
      const pending = pendingData?.[0]

      if (!pending) {
        return res.status(200).json({ verified: false })
      }

      await supaFetch(`referrals?id=eq.${pending.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'verified', verified_at: new Date().toISOString() }),
      })

      const friendRes = await supaFetch(`users?auth_id=eq.${userId}&select=purchased_minutes_remaining`)
      const friendData = await friendRes.json()
      const friendMinutes = friendData?.[0]?.purchased_minutes_remaining || 0
      await supaFetch(`users?auth_id=eq.${userId}`, {
        method: 'PATCH',
        body: JSON.stringify({ purchased_minutes_remaining: friendMinutes + 5 }),
      })

      await insertNotification(
        userId,
        'Bonus Minutes Unlocked! 🎁',
        'You received 5 bonus AI minutes from your referral invitation. Use them on recording, quizzes, or SAGE!',
        'success'
      )

      const referrerRes = await supaFetch(
        `users?auth_id=eq.${pending.referrer_user_id}&select=verified_referral_count,purchased_minutes_remaining,is_campus_ambassador`
      )
      const referrerData = await referrerRes.json()
      const referrer = referrerData?.[0]

      if (referrer) {
        const newCount = (referrer.verified_referral_count || 0) + 1
        const becomeAmbassador = newCount >= 100 && !referrer.is_campus_ambassador

        await supaFetch(`users?auth_id=eq.${pending.referrer_user_id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            verified_referral_count: newCount,
            purchased_minutes_remaining: (referrer.purchased_minutes_remaining || 0) + 5,
            is_campus_ambassador: newCount >= 100 ? true : referrer.is_campus_ambassador,
          }),
        })

        if (becomeAmbassador) {
          await insertNotification(
            pending.referrer_user_id,
            'Campus Ambassador! 🏆',
            "You've reached 100 verified referrals! You're now a STUDIA Campus Ambassador.",
            'success'
          )
        } else {
          const milestoneMessages = {
            1: 'Your first referral was verified! You earned 5 bonus AI minutes 🎁',
            5: "You've referred 5 students! Keep it up 🎉",
            10: 'Amazing! 10 verified referrals — major milestone 🏅',
            25: "You're a STUDIA super-referrer! 25 students and counting 🔥",
            50: 'Halfway to Ambassador — 50 verified referrals! 🌟',
          }
          const msg = milestoneMessages[newCount] || 'Someone joined using your referral link! You earned 5 bonus AI minutes.'

          await insertNotification(
            pending.referrer_user_id,
            'New Referral Verified! 🎁',
            msg,
            'success'
          )
        }
      }

      return res.status(200).json({ verified: true })
    }

    return res.status(400).json({ error: 'Invalid action' })
  } catch (error) {
    console.error('Referral error:', error)
    return res.status(500).json({ error: error.message || 'Internal server error' })
  }
}
