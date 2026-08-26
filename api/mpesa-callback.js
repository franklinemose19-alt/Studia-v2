const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

async function supaFetch(path, options = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, apikey: SUPABASE_SERVICE_KEY, ...(options.headers || {}) },
  })
}

function getPlanActivation(planId) {
  if (planId === 'achiever') return { type: 'minutes_pack', minutes: 45 }
  if (planId === 'achiever-plus') return { type: 'minutes_pack', minutes: 90 }
  if (planId === 'excellence') return { type: 'subscription', minutesAllowance: 600, periodDays: 30 }
  if (planId === 'valedictorian') return { type: 'subscription', minutesAllowance: 1800, periodDays: 120 }
  return null
}

function extractCallbackFields(stkCallback) {
  const items = stkCallback?.CallbackMetadata?.Item || []
  const get = (name) => items.find(i => i.Name === name)?.Value
  return {
    amount: get('Amount'),
    mpesaReceiptNumber: get('MpesaReceiptNumber'),
    phoneNumber: get('PhoneNumber'),
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const stkCallback = req.body?.Body?.stkCallback
    if (!stkCallback) return res.status(400).json({ error: 'Invalid callback payload' })

    const checkoutRequestId = stkCallback.CheckoutRequestID
    const resultCode = stkCallback.ResultCode
    const resultDesc = stkCallback.ResultDesc

    const paymentRes = await supaFetch(`payments?transaction_id=eq.${checkoutRequestId}&select=*`)
    const payments = await paymentRes.json()
    const payment = Array.isArray(payments) ? payments[0] : null

    if (!payment) {
      console.error('mpesa-callback: no matching payment for', checkoutRequestId)
      return res.status(200).json({ received: true })
    }

    if (resultCode !== 0) {
      await supaFetch(`payments?transaction_id=eq.${checkoutRequestId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'failed', mpesa_confirmation: { resultCode, resultDesc }, updated_at: new Date().toISOString() }),
      })
      return res.status(200).json({ received: true })
    }

    const { amount, mpesaReceiptNumber, phoneNumber } = extractCallbackFields(stkCallback)

    await supaFetch(`payments?transaction_id=eq.${checkoutRequestId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        status: 'completed',
        mpesa_confirmation: { resultCode, resultDesc, mpesaReceiptNumber, amount, phoneNumber },
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }),
    })

    const userId = payment.created_by
    const planId = payment.plan_id
    const activation = getPlanActivation(planId)

    if (userId && activation) {
      if (activation.type === 'minutes_pack') {
        const userRes = await supaFetch(`users?auth_id=eq.${userId}&select=purchased_minutes_remaining`)
        const userData = await userRes.json()
        const currentMinutes = userData?.[0]?.purchased_minutes_remaining || 0

        // FIXED: now also clears plan_locked. A minutes purchase should
        // always unlock the account, regardless of prior free-trial state.
        await supaFetch(`users?auth_id=eq.${userId}`, {
          method: 'PATCH',
          body: JSON.stringify({ purchased_minutes_remaining: currentMinutes + activation.minutes, plan_locked: false }),
        })

        await supaFetch('notifications', {
          method: 'POST', headers: { Prefer: 'return=minimal' },
          body: JSON.stringify({
            user_id: userId, type: 'success', title: '✅ Payment confirmed',
            message: `You've unlocked ${activation.minutes} AI processing minutes. Happy studying!`,
          }),
        }).catch(() => {})

      } else if (activation.type === 'subscription') {
        const now = new Date()
        const periodEnd = new Date(now.getTime() + activation.periodDays * 24 * 60 * 60 * 1000)

        // FIXED: plan_locked: false added here — this is the actual root
        // cause of the SAGE-lockout bug. A subscription activating should
        // always mean the account is unlocked, full stop.
        await supaFetch(`users?auth_id=eq.${userId}`, {
          method: 'PATCH',
          body: JSON.stringify({
            current_plan: planId,
            subscription_status: 'active',
            lecture_allowance: activation.minutesAllowance,
            lectures_used: 0,
            period_start: now.toISOString(),
            period_end: periodEnd.toISOString(),
            plan_locked: false,
          }),
        })

        await supaFetch('notifications', {
          method: 'POST', headers: { Prefer: 'return=minimal' },
          body: JSON.stringify({
            user_id: userId, type: 'success', title: '✅ Subscription activated',
            message: `Your ${planId} plan is active — ${activation.minutesAllowance} AI minutes available.`,
          }),
        }).catch(() => {})
      }
    }

    return res.status(200).json({ received: true })
  } catch (error) {
    console.error('mpesa-callback error:', error)
    return res.status(200).json({ received: true, error: error.message })
  }
}
