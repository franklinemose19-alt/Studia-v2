const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

export default async function handler(req, res) {
  // ── GET: check payment status ──────────────────────────────────────────
  if (req.method === 'GET') {
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

  // ── POST: initiate STK push ─────────────────────────────────────────────
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { phoneNumber, amount, planId, planName, userId } = req.body

    if (!phoneNumber || !amount) {
      return res.status(400).json({ error: 'Phone number and amount required' })
    }

    let formattedPhone = phoneNumber.toString().trim()
    if (formattedPhone.startsWith('+254')) {
      formattedPhone = formattedPhone.replace('+254', '254')
    } else if (formattedPhone.startsWith('07') || formattedPhone.startsWith('01')) {
      formattedPhone = '254' + formattedPhone.substring(1)
    } else if (formattedPhone.startsWith('7') || formattedPhone.startsWith('1')) {
      formattedPhone = '254' + formattedPhone
    }

    const CONSUMER_KEY = process.env.MPESA_CONSUMER_KEY
    const CONSUMER_SECRET = process.env.MPESA_CONSUMER_SECRET
    const BUSINESS_SHORTCODE = process.env.MPESA_SHORTCODE
    const PASSKEY = process.env.MPESA_PASSKEY
    const CALLBACK_URL = process.env.MPESA_CALLBACK_URL

    const missingVars = []
    if (!CONSUMER_KEY) missingVars.push('MPESA_CONSUMER_KEY')
    if (!CONSUMER_SECRET) missingVars.push('MPESA_CONSUMER_SECRET')
    if (!BUSINESS_SHORTCODE) missingVars.push('MPESA_SHORTCODE')
    if (!PASSKEY) missingVars.push('MPESA_PASSKEY')
    if (!CALLBACK_URL) missingVars.push('MPESA_CALLBACK_URL')
    if (!SUPABASE_URL) missingVars.push('SUPABASE_URL')
    if (!SUPABASE_SERVICE_KEY) missingVars.push('SUPABASE_SERVICE_ROLE_KEY')

    if (missingVars.length > 0) {
      console.error('❌ Missing env vars:', missingVars)
      return res.status(500).json({ success: false, error: `Missing config: ${missingVars.join(', ')}` })
    }

    const auth = Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString('base64')
    const tokenResponse = await fetch(
      'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
      { method: 'GET', headers: { Authorization: `Basic ${auth}` } }
    )
    const tokenData = await tokenResponse.json()

    if (!tokenData.access_token) {
      return res.status(500).json({ success: false, error: 'Failed to get M-Pesa access token.' })
    }

    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14)
    const password = Buffer.from(`${BUSINESS_SHORTCODE}${PASSKEY}${timestamp}`).toString('base64')

    const stkPayload = {
      BusinessShortCode: BUSINESS_SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: Math.ceil(amount),
      PartyA: formattedPhone,
      PartyB: BUSINESS_SHORTCODE,
      PhoneNumber: formattedPhone,
      CallBackURL: CALLBACK_URL,
      AccountReference: `STUDIA-${planId}`,
      TransactionDesc: `STUDIA ${planName}`,
    }

    const stkResponse = await fetch(
      'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenData.access_token}` },
        body: JSON.stringify(stkPayload),
      }
    )
    const stkData = await stkResponse.json()

    if (stkData.ResponseCode === '0') {
      const supabaseRes = await fetch(`${SUPABASE_URL}/rest/v1/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
          apikey: SUPABASE_SERVICE_KEY,
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({
          transaction_id: stkData.CheckoutRequestID,
          phone_number: formattedPhone,
          amount: Math.ceil(amount),
          plan_id: planId,
          plan_name: planName,
          status: 'pending',
          created_by: userId || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }),
      })

      if (!supabaseRes.ok) {
        console.error('❌ Supabase insert failed:', await supabaseRes.text())
      }

      return res.status(200).json({
        success: true,
        message: 'STK Push sent. Check your phone to complete payment.',
        transactionId: stkData.CheckoutRequestID,
        status: 'pending',
        phoneNumber: formattedPhone,
        amount,
        plan: planName,
      })
    } else {
      return res.status(400).json({
        success: false,
        error: stkData.errorMessage || stkData.ResponseDescription || 'STK Push failed',
        details: stkData,
      })
    }
  } catch (error) {
    console.error('💥 M-Pesa STK Error:', error)
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' })
  }
}
