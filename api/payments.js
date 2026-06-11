export default async function handler(req, res) {
  if (req.method === 'GET') {
    // Get payment status
    const { transactionId } = req.query

    try {
      const payments = JSON.parse(process.env.PAYMENTS || '{}')
      const payment = payments[transactionId]

      if (!payment) {
        return res.status(404).json({ error: 'Payment not found' })
      }

      return res.status(200).json(payment)
    } catch (err) {
      return res.status(500).json({ error: 'Failed to retrieve payment' })
    }
  }

  if (req.method === 'POST') {
    // Create new payment record
    const { transactionId, phoneNumber, amount, planId, planName } = req.body

    try {
      const payments = JSON.parse(process.env.PAYMENTS || '{}')

      const payment = {
        transactionId,
        phoneNumber,
        amount,
        planId,
        planName,
        status: 'pending', // pending → processing → completed/refunded
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        mpesaConfirmation: null,
        processingStarted: null,
        completedAt: null,
      }

      payments[transactionId] = payment
      process.env.PAYMENTS = JSON.stringify(payments)

      return res.status(201).json({
        success: true,
        payment,
      })
    } catch (err) {
      return res.status(500).json({ error: 'Failed to create payment' })
    }
  }

  if (req.method === 'PUT') {
    // Update payment status
    const { transactionId, status, mpesaConfirmation } = req.body

    try {
      const payments = JSON.parse(process.env.PAYMENTS || '{}')
      const payment = payments[transactionId]

      if (!payment) {
        return res.status(404).json({ error: 'Payment not found' })
      }

      payment.status = status
      payment.updatedAt = new Date().toISOString()

      if (mpesaConfirmation) {
        payment.mpesaConfirmation = mpesaConfirmation
      }

      if (status === 'completed') {
        payment.completedAt = new Date().toISOString()
      }

      payments[transactionId] = payment
      process.env.PAYMENTS = JSON.stringify(payments)

      return res.status(200).json({
        success: true,
        payment,
      })
    } catch (err) {
      return res.status(500).json({ error: 'Failed to update payment' })
    }
  }

  res.status(405).json({ error: 'Method not allowed' })
}
