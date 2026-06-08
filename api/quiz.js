export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { text } = req.body

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: 'No text provided' })
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
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'Generate exactly 5 multiple choice questions from the provided lecture notes. Return as JSON array with this format: [{"question":"Q1","options":["A","B","C","D"],"correct":0}]. Make questions educational and vary difficulty.',
          },
          {
            role: 'user',
            content: `Generate 5 MCQs from these notes:\n\n${text}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('OpenAI Error:', data)
      return res.status(response.status).json({ error: data.error?.message || 'Quiz generation failed' })
    }

    const content = data.choices?.[0]?.message?.content || ''
    
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/)
      const quizzes = jsonMatch ? JSON.parse(jsonMatch[0]) : []
      return res.status(200).json({ quizzes })
    } catch (e) {
      return res.status(500).json({ error: 'Failed to parse quiz data' })
    }
  } catch (error) {
    console.error('Quiz generation error:', error)
    return res.status(500).json({ error: error.message || 'Internal server error' })
  }
}
