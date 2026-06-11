export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { phoneNumber, amount, planId, planName } = req.body

    if (!phoneNumber || !amount) {
      return res.status(400).json({ error: 'Phone number and amount required' })
    }

    const CONSUMER_KEY = process.env.MPESA_CONSUMER_KEY
    const CONSUMER_SECRET = process.env.MPESA_CONSUMER_SECRET
    const BUSINESS_SHORTCODE = process.env.MPESA_SHORTCODE
    const PASSKEY = process.env.MPESA_PASSKEY
    const CALLBACK_URL = process.env.MPESA_CALLBACK_URL

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

    // Generate timestamp and password
    const timestamp = new Date().toISOString().replace(/[:-]/g, '').split('.')[0]
    const password = Buffer.from(`${BUSINESS_SHORTCODE}${PASSKEY}${timestamp}`).toString('base64')

    // Initiate STK Push
    const stkResponse = await fetch(
      'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenData.access_token}`,
        },
        body: JSON.stringify({
          BusinessShortCode: BUSINESS_SHORTCODE,
          Password: password,
          Timestamp: timestamp,
          TransactionType: 'CustomerPayBillOnline',
          Amount: Math.ceil(amount),
          PartyA: phoneNumber,
          PartyB: BUSINESS_SHORTCODE,
          PhoneNumber: phoneNumber,
          CallBackURL: CALLBACK_URL,
          AccountReference: `STUDIA-${planId}`,
          TransactionDesc: `STUDIA ${planName}`,
        }),
      }
    )

    const stkData = await stkResponse.json()

    if (stkData.ResponseCode === '0') {
      // Create payment record in "pending" status
      const paymentRecord = {
        transactionId: stkData.CheckoutRequestID,
        phoneNumber,
        amount: Math.ceil(amount),
        planId,
        planName,
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        mpesaConfirmation: null,
        processingStarted: null,
        completedAt: null,
      }

      // Store in a simple in-memory store (later migrate to Supabase)
      if (!global.payments) {
        global.payments = {}
      }
      global.payments[stkData.CheckoutRequestID] = paymentRecord

      return res.status(200).json({
        success: true,
        message: 'STK Push sent. Payment held in escrow.',
        transactionId: stkData.CheckoutRequestID,
        status: 'pending',
        phoneNumber,
        amount,
        plan: planName,
      })
    } else {
      return res.status(400).json({
        success: false,
        error: stkData.ResponseDescription || 'STK Push failed',
      })
    }
  } catch (error) {
    console.error('M-Pesa STK Error:', error)
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    })
  }
}
