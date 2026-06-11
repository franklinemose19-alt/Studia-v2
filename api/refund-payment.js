export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { transactionId, reason } = req.body

    if (!transactionId) {
      return res.status(400).json({ error: 'Transaction ID required' })
    }

    // Initialize global payments store if needed
    if (!global.payments) {
      global.payments = {}
    }

    const payment = global.payments[transactionId]

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' })
    }

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
      return res.status(500).json({
        success: false,
        error: 'M-Pesa credentials not configured.',
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

    if (!tokenData.access_token) {
      return res.status(500).json({
        success: false,
        error: 'Failed to authenticate with M-Pesa.',
      })
    }

    // Initiate refund
    const refundResponse = await fetch(
      'https://sandbox.safaricom.co.ke/mpesa/reversal/v1/request',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenData.access_token}`,
        },
        body: JSON.stringify({
          Initiator: 'STUDIA',
          SecurityCredential: process.env.MPESA_SECURITY_CREDENTIAL || '',
          CommandID: 'TransactionReversal',
          TransactionID: payment.mpesaConfirmation?.transactionId || '',
          Amount: payment.amount,
          ReceiverParty: BUSINESS_SHORTCODE,
          RecieverIdentifierType: '4',
          ResultURL: `${process.env.VERCEL_URL || 'https://yourdomain.com'}/api/refund-callback`,
          QueueTimeOutURL: `${process.env.VERCEL_URL || 'https://yourdomain.com'}/api/refund-timeout`,
          Remarks: reason || 'AI processing failed',
        }),
      }
    )

    const refundData = await refundResponse.json()

    if (refundData.ResponseCode === '0') {
      // Mark payment as refunded
      payment.status = 'refunded'
      payment.refundReason = reason || 'AI processing failed'
      payment.refundInitiatedAt = new Date().toISOString()
      payment.updatedAt = new Date().toISOString()

      global.payments[transactionId] = payment

      console.log(`Refund initiated: ${transactionId}. Amount: KSh ${payment.amount}`)

      return res.status(200).json({
        success: true,
        message: 'Refund initiated. Funds will return to customer M-Pesa within 24 hours.',
        refundId: refundData.ConversationID,
        payment,
      })
    } else {
      return res.status(400).json({
        success: false,
        error: refundData.ResponseDescription || 'Refund failed',
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
