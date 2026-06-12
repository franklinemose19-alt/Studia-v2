const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export default async function handler(req, res) {
  if (req.method === 'GET') {
    // Get payment status
    const { transactionId } = req.query

    try {
      const response = await fetch(
        `${supabaseUrl}/rest/v1/payments?transaction_id=eq.${transactionId}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${supabaseServiceKey}`,
          },
        }
      )

      const payments = await response.json()

      if (!payments || payments.length === 0) {
        return res.status(404).json({ error: 'Payment not found' })
      }

      return res.status(200).json(payments[0])
    } catch (err) {
      console.error('Get Payment Error:', err)
      return res.status(500).json({ error: 'Failed to retrieve payment' })
    }
  }

  if (req.method === 'GET') {
    // List all payments (admin)
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/payments?order=created_at.desc&limit=100`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${supabaseServiceKey}`,
        },
      })

      const payments = await response.json()
      return res.status(200).json(payments)
    } catch (err) {
      console.error('List Payments Error:', err)
      return res.status(500).json({ error: 'Failed to retrieve payments' })
    }
  }

  if (req.method === 'POST') {
    // Create new payment record
    const { transactionId, phoneNumber, amount, planId, planName } = req.body

    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${supabaseServiceKey}`,
          'Prefer': 'return=representation',
        },
        body: JSON.stringify({
          transaction_id: transactionId,
          phone_number: phoneNumber,
          amount,
          plan_id: planId,
          plan_name: planName,
          status: 'pending',
        }),
      })

      const data = await response.json()

      if (response.ok) {
        return res.status(201).json({
          success: true,
          payment: data[0] || data,
        })
      } else {
        return res.status(500).json({ error: 'Failed to create payment' })
      }
    } catch (err) {
      console.error('Create Payment Error:', err)
      return res.status(500).json({ error: 'Failed to create payment' })
    }
  }

  if (req.method === 'PUT') {
    // Update payment status
    const { transactionId, status, mpesaConfirmation } = req.body

    try {
      const updateBody = {
        status,
        updated_at: new Date().toISOString(),
      }

      if (mpesaConfirmation) {
        updateBody.mpesa_confirmation = mpesaConfirmation
      }

      const response = await fetch(
        `${supabaseUrl}/rest/v1/payments?transaction_id=eq.${transactionId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${supabaseServiceKey}`,
            'Prefer': 'return=representation',
          },
          body: JSON.stringify(updateBody),
        }
      )

      const data = await response.json()

      if (response.ok) {
        return res.status(200).json({
          success: true,
          payment: data[0] || data,
        })
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
