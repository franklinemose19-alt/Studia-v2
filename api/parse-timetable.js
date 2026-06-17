import pdfParse from 'pdf-parse'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  try {
    const { pdfBase64, courses } = req.body
    if (!pdfBase64) {
      return res.status(400).json({ error: 'No PDF provided' })
    }

    const buffer = Buffer.from(pdfBase64, 'base64')
    const pdfData = await pdfParse(buffer)
    const text = pdfData.text

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return res.status(500).json({ error: 'API key not configured' })
    }

    const coursesContext = courses && courses.length > 0
      ? courses.map(c => `${c.name}${c.units?.length ? ' (' + c.units.join(', ') + ')' : ''}`).join('; ')
      : 'Not specified'

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an exam timetable parser for STUDIA, a Kenyan university student app. Extract every exam entry from the provided text. Return ONLY valid JSON array, no markdown, no explanation. Format:
[{"course":"Course Name","unit":"Unit Name or empty string","date":"YYYY-MM-DD","time":"HH:MM or empty string","venue":"Venue or empty string"}]
If a year is missing in the source text, assume the current academic year, ${new Date().getFullYear()}.
If you find no exams, return [].`,
          },
          {
            role: 'user',
            content: `Student's enrolled courses/units: ${coursesContext}

Timetable text:
"""${text.slice(0, 8000)}"""

Extract all exams found. If the student's courses are specified, still include all exams found in the document.`,
          },
        ],
        max_tokens: 2000,
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
      return res.status(200).json({ exams })
    } catch (e) {
      console.error('Parse error:', e, 'Content:', content)
      return res.status(500).json({ error: 'Failed to parse exam data from timetable' })
    }
  } catch (error) {
    console.error('Timetable parsing error:', error)
    return res.status(500).json({ error: error.message || 'Internal server error' })
  }
}
