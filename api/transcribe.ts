export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { audio } = req.body

    if (!audio) {
      return res.status(400).json({ error: 'No audio provided' })
    }

    const buffer = Buffer.from(audio, 'base64')

    const formData = new FormData()
    const blob = new Blob([buffer], { type: 'audio/webm' })
    formData.append('file', blob, 'audio.webm')
    formData.append('model', 'whisper-1')

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: formData,
    })

    const data = (await response.json()) as any

    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || 'Transcription failed' })
    }

    return res.status(200).json({ text: data.text })
  } catch (error: any) {
    console.error('Transcription error:', error)
    return res.status(500).json({ error: error.message || 'Internal server error' })
  }
}
