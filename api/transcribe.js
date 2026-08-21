import { checkRateLimit } from './_utils/rateLimiter.js'
import { transcribe } from './_utils/aiGateway.js'
import { getVerifiedUserId } from './_utils/verifyUser.js'
import { consumeAICredit, releaseAICredit } from './_utils/aiCredits.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const authId = await getVerifiedUserId(req)
    if (!authId) return res.status(401).json({ error: 'Please sign in again.', code: 'not_authenticated' })

    let audioInput = req.body.audio || req.body.audioBase64 || req.body.file
    if (!audioInput) return res.status(400).json({ error: 'No audio provided' })

    const rateCheck = await checkRateLimit(authId, 'transcribe')
    if (!rateCheck.allowed) {
      return res.status(429).json({ error: `Too many requests — wait ${Math.ceil(rateCheck.retryAfterSeconds / 60)} minute(s).`, retryAfterSeconds: rateCheck.retryAfterSeconds })
    }

    // One recorded lecture = one credit, charged here at the gateway step.
    // generate-lecture-notes.js runs freely afterward — it's downstream of
    // the same lecture, not a separate billable action.
    const credit = await consumeAICredit(authId)
    if (!credit.allowed) {
      return res.status(402).json({
        error: 'Your 3 free AI lectures have been used. Upgrade to continue using SAGE AI Tutor.',
        code: 'ai_credit_exhausted',
      })
    }

    let mimeType = 'audio/webm'
    if (audioInput.startsWith('data:')) {
      const match = audioInput.match(/^data:(.+);base64,(.+)$/)
      if (match) { mimeType = match[1]; audioInput = match[2] }
    }
    const audioBuffer = Buffer.from(audioInput, 'base64')

    try {
      const result = await transcribe({ audioBuffer, mimeType, feature: 'transcription', userId: authId })
      return res.status(200).json({ transcript: result.transcript, duration: result.duration, segments: result.segments, creditSource: credit.source })
    } catch (err) {
      // Genuine AI failure — refund the credit, don't charge for it.
      await releaseAICredit(authId, credit.source)
      return res.status(500).json({ error: err.message || 'Transcription failed' })
    }
  } catch (error) {
    console.error('Transcription error:', error)
    return res.status(500).json({ error: error.message || 'Internal server error' })
  }
}
