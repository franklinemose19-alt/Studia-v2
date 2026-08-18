import { checkRateLimit } from './_utils/rateLimiter.js'
import { chatCompletion } from './_utils/aiGateway.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const { text, image, userId } = req.body
    if (!text?.trim() && !image) return res.status(400).json({ error: 'No content provided' })

    const rateCheck = await checkRateLimit(userId, 'summarize')
    if (!rateCheck.allowed) {
      return res.status(429).json({
        error: rateCheck.reason === 'missing_user_id' ? 'Authentication required' : `Too many requests — wait ${Math.ceil(rateCheck.retryAfterSeconds / 60)} minute(s).`,
        retryAfterSeconds: rateCheck.retryAfterSeconds,
      })
    }

    const messages = image
      ? [{ role: 'user', content: [{ type: 'text', text: 'Summarize the lecture notes in this image into clear bullet points. Keep it under 300 words.' }, { type: 'image_url', image_url: { url: image } }] }]
      : [{ role: 'system', content: 'You are a study assistant for Kenyan university students. Summarize the lecture notes into clear, concise key points under 300 words. Use bullet points.' }, { role: 'user', content: `Summarize these notes:\n\n${text}` }]

    try {
      const result = await chatCompletion({ messages, maxTokens: 500, feature: 'summarize', userId })
      return res.status(200).json({ summary: result.content })
    } catch (err) { return res.status(500).json({ error: err.message || 'Summarization failed' }) }
  } catch (error) {
    console.error('Summarize error:', error)
    return res.status(500).json({ error: error.message || 'Internal server error' })
  }
}
