const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

async function getVerifiedUserId(req) {
  const authHeader = req.headers.authorization || req.headers.Authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null
  const token = authHeader.slice(7).trim()
  if (!token) return null
  try {
    const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: supabaseServiceKey },
    })
    if (!res.ok) return null
    const data = await res.json()
    return data?.id || null
  } catch { return null }
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { transactionId, userId: queryUserId } = req.query

    if (transactionId) {
      // Now requires proof the caller owns this transaction before
      // handing back a phone number and amount.
      const authId = await getVerifiedUserId(req)
      if (!authId) return res.status(401).json({ error: 'Please sign in again.' })
      try {
        const response = await fetch(
          `${supabaseUrl}/rest/v1/payments?transaction_id=eq.${transactionId}`,
          { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${supabaseServiceKey}`, apikey: supabaseServiceKey } }
        )
        const payments = await response.json()
        const payment = payments?.[0]
        if (!payment) return res.status(404).json({ error: 'Payment not found' })
        if (payment.created_by !== authId) return res.status(403).json({ error: 'Forbidden' })
        return res.status(200).json(payment)
      } catch (err) {
        console.error('Get Payment Error:', err)
        return res.status(500).json({ error: 'Failed to retrieve payment' })
      }
    }

    if (queryUserId) {
      // FIXED: previously trusted whatever userId was in the query string,
      // with zero verification — the actual security hole. The verified
      // caller's own identity is now the only thing ever used, regardless
      // of what the query string says.
      const authId = await getVerifiedUserId(req)
      if (!authId) return res.status(401).json({ error: 'Please sign in again.' })
      try {
        const response = await fetch(
          `${supabaseUrl}/rest/v1/payments?created_by=eq.${authId}&order=created_at.desc&limit=100`,
          { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${supabaseServiceKey}`, apikey: supabaseServiceKey } }
        )
        const payments = await response.json()
        return res.status(200).json(payments)
      } catch (err) {
        console.error('List Payments Error:', err)
        return res.status(500).json({ error: 'Failed to retrieve payments' })
      }
    }

    return res.status(400).json({ error: 'transactionId or userId is required' })
  }

  if (req.method === 'POST') {
    const { transactionId, phoneNumber, amount, planId, planName, userId } = req.body
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${supabaseServiceKey}`,
          apikey: supabaseServiceKey,
          Prefer: 'return=representation',
        },
        body: JSON.stringify({
          transaction_id: transactionId,
          phone_number: phoneNumber,
          amount,
          plan_id: planId,
          plan_name: planName,
          created_by: userId || null,
          status: 'pending',
        }),
      })
      const data = await response.json()
      if (response.ok) {
        return res.status(201).json({ success: true, payment: data[0] || data })
      } else {
        return res.status(500).json({ error: 'Failed to create payment' })
      }
    } catch (err) {
      console.error('Create Payment Error:', err)
      return res.status(500).json({ error: 'Failed to create payment' })
    }
  }

  if (req.method === 'PUT') {
    const { transactionId, status, mpesaConfirmation } = req.body
    try {
      const updateBody = { status, updated_at: new Date().toISOString() }
      if (mpesaConfirmation) updateBody.mpesa_confirmation = mpesaConfirmation

      const response = await fetch(
        `${supabaseUrl}/rest/v1/payments?transaction_id=eq.${transactionId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${supabaseServiceKey}`,
            apikey: supabaseServiceKey,
            Prefer: 'return=representation',
          },
          body: JSON.stringify(updateBody),
        }
      )
      const data = await response.json()
      if (response.ok) {
        return res.status(200).json({ success: true, payment: data[0] || data })
      } else {
        return res.status(500).json({ error: 'Failed to update payment' })
      }
    } catch (err) {
      console.error('Update Payment Error:', err)
      return res.status(500).json({ error: 'Failed to update payment' })
    }
  }

  res.status(405).json({ error: 'Method not allowed' })
}
