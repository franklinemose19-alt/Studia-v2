export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { transactionId, processingType } = req.body

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
        error: `Cannot complete payment with status: ${payment.status}`,
      })
    }

    // Mark as completed - funds released from escrow
    payment.status = 'completed'
    payment.processingStarted = payment.processingStarted || new Date().toISOString()
    payment.completedAt = new Date().toISOString()
    payment.processingType = processingType || 'lecture'
    payment.updatedAt = new Date().toISOString()

    global.payments[transactionId] = payment

    console.log(`Payment completed: ${transactionId}. Funds released from escrow.`)

    return res.status(200).json({
      success: true,
      message: 'Payment completed. Funds released.',
      payment,
    })
  } catch (error) {
    console.error('Complete Payment Error:', error)
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    })
  }
}
