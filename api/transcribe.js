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

    // Pre-flight reservation: uses the client's own recorded duration, if
    // sent, purely as a cost-saving pre-check — reject before spending
    // money on a lecture the student clearly can't afford. This is NOT
    // the security boundary; the real, authoritative charge happens below,
    // once we know the actual duration.
    const clientDurationSeconds = typeof req.body.clientDurationSeconds === 'number' && req.body.clientDurationSeconds > 0
      ? req.body.clientDurationSeconds
      : null
    const estimatedMinutes = clientDurationSeconds ? clientDurationSeconds / 60 : 1

    const reservation = await consumeAICredit(authId, estimatedMinutes)
    if (!reservation.allowed) {
      return res.status(402).json({
        error: 'Your AI minutes have been used up. Upgrade to continue using STUDIA AI.',
        code: 'ai_minutes_exhausted',
      })
    }

    let mimeType = 'audio/webm'
    if (audioInput.startsWith('data:')) {
      const match = audioInput.match(/^data:(.+);base64,(.+)$/)
      if (match) { mimeType = match[1]; audioInput = match[2] }
    }
    const audioBuffer = Buffer.from(audioInput, 'base64')

    let result
    try {
      result = await transcribe({ audioBuffer, mimeType, feature: 'transcription', userId: authId })
    } catch (err) {
      // Genuine transcription failure — refund the full reservation, the
      // student was never actually charged for a lecture they didn't get.
      await releaseAICredit(authId, reservation.source, reservation.minutes_consumed)
      return res.status(500).json({ error: err.message || 'Transcription failed' })
    }

    // True-up against the REAL duration, once we have it — this is the
    // authoritative charge. The pre-flight reservation above was only ever
    // an estimate. If OpenAI's response didn't include a duration (see the
    // honest uncertainty flagged in aiGateway.js), fall back to the
    // client-reported value rather than leave billing undefined.
    const durationSource = typeof result.duration === 'number' ? 'openai' : (clientDurationSeconds ? 'client_estimate' : 'unknown')
    const realDurationSeconds = typeof result.duration === 'number'
      ? result.duration
      : (clientDurationSeconds || estimatedMinutes * 60)
    const realMinutes = realDurationSeconds / 60

    let finalMinutesCharged = reservation.minutes_consumed
    let creditWarning = null

    if (reservation.source !== 'explorer_free') {
      const diff = realMinutes - reservation.minutes_consumed
      if (diff < -0.01) {
        // Reserved more than actually used — refund the excess.
        await releaseAICredit(authId, reservation.source, Math.abs(diff))
        finalMinutesCharged = realMinutes
      } else if (diff > 0.01) {
        // Actually used more than reserved — charge the honest difference.
        const trueUp = await consumeAICredit(authId, diff)
        finalMinutesCharged = reservation.minutes_consumed + (trueUp.allowed ? diff : (trueUp.minutes_consumed || 0))
        if (!trueUp.allowed) {
          creditWarning = "This lecture ran longer than your remaining balance covered — you're now at your limit."
        }
      }
    }

    return res.status(200).json({
      transcript: result.transcript,
      duration: result.duration,
      segments: result.segments,
      minutesCharged: Math.round(finalMinutesCharged * 100) / 100,
      creditSource: reservation.source,
      creditWarning,
      durationSource,
    })
  } catch (error) {
    console.error('Transcription error:', error)
    return res.status(500).json({ error: error.message || 'Internal server error' })
  }
}
