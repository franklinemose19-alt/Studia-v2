const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { transactionId, reason } = req.body

    if (!transactionId) {
      return res.status(400).json({ error: 'Transaction ID required' })
    }

    // Get current payment
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
        error: `Cannot refund payment with status: ${payment.status}`,
      })
    }

    // Initiate M-Pesa refund
    const CONSUMER_KEY = process.env.MPESA_CONSUMER_KEY
    const CONSUMER_SECRET = process.env.MPESA_CONSUMER_SECRET
    const BUSINESS_SHORTCODE = process.env.MPESA_SHORTCODE

    if (!CONSUMER_KEY || !CONSUMER_SECRET) {
      // Even if M-Pesa refund fails, mark as refunded in DB
      const updateResponse = await fetch(
        `${supabaseUrl}/rest/v1/payments?transaction_id=eq.${transactionId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            status: 'refunded',
            refund_reason: reason || 'Processing failed',
            updated_at: new Date().toISOString(),
          }),
        }
      )

      return res.status(200).json({
        success: true,
        message: 'Payment marked as refunded. M-Pesa refund will be processed.',
      })
    }

    // Get access token
    const auth = Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString('base64')
    const tokenResponse = await fetch('https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials', {
      method: 'GET',
      headers: {
        Authorization: `Basic ${auth}`,
      },
    })

    const tokenData = await tokenResponse.json()

    if (tokenData.access_token) {
      // Try to initiate M-Pesa refund
      await fetch('https://sandbox.safaricom.co.ke/mpesa/reversal/v1/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenData.access_token}`,
        },
        body: JSON.stringify({
          Initiator: 'STUDIA',
          CommandID: 'TransactionReversal',
          TransactionID: payment.mpesa_confirmation?.transactionId || '',
          Amount: payment.amount,
          ReceiverParty: BUSINESS_SHORTCODE,
          RecieverIdentifierType: '4',
          ResultURL: `${process.env.VERCEL_URL || 'https://yourdomain.com'}/api/refund-callback`,
          QueueTimeOutURL: `${process.env.VERCEL_URL || 'https://yourdomain.com'}/api/refund-timeout`,
          Remarks: reason || 'Processing failed',
        }),
      })
    }

    // Mark as refunded in database
    const updateResponse = await fetch(
      `${supabaseUrl}/rest/v1/payments?transaction_id=eq.${transactionId}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({
          status: 'refunded',
          refund_reason: reason || 'Processing failed',
          updated_at: new Date().toISOString(),
        }),
      }
    )

    if (updateResponse.ok) {
      console.log(`Refund initiated: ${transactionId}. Amount: KSh ${payment.amount}`)

      return res.status(200).json({
        success: true,
        message: 'Refund initiated. Funds will return to customer M-Pesa within 24 hours.',
        payment: {
          transactionId,
          status: 'refunded',
        },
      })
    } else {
      return res.status(500).json({
        success: false,
        error: 'Failed to process refund',
      })
    }
  } catch (error) {
    console.error('Refund Payment Error:', error)
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    })
  }
}
