export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const body = req.body

    // Safaricom sends callback with this structure:
    // {
    //   "Body": {
    //     "stkCallback": {
    //       "MerchantRequestID": "...",
    //       "CheckoutRequestID": "...",
    //       "ResultCode": 0,  // 0 = success, other = failed
    //       "ResultDesc": "The service request has been processed successfully.",
    //       "CallbackMetadata": { ... }
    //     }
    //   }
    // }

    const stkCallback = body.Body?.stkCallback

    if (!stkCallback) {
      return res.status(400).json({ error: 'Invalid callback format' })
    }

    const { CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } = stkCallback

    // Initialize global payments store if needed
    if (!global.payments) {
      global.payments = {}
    }

    const payment = global.payments[CheckoutRequestID]

    if (!payment) {
      console.log(`Payment not found for transaction: ${CheckoutRequestID}`)
      return res.status(200).json({ success: true }) // Return 200 to acknowledge
    }

    if (ResultCode === 0) {
      // Payment successful
      payment.status = 'processing' // Now in escrow, waiting for AI processing
      payment.mpesaConfirmation = {
        resultCode: ResultCode,
        resultDesc: ResultDesc,
        amount: CallbackMetadata?.Item?.[0]?.Value,
        transactionDate: CallbackMetadata?.Item?.[1]?.Value,
        transactionId: CallbackMetadata?.Item?.[2]?.Value,
      }
      payment.updatedAt = new Date().toISOString()

      // Store updated payment
      global.payments[CheckoutRequestID] = payment

      console.log(`Payment confirmed: ${CheckoutRequestID}. Status: processing`)

      return res.status(200).json({
        success: true,
        message: 'Payment received. Funds held in escrow. Processing...',
      })
    } else {
      // Payment failed
      payment.status = 'failed'
      payment.updatedAt = new Date().toISOString()
      global.payments[CheckoutRequestID] = payment

      console.log(`Payment failed: ${CheckoutRequestID}. Code: ${ResultCode}`)

      return res.status(200).json({
        success: false,
        message: 'Payment failed',
      })
    }
  } catch (error) {
    console.error('M-Pesa Callback Error:', error)
    return res.status(200).json({ success: true }) // Return 200 to acknowledge to Safaricom
  }
}
