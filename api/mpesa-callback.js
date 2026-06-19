const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

function getEndDate(planId) {
  const now = new Date()
  if (planId === 'plus' || planId === 'pro') {
    now.setDate(now.getDate() + 30)
    return now.toISOString()
  }
  if (planId === 'semester') {
    now.setMonth(now.getMonth() + 4)
    return now.toISOString()
  }
  return null
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const body = req.body
    const stkCallback = body.Body?.stkCallback
    if (!stkCallback) {
      return res.status(400).json({ error: 'Invalid callback format' })
    }

    const { CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } = stkCallback

    if (ResultCode === 0) {
      const updateRes = await fetch(
        `${SUPABASE_URL}/rest/v1/payments?transaction_id=eq.${CheckoutRequestID}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
            apikey: SUPABASE_SERVICE_KEY,
            Prefer: 'return=representation',
          },
          body: JSON.stringify({
            status: 'completed',
            mpesa_confirmation: {
              resultCode: ResultCode,
              resultDesc: ResultDesc,
              amount: CallbackMetadata?.Item?.[0]?.Value,
              transactionDate: CallbackMetadata?.Item?.[1]?.Value,
              transactionId: CallbackMetadata?.Item?.[2]?.Value,
              phoneNumber: CallbackMetadata?.Item?.[3]?.Value,
            },
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }),
        }
      )

      if (!updateRes.ok) {
        console.error('Failed to update payment:', await updateRes.text())
        return res.status(200).json({ success: true })
      }

      const updatedPayments = await updateRes.json()
      const payment = updatedPayments?.[0]
      if (!payment) {
        console.error('No payment row found for', CheckoutRequestID)
        return res.status(200).json({ success: true })
      }

    const userId = payment.created_by
      const planId = payment.plan_id
      const planName = payment.plan_name

      if (!userId) {
        console.warn('Payment has no linked user — cannot activate plan')
        return res.status(200).json({ success: true })
      }

      // Lite is pay-per-lecture, not a recurring plan — Recording.tsx unlocks
      // access itself via polling. Don't touch subscriptions/users for it.
      if (planId && planId.startsWith('lite')) {
        console.log(`✅ Lite lecture payment confirmed for user ${userId}`)
        return res.status(200).json({ success: true })
      }

      const endDate = getEndDate(planId)

      const subRes = await fetch(`${SUPABASE_URL}/rest/v1/subscriptions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
          apikey: SUPABASE_SERVICE_KEY,
          Prefer: 'return=representation',
        },
        body: JSON.stringify({
          user_id: userId,
          plan_id: planId,
          plan_name: planName,
          status: 'active',
          start_date: new Date().toISOString(),
          end_date: endDate,
          payment_id: payment.id,
          auto_renew: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }),
      })

      let subscriptionId = null
      if (subRes.ok) {
        const subData = await subRes.json()
        subscriptionId = subData?.[0]?.id || null
      } else {
        console.error('Failed to create subscription:', await subRes.text())
      }

      const userUpdateRes = await fetch(
        `${SUPABASE_URL}/rest/v1/users?auth_id=eq.${userId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
            apikey: SUPABASE_SERVICE_KEY,
            Prefer: 'return=minimal',
          },
          body: JSON.stringify({
            current_plan: planName,
            plan_id: planId,
            subscription_status: 'active',
            subscription_id: subscriptionId,
            updated_at: new Date().toISOString(),
          }),
        }
      )

      if (!userUpdateRes.ok) {
        console.error('Failed to update user plan:', await userUpdateRes.text())
      }

      console.log(`✅ Plan activated: user ${userId} → ${planName}`)
      return res.status(200).json({ success: true })

    } else {
      await fetch(
        `${SUPABASE_URL}/rest/v1/payments?transaction_id=eq.${CheckoutRequestID}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
            apikey: SUPABASE_SERVICE_KEY,
          },
          body: JSON.stringify({ status: 'failed', updated_at: new Date().toISOString() }),
        }
      )
      console.log(`Payment failed: ${CheckoutRequestID}. Code: ${ResultCode}`)
      return res.status(200).json({ success: true })
    }
  } catch (error) {
    console.error('M-Pesa Callback Error:', error)
    return res.status(200).json({ success: true })
  }
}
