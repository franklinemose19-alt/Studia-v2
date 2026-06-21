export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  try {
    const { transcript, courseName, unitName } = req.body
    if (!transcript || !transcript.trim()) {
      return res.status(400).json({ error: 'No transcript provided' })
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return res.status(500).json({ error: 'API key not configured' })
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: 1500,
        messages: [
          {
            role: 'system',
            content: `You are STUDIA, an AI academic assistant for Kenyan university students. Generate clear, structured lecture notes from transcripts. Format your response with these sections:
## 📌 Key Topics
## 📝 Main Notes
## 💡 Key Concepts
## ❓ Possible Exam Questions
Keep it concise and student-friendly.`,
          },
          {
            role: 'user',
            content: `Generate lecture notes from this transcript.
${courseName ? `Course: ${courseName}` : ''}
${unitName ? `Unit: ${unitName}` : ''}

Transcript:
${transcript}`,
          },
        ],
      }),
    })

    const data = await response.json()
    if (!response.ok) {
      console.error('OpenAI Error:', data)
      return res.status(response.status).json({ error: data.error?.message || 'Notes generation failed' })
    }

    const notes = data.choices?.[0]?.message?.content || null
    return res.status(200).json({ notes })
  } catch (error) {
    console.error('Lecture notes generation error:', error)
    return res.status(500).json({ error: error.message || 'Internal server error' })
  }
}
