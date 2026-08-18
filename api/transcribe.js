import { checkRateLimit } from './_utils/rateLimiter.js'
import { transcribe } from './_utils/aiGateway.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const { userId } = req.body
    let audioInput = req.body.audio || req.body.audioBase64 || req.body.file
    if (!audioInput) return res.status(400).json({ error: 'No audio provided' })

    const rateCheck = await checkRateLimit(userId, 'transcribe')
    if (!rateCheck.allowed) {
      return res.status(429).json({
        error: rateCheck.reason === 'missing_user_id' ? 'Authentication required' : `Too many requests — wait ${Math.ceil(rateCheck.retryAfterSeconds / 60)} minute(s).`,
        retryAfterSeconds: rateCheck.retryAfterSeconds,
      })
    }

    let mimeType = 'audio/webm'
    if (audioInput.startsWith('data:')) {
      const match = audioInput.match(/^data:(.+);base64,(.+)$/)
      if (match) { mimeType = match[1]; audioInput = match[2] }
    }
    const audioBuffer = Buffer.from(audioInput, 'base64')

    try {
      const result = await transcribe({ audioBuffer, mimeType, feature: 'transcription', userId })
      return res.status(200).json({ transcript: result.transcript, duration: result.duration, segments: result.segments })
    } catch (err) { return res.status(500).json({ error: err.message || 'Transcription failed' }) }
  } catch (error) {
    console.error('Transcription error:', error)
    return res.status(500).json({ error: error.message || 'Internal server error' })
  }
}
