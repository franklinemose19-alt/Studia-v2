const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { transactionId, processingType } = req.body

    if (!transactionId) {
      return res.status(400).json({ error: 'Transaction ID required' })
    }

    // Get current payment status
    const getResponse = await fetch(
      `${supabaseUrl}/rest/v1/payments?transaction_id=eq.${transactionId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${supabaseServiceKey}`,
        },
      }
    )

    const payments = await getResponse.json()

    if (!payments || payments.length === 0) {
      return res.status(404).json({ error: 'Payment not found' })
    }

    const payment = payments[0]

    if (payment.status !== 'processing') {
      return res.status(400).json({
        error: `Cannot complete payment with status: ${payment.status}`,
      })
    }

    // Update to "completed"
    const updateResponse = await fetch(
      `${supabaseUrl}/rest/v1/payments?transaction_id=eq.${transactionId}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({
          status: 'completed',
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }),
      }
    )

    if (updateResponse.ok) {
      console.log(`Payment completed: ${transactionId}. Funds released from escrow.`)

      return res.status(200).json({
        success: true,
        message: 'Payment completed. Funds released.',
        payment: {
          transactionId,
          status: 'completed',
        },
      })
    } else {
      return res.status(500).json({
        success: false,
        error: 'Failed to update payment',
      })
    }
  } catch (error) {
    console.error('Complete Payment Error:', error)
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    })
  }
}
