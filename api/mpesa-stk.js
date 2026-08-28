const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

// Set MPESA_ENV=production in Vercel once you're fully ready — this one
// variable switches every Daraja URL from sandbox to production. Nothing
// else in this file should ever need to change between environments again.
const MPESA_BASE_URL = process.env.MPESA_ENV === 'production'
  ? 'https://api.safaricom.co.ke'
  : 'https://sandbox.safaricom.co.ke'

async function supaFetch(path, options = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, apikey: SUPABASE_SERVICE_KEY, ...(options.headers || {}) },
  })
}

async function getAccessToken() {
  const consumerKey = process.env.MPESA_CONSUMER_KEY
  const consumerSecret = process.env.MPESA_CONSUMER_SECRET
  const credentials = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64')
  const res = await fetch(`${MPESA_BASE_URL}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${credentials}` },
  })
  const data = await res.json()
  if (!res.ok || !data.access_token) throw new Error('Failed to authenticate with M-Pesa')
  return data.access_token
}

function getTimestamp() {
  const now = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
}

function getPassword(shortcode, passkey, timestamp) {
  return Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64')
}

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { phoneNumber, amount, planId, planName, userId } = req.body
    if (!phoneNumber || !amount || !planId) return res.status(400).json({ success: false, error: 'Missing required fields' })

    try {
      const accessToken = await getAccessToken()
      const shortcode = process.env.MPESA_SHORTCODE
      const passkey = process.env.MPESA_PASSKEY
      const timestamp = getTimestamp()
      const password = getPassword(shortcode, passkey, timestamp)

      const stkRes = await fetch(`${MPESA_BASE_URL}/mpesa/stkpush/v1/processrequest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          BusinessShortCode: shortcode,
          Password: password,
          Timestamp: timestamp,
          // Buy Goods / Till — not Paybill. This is the actual fix: Safaricom
          // told you it's a Till number, and CustomerPayBillOnline is
          // specifically for Paybill shortcodes.
          TransactionType: 'CustomerBuyGoodsOnline',
          Amount: Math.round(amount),
          PartyA: phoneNumber,
          PartyB: shortcode,
          PhoneNumber: phoneNumber,
          CallBackURL: process.env.MPESA_CALLBACK_URL,
          // Still a required field for Buy Goods, even though it doesn't
          // route to a sub-account the way it does on Paybill.
          AccountReference: 'STUDIA AI',
          TransactionDesc: planName || 'STUDIA AI Payment',
        }),
      })
      const stkData = await stkRes.json()

      if (!stkData.CheckoutRequestID) {
        console.error('STK push failed:', stkData)
        return res.status(200).json({ success: false, error: stkData.errorMessage || stkData.ResponseDescription || 'Could not initiate payment. Please try again.' })
      }

      await supaFetch('payments', {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({
          transaction_id: stkData.CheckoutRequestID,
          phone_number: phoneNumber,
          amount: Math.round(amount),
          plan_id: planId,
          plan_name: planName || planId,
          created_by: userId || null,
          status: 'pending',
        }),
      })

      return res.status(200).json({ success: true, transactionId: stkData.CheckoutRequestID })
    } catch (err) {
      console.error('STK push error:', err)
      return res.status(200).json({ success: false, error: 'Connection error. Please try again.' })
    }
  }

  if (req.method === 'GET') {
    const { transactionId } = req.query
    if (!transactionId) return res.status(400).json({ error: 'transactionId required' })

    try {
      const paymentRes = await supaFetch(`payments?transaction_id=eq.${transactionId}&select=status`)
      const payments = await paymentRes.json()
      const payment = Array.isArray(payments) ? payments[0] : null
      if (!payment) return res.status(200).json({ status: 'pending' })
      return res.status(200).json({ status: payment.status })
    } catch (err) {
      console.error('Payment status check error:', err)
      return res.status(200).json({ status: 'pending' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
