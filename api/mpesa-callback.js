
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

async function supaFetch(path, options = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      apikey: SUPABASE_SERVICE_KEY,
      Prefer: 'return=minimal',
      ...(options.headers || {}),
    },
  })
}

async function insertNotification(userId, title, message, type = 'info') {
  try {
    await supaFetch('notifications', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, title, message, type }),
    })
  } catch (err) {
    console.error('Failed to insert notification:', err)
  }
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
  if (planId === 'excellence') return 20      // was 25
  if (planId === 'valedictorian') return 65   // was 80
  return 0
}
function getPlanDisplayName(planId) {
  const names = {
    'achiever-1hr': 'Achiever (1 Hour)',
    'achiever-2hr': 'Achiever (2 Hours)',
    'excellence': '🚀 Excellence',
    'valedictorian': '🏆 Valedictorian',
  }
  return names[planId] || planId
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

      // Fetch payment to get userId for notification
      const paymentRes = await supaFetch(`payments?transaction_id=eq.${CheckoutRequestID}&select=created_by,plan_name`)
      const payments = await paymentRes.json()
      if (payments?.[0]?.created_by) {
        await insertNotification(
          payments[0].created_by,
          'Payment Failed ❌',
          `Your payment for ${payments[0].plan_name || 'STUDIA'} was not completed. Please try again.`,
          'error'
        )
      }

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

    // Mark payment completed
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
    const planName = getPlanDisplayName(planId)

    if (!userId) {
      console.warn('No userId on payment')
      return res.status(200).json({ success: true })
    }

    // ── Achiever (pay-per-lecture) ─────────────────────────────────────────
    if (planId && (planId.startsWith('achiever') || planId.startsWith('lite'))) {
      const userRes = await supaFetch(`users?auth_id=eq.${userId}&select=lite_bonus_credits`)
      const userData = await userRes.json()
      const currentBonus = userData?.[0]?.lite_bonus_credits || 0

      await supaFetch(`users?auth_id=eq.${userId}`, {
        method: 'PATCH',
        body: JSON.stringify({ lite_bonus_credits: currentBonus + 1 }),
      })

      const duration = planId.includes('2hr') ? '2 hours' : '1 hour'
      await insertNotification(
        userId,
        'Lecture Unlocked! 🎙️',
        `Your ${duration} lecture session is ready. Start recording now! You also received 1 bonus AI credit.`,
        'success'
      )

      console.log(`✅ Achiever lecture unlocked for user ${userId}`)
      return res.status(200).json({ success: true })
    }

    // ── Excellence / Valedictorian ─────────────────────────────────────────
    if (planId === 'excellence' || planId === 'valedictorian') {
      const endDate = getEndDate(planId)
      const allowance = getLectureAllowance(planId)
      const now = new Date().toISOString()
      const periodLabel = planId === 'valedictorian' ? 'semester' : 'month'

      // Upsert subscription
      await supaFetch('subscriptions', {
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

      // Update user record
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

      await insertNotification(
        userId,
        `${planName} Activated! 🎉`,
        `You now have ${allowance} AI lectures this ${periodLabel}. Your plan is active until ${endDate ? new Date(endDate).toLocaleDateString() : 'end of period'}. Start recording!`,
        'success'
      )

      console.log(`✅ ${planId} activated for user ${userId} — ${allowance} lectures until ${endDate}`)
    }

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('Callback error:', error)
    return res.status(500).json({ error: error.message })
  }
}
