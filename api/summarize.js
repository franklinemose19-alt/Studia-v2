import { checkRateLimit } from './_utils/rateLimiter.js'
import { chatCompletion } from './_utils/aiGateway.js'
import { getVerifiedUserId } from './_utils/verifyUser.js'
import { consumeAICredit, releaseAICredit } from './_utils/aiCredits.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const authId = await getVerifiedUserId(req)
    if (!authId) return res.status(401).json({ error: 'Please sign in again.', code: 'not_authenticated' })

    const { text, image } = req.body
    if (!text?.trim() && !image) return res.status(400).json({ error: 'No content provided' })

    const rateCheck = await checkRateLimit(authId, 'summarize')
    if (!rateCheck.allowed) {
      return res.status(429).json({ error: `Too many requests — wait ${Math.ceil(rateCheck.retryAfterSeconds / 60)} minute(s).`, retryAfterSeconds: rateCheck.retryAfterSeconds })
    }

    const credit = await consumeAICredit(authId)
    if (!credit.allowed) {
      return res.status(402).json({ error: 'Your 3 free AI lectures have been used. Upgrade to continue using SAGE AI Tutor.', code: 'ai_credit_exhausted' })
    }

    const messages = image
      ? [{ role: 'user', content: [{ type: 'text', text: 'Summarize the lecture notes in this image into clear bullet points. Keep it under 300 words.' }, { type: 'image_url', image_url: { url: image } }] }]
      : [{ role: 'system', content: 'You are a study assistant for Kenyan university students. Summarize the lecture notes into clear, concise key points under 300 words. Use bullet points.' }, { role: 'user', content: `Summarize these notes:\n\n${text}` }]

    try {
      const result = await chatCompletion({ messages, maxTokens: 500, feature: 'summarize', userId: authId })
      return res.status(200).json({ summary: result.content })
    } catch (err) {
      await releaseAICredit(authId, credit.source)
      return res.status(500).json({ error: err.message || 'Summarization failed' })
    }
  } catch (error) {
    console.error('Summarize error:', error)
    return res.status(500).json({ error: error.message || 'Internal server error' })
  }
}
