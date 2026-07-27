const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

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

function getEndDate(planId) {
  const now = new Date()
  if (planId === 'excellence') {
    const end = new Date(now)
    end.setMonth(end.getMonth() + 1)
    return end.toISOString()
  }
  if (planId === 'valedictorian') {
    const end = new Date(now)
    end.setMonth(end.getMonth() + 6)
    return end.toISOString()
  }
  return null
}

function getLectureAllowance(planId) {
  if (planId === 'excellence') return 25      // 25 lectures/month
  if (planId === 'valedictorian') return 80   // 80 lectures/semester
  return 0
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const callbackData = req.body?.Body?.stkCallback
    if (!callbackData) {
      return res.status(400).json({ error: 'Invalid callback structure' })
    }

    const { ResultCode, CheckoutRequestID } = callbackData
    if (ResultCode !== 0) {
      console.log(`Payment failed: ${CheckoutRequestID}, Code: ${ResultCode}`)
      await supaFetch(`payments?transaction_id=eq.${CheckoutRequestID}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'failed', updated_at: new Date().toISOString() }),
      })
      return res.status(200).json({ success: true })
    }

    // Fetch payment record
    const paymentRes = await supaFetch(`payments?transaction_id=eq.${CheckoutRequestID}`)
    const payments = await paymentRes.json()
    const payment = payments?.[0]

    if (!payment) {
      console.error('Payment record not found:', CheckoutRequestID)
      return res.status(200).json({ success: true })
    }

    // Update payment to completed
    await supaFetch(`payments?transaction_id=eq.${CheckoutRequestID}`, {
      method: 'PATCH',
      body: JSON.stringify({
        status: 'completed',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }),
    })

    const userId = payment.created_by
    const planId = payment.plan_id

    if (!userId) {
      console.warn('No userId on payment')
      return res.status(200).json({ success: true })
    }

    // ── Achiever (pay-per-lecture) — don't touch subscriptions ────────────
    if (planId && (planId.startsWith('achiever') || planId.startsWith('lite'))) {
      console.log(`✅ Achiever lecture payment confirmed for user ${userId}`)
      // Grant one bonus AI credit for non-recording AI features
      const userRes = await supaFetch(`users?auth_id=eq.${userId}&select=lite_bonus_credits`)
      const userData = await userRes.json()
      const currentBonus = userData?.[0]?.lite_bonus_credits || 0
      await supaFetch(`users?auth_id=eq.${userId}`, {
        method: 'PATCH',
        body: JSON.stringify({ lite_bonus_credits: currentBonus + 1 }),
      })
      return res.status(200).json({ success: true })
    }

    // ── Excellence / Valedictorian — activate subscription ────────────────
    if (planId === 'excellence' || planId === 'valedictorian') {
      const endDate = getEndDate(planId)
      const allowance = getLectureAllowance(planId)
      const now = new Date().toISOString()

      // Upsert subscription
      await supaFetch(`subscriptions`, {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates' },
        body: JSON.stringify({
          user_id: userId,
          plan_id: planId,
          status: 'active',
          start_date: now,
          end_date: endDate,
          created_at: now,
          updated_at: now,
        }),
      })

      // Update user record — reset lecture usage, set new allowance
      await supaFetch(`users?auth_id=eq.${userId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          current_plan: planId,
          subscription_status: 'active',
          lecture_allowance: allowance,
          lectures_used: 0,
          period_start: now,
          period_end: endDate,
          plan_locked: false,
          updated_at: now,
        }),
      })

      console.log(`✅ ${planId} activated for user ${userId} — ${allowance} lectures until ${endDate}`)
    }

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('Callback error:', error)
    return res.status(500).json({ error: error.message })
  }
}
