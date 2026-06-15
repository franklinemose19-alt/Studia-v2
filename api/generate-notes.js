export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { image } = req.body
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY

    if (!OPENAI_API_KEY) {
      return res.status(500).json({ error: 'OpenAI API key not configured' })
    }

    if (!image) {
      return res.status(400).json({ error: 'No image provided' })
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: { url: image },
              },
              {
                type: 'text',
                text: `You are a student note-taking assistant. Look at this image of lecture notes, a textbook page, or a whiteboard.

Extract and structure the content into clean, well-organized notes.

Respond with a JSON object in this exact format:
{
  "title": "A short descriptive title for these notes",
  "course": "The subject/course if you can identify it, otherwise empty string",
  "content": "The full structured notes with headings, bullet points, and key concepts clearly laid out"
}

Only respond with the JSON object, nothing else.`,
              },
            ],
          },
        ],
        max_tokens: 1500,
      }),
    })

    const data = await response.json()

    if (!data.choices?.[0]?.message?.content) {
      console.error('OpenAI error:', JSON.stringify(data))
      return res.status(500).json({ error: data.error?.message || 'Failed to generate notes' })
    }

    const raw = data.choices[0].message.content.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(raw)

    return res.status(200).json({
      title: parsed.title || 'Untitled Notes',
      course: parsed.course || '',
      content: parsed.content || '',
    })
  } catch (err) {
    console.error('Generate notes error:', err)
    return res.status(500).json({ error: err.message || 'Internal server error' })
  }
}
