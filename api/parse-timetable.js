export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { imageBase64, courses } = req.body

    if (!imageBase64) {
      return res.status(400).json({ error: 'No image provided' })
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return res.status(500).json({ error: 'API key not configured' })
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4-vision-preview',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analyze this exam timetable image and extract all exams. Return ONLY valid JSON (no markdown) with this format:
[
  {"course": "Course Name", "date": "YYYY-MM-DD", "time": "HH:MM", "duration": "minutes"},
  ...
]
If you cannot parse any exams, return an empty array [].
User's courses: ${courses || 'No courses specified'}
Extract exams that match the user's courses if specified.`,
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${imageBase64}`,
                },
              },
            ],
          },
        ],
        max_tokens: 1000,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('OpenAI Error:', data)
      return res.status(response.status).json({ error: data.error?.message || 'Failed to parse timetable' })
    }

    const content = data.choices?.[0]?.message?.content || ''
    
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/)
      const exams = jsonMatch ? JSON.parse(jsonMatch[0]) : []
      return res.status(200).json({ exams, rawContent: content })
    } catch (e) {
      console.error('Parse error:', e, 'Content:', content)
      return res.status(500).json({ error: 'Failed to parse exam data from timetable' })
    }
  } catch (error) {
    console.error('Timetable parsing error:', error)
    return res.status(500).json({ error: error.message || 'Internal server error' })
  }
}
