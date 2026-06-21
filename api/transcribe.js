export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  try {
    const { audio, mimeType } = req.body
    if (!audio) {
      return res.status(400).json({ error: 'No audio provided' })
    }
    const buffer = Buffer.from(audio, 'base64')
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return res.status(500).json({ error: 'API key not configured' })
    }

    const type = mimeType || 'audio/webm'
    const ext = type.includes('mp4') ? 'mp4' : type.includes('ogg') ? 'ogg' : 'webm'

    const formData = new FormData()
    formData.append('file', new Blob([buffer], { type }), `audio.${ext}`)
    formData.append('model', 'whisper-1')
    formData.append('language', 'en')

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: formData,
    })

    const responseText = await response.text()
    if (!response.ok) {
      console.error('OpenAI Error:', responseText)
      return res.status(response.status).json({ error: `OpenAI error: ${responseText}` })
    }

    const data = JSON.parse(responseText)
    return res.status(200).json({ text: data.text || '' })
  } catch (error) {
    console.error('Transcription error:', error)
    return res.status(500).json({ error: `Server error: ${error.message}` })
  }
}
