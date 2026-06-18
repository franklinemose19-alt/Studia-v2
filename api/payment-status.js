const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { transactionId } = req.query
  if (!transactionId) {
    return res.status(400).json({ error: 'transactionId is required' })
  }

  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/payments?transaction_id=eq.${transactionId}&select=status,plan_name,plan_id`,
      {
        headers: {
          Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
          apikey: SUPABASE_SERVICE_KEY,
        },
      }
    )
    const data = await response.json()
    const payment = data?.[0]
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' })
    }
    return res.status(200).json({ status: payment.status, planName: payment.plan_name, planId: payment.plan_id })
  } catch (error) {
    console.error('Payment status check error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
