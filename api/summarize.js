export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  try {
    const { text, image } = req.body

    if ((!text || text.trim().length === 0) && !image) {
      return res.status(400).json({ error: 'No text or image provided' })
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return res.status(500).json({ error: 'API key not configured' })
    }

    let messages

    if (image) {
      messages = [
        {
          role: 'system',
          content: 'You are a helpful study assistant. Read the handwritten or printed lecture notes in the image and summarize them into clear, concise key points. Keep it under 300 words. Use bullet points for clarity.',
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Please summarize the lecture notes shown in this image.' },
            { type: 'image_url', image_url: { url: image } },
          ],
        },
      ]
    } else {
      messages = [
        {
          role: 'system',
          content: 'You are a helpful study assistant. Summarize the lecture notes provided by the user into clear, concise key points. Keep it under 300 words. Use bullet points for clarity.',
        },
        {
          role: 'user',
          content: `Please summarize these lecture notes:\n\n${text}`,
        },
      ]
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: image ? 'gpt-4o' : 'gpt-3.5-turbo',
        messages,
        temperature: 0.7,
        max_tokens: 500,
      }),
    })

    const data = await response.json()
    if (!response.ok) {
      console.error('OpenAI Error:', data)
      return res.status(response.status).json({ error: data.error?.message || 'Summarization failed' })
    }

    const summary = data.choices?.[0]?.message?.content || 'No summary generated'
    return res.status(200).json({ summary })
  } catch (error) {
    console.error('Summarization error:', error)
    return res.status(500).json({ error: error.message || 'Internal server error' })
  }
}
