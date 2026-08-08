import { logWhisperUsage } from './_utils/tokenLogger.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { userId } = req.body
    let audioInput = req.body.audio || req.body.audioBase64 || req.body.file

    if (!audioInput) {
      return res.status(400).json({ error: 'No audio provided' })
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) return res.status(500).json({ error: 'API key not configured' })

    // Strip data URL prefix if present, e.g. "data:audio/webm;base64,XXXX"
    let mimeType = 'audio/webm'
    if (audioInput.startsWith('data:')) {
      const match = audioInput.match(/^data:(.+);base64,(.+)$/)
      if (match) {
        mimeType = match[1]
        audioInput = match[2]
      }
    }

    const audioBuffer = Buffer.from(audioInput, 'base64')
    const audioBlob = new Blob([audioBuffer], { type: mimeType })

    const formData = new FormData()
    formData.append('file', audioBlob, 'lecture.webm')
    formData.append('model', 'whisper-1')
    formData.append('response_format', 'verbose_json')

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: formData,
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('Whisper error:', data)
      return res.status(response.status).json({ error: data.error?.message || 'Transcription failed' })
    }

    // verbose_json includes `duration` in seconds — real audio length, not an estimate
    const transcript = data.text || ''
    const durationSeconds = data.duration || 0

    logWhisperUsage(userId, durationSeconds)

    return res.status(200).json({ transcript, duration: durationSeconds })
  } catch (error) {
    console.error('Transcription error:', error)
    return res.status(500).json({ error: error.message || 'Internal server error' })
  }
}
