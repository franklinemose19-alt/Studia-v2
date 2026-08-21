import { checkRateLimit } from './_utils/rateLimiter.js'
import { chatCompletion } from './_utils/aiGateway.js'
import { getVerifiedUserId } from './_utils/verifyUser.js'
import { consumeAICredit, releaseAICredit } from './_utils/aiCredits.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const authId = await getVerifiedUserId(req)
    if (!authId) return res.status(401).json({ error: 'Please sign in again.', code: 'not_authenticated' })

    const { image } = req.body
    if (!image) return res.status(400).json({ error: 'No image provided' })

    const rateCheck = await checkRateLimit(authId, 'generate-notes')
    if (!rateCheck.allowed) {
      return res.status(429).json({ error: `Too many requests — wait ${Math.ceil(rateCheck.retryAfterSeconds / 60)} minute(s).`, retryAfterSeconds: rateCheck.retryAfterSeconds })
    }

    const credit = await consumeAICredit(authId)
    if (!credit.allowed) {
      return res.status(402).json({ error: 'Your 3 free AI lectures have been used. Upgrade to continue using SAGE AI Tutor.', code: 'ai_credit_exhausted' })
    }

    try {
      const result = await chatCompletion({
        messages: [{
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: image } },
            { type: 'text', text: `Extract and structure the content from this image into clean notes.\nReturn JSON only: {"title":"Short title","course":"Subject if identifiable or empty","content":"Full structured notes"}` },
          ],
        }],
        maxTokens: 1500, feature: 'snap_generate_notes', userId: authId,
      })
      const raw = result.content.replace(/```json|```/g, '').trim()
      const parsed = JSON.parse(raw)
      return res.status(200).json({ title: parsed.title || 'Untitled Notes', course: parsed.course || '', content: parsed.content || '' })
    } catch (err) {
      await releaseAICredit(authId, credit.source)
      return res.status(500).json({ error: err.message || 'Failed to generate notes' })
    }
  } catch (err) {
    console.error('Generate notes error:', err)
    return res.status(500).json({ error: err.message || 'Internal server error' })
  }
}
