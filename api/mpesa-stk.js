export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { phoneNumber, amount, planId, planName } = req.body
  const { userId } = req.body
    if (!phoneNumber || !amount) {
      return res.status(400).json({ error: 'Phone number and amount required' })
    }

    // ✅ Format phone number to 254XXXXXXXXX
    let formattedPhone = phoneNumber.toString().trim()
    if (formattedPhone.startsWith('+254')) {
      formattedPhone = formattedPhone.replace('+254', '254')
    } else if (formattedPhone.startsWith('07') || formattedPhone.startsWith('01')) {
      formattedPhone = '254' + formattedPhone.substring(1)
    } else if (formattedPhone.startsWith('7') || formattedPhone.startsWith('1')) {
      formattedPhone = '254' + formattedPhone
    }

    console.log('📱 Formatted phone:', formattedPhone)
    console.log('💰 Amount:', amount)

    const CONSUMER_KEY = process.env.MPESA_CONSUMER_KEY
    const CONSUMER_SECRET = process.env.MPESA_CONSUMER_SECRET
    const BUSINESS_SHORTCODE = process.env.MPESA_SHORTCODE
    const PASSKEY = process.env.MPESA_PASSKEY
    const CALLBACK_URL = process.env.MPESA_CALLBACK_URL
    const SUPABASE_URL = process.env.SUPABASE_URL
    const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

    // ✅ Check all required env vars
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
      return res.status(500).json({
        success: false,
        error: `Missing config: ${missingVars.join(', ')}`,
      })
    }

    // ✅ Get M-Pesa access token
    const auth = Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString('base64')
    const tokenResponse = await fetch(
      'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
      {
        method: 'GET',
        headers: { Authorization: `Basic ${auth}` },
      }
    )

    const tokenData = await tokenResponse.json()
    console.log('🔑 Token response:', JSON.stringify(tokenData))

    if (!tokenData.access_token) {
      return res.status(500).json({
        success: false,
        error: 'Failed to get M-Pesa access token. Check your Consumer Key/Secret.',
      })
    }

    // ✅ Generate timestamp and password
    const timestamp = new Date()
      .toISOString()
      .replace(/[^0-9]/g, '')
      .slice(0, 14)

    const password = Buffer.from(`${BUSINESS_SHORTCODE}${PASSKEY}${timestamp}`).toString('base64')

    console.log('⏰ Timestamp:', timestamp)
    console.log('🏢 Shortcode:', BUSINESS_SHORTCODE)
    console.log('📞 Callback URL:', CALLBACK_URL)

    // ✅ Initiate STK Push
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

    console.log('📤 STK Payload:', JSON.stringify(stkPayload))

    const stkResponse = await fetch(
      'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenData.access_token}`,
        },
        body: JSON.stringify(stkPayload),
      }
    )

    const stkData = await stkResponse.json()
    console.log('📥 STK Response:', JSON.stringify(stkData))

    if (stkData.ResponseCode === '0') {

      // ✅ INSERT payment record into Supabase
      const supabaseRes = await fetch(`${SUPABASE_URL}/rest/v1/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'apikey': SUPABASE_SERVICE_KEY,
          'Prefer': 'return=minimal',
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
        const supabaseError = await supabaseRes.text()
        console.error('❌ Supabase insert failed:', supabaseError)
      } else {
        console.log('✅ Payment record saved to Supabase')
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
      console.error('❌ STK Push failed:', stkData)
      return res.status(400).json({
        success: false,
        error: stkData.errorMessage || stkData.ResponseDescription || 'STK Push failed',
        details: stkData,
      })
    }

  } catch (error) {
    console.error('💥 M-Pesa STK Error:', error)
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    })
  }
}
