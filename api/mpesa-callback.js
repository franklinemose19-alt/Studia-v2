const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

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
      // Payment successful - update to "processing"
      const updateResponse = await fetch(
        `${supabaseUrl}/rest/v1/payments?transaction_id=eq.${CheckoutRequestID}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            status: 'processing',
            mpesa_confirmation: {
              resultCode: ResultCode,
              resultDesc: ResultDesc,
              amount: CallbackMetadata?.Item?.[0]?.Value,
              transactionDate: CallbackMetadata?.Item?.[1]?.Value,
              transactionId: CallbackMetadata?.Item?.[2]?.Value,
              phoneNumber: CallbackMetadata?.Item?.[3]?.Value,
            },
            updated_at: new Date().toISOString(),
          }),
        }
      )

      if (updateResponse.ok) {
        console.log(`Payment confirmed: ${CheckoutRequestID}. Status: processing`)
        return res.status(200).json({
          success: true,
          message: 'Payment received. Funds held in escrow. Processing...',
        })
      } else {
        console.error('Failed to update payment:', await updateResponse.text())
        return res.status(200).json({ success: true }) // Return 200 to acknowledge to Safaricom
      }
    } else {
      // Payment failed - update to "failed"
      const updateResponse = await fetch(
        `${supabaseUrl}/rest/v1/payments?transaction_id=eq.${CheckoutRequestID}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            status: 'failed',
            updated_at: new Date().toISOString(),
          }),
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
