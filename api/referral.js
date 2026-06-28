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

function computeMilestoneTotal(count) {
  if (count >= 100) return 150 + (count - 100) * 1
  const tiers = [
    { threshold: 100, total: 150 },
    { threshold: 50, total: 70 },
    { threshold: 25, total: 30 },
    { threshold: 10, total: 12 },
    { threshold: 5, total: 5 },
    { threshold: 1, total: 2 },
  ]
  for (const tier of tiers) {
    if (count >= tier.threshold) return tier.total
  }
  return 0
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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { action } = req.body

    if (action === 'generate') {
      const { userId } = req.body
      if (!userId) return res.status(400).json({ error: 'userId required' })

      const existingRes = await supaFetch(`users?auth_id=eq.${userId}&select=referral_code,verified_referral_count,is_campus_ambassador`)
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
        const updateRes = await supaFetch(`users?auth_id=eq.${userId}`, {
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

    if (action === 'link') {
      const { userId, code } = req.body
      if (!userId || !code) return res.status(400).json({ error: 'userId and code required' })

      const referrerRes = await supaFetch(`users?referral_code=eq.${code}&select=auth_id`)
      const referrerData = await referrerRes.json()
      const referrer = referrerData?.[0]

      if (!referrer || referrer.auth_id === userId) {
        return res.status(200).json({ linked: false })
      }

      const insertRes = await supaFetch(`referrals`, {
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

    if (action === 'verify') {
      const { userId } = req.body
      if (!userId) return res.status(400).json({ error: 'userId required' })

      const pendingRes = await supaFetch(`referrals?referred_user_id=eq.${userId}&status=eq.pending&select=id,referrer_user_id`)
      const pendingData = await pendingRes.json()
      const pending = pendingData?.[0]

      if (!pending) {
        return res.status(200).json({ verified: false })
      }

      await supaFetch(`referrals?id=eq.${pending.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'verified', verified_at: new Date().toISOString() }),
      })

      const friendRes = await supaFetch(`users?auth_id=eq.${userId}&select=lite_bonus_credits`)
      const friendData = await friendRes.json()
      const friendCredits = friendData?.[0]?.lite_bonus_credits || 0
      await supaFetch(`users?auth_id=eq.${userId}`, {
        method: 'PATCH',
        body: JSON.stringify({ lite_bonus_credits: friendCredits + 2 }),
      })

      const referrerRes = await supaFetch(
        `users?auth_id=eq.${pending.referrer_user_id}&select=verified_referral_count,referral_milestone_credits_awarded,lite_bonus_credits,is_campus_ambassador`
      )
      const referrerData = await referrerRes.json()
      const referrer = referrerData?.[0]

      if (referrer) {
        const newCount = (referrer.verified_referral_count || 0) + 1
        const newMilestoneTotal = computeMilestoneTotal(newCount)
        const alreadyAwarded = referrer.referral_milestone_credits_awarded || 0
        const topUp = Math.max(0, newMilestoneTotal - alreadyAwarded)

        await supaFetch(`users?auth_id=eq.${pending.referrer_user_id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            verified_referral_count: newCount,
            referral_milestone_credits_awarded: alreadyAwarded + topUp,
            lite_bonus_credits: (referrer.lite_bonus_credits || 0) + topUp,
            is_campus_ambassador: newCount >= 100 ? true : referrer.is_campus_ambassador,
          }),
        })
      }

      return res.status(200).json({ verified: true })
    }

    return res.status(400).json({ error: 'Invalid action' })
  } catch (error) {
    console.error('Referral error:', error)
    return res.status(500).json({ error: error.message || 'Internal server error' })
  }
}
