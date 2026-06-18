import pdfParse from 'pdf-parse'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  try {
    const { text, pdfBase64, courseContext } = req.body

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return res.status(500).json({ error: 'API key not configured' })
    }

    let sourceText = text
    let isPastPaper = false

    // ── Past paper mode: extract text from uploaded PDF ─────────────────
    if (pdfBase64) {
      isPastPaper = true
      try {
        const buffer = Buffer.from(pdfBase64, 'base64')
        const pdfData = await pdfParse(buffer)
        sourceText = pdfData.text
      } catch (e) {
        console.error('PDF parse error:', e)
        return res.status(500).json({ error: 'Could not read the uploaded PDF' })
      }
    }

    if (!sourceText || sourceText.trim().length === 0) {
      return res.status(400).json({ error: 'No text or PDF content provided' })
    }

    const systemPrompt = isPastPaper
      ? `You are an exam-paper analyst for STUDIA, a Kenyan university student app. The user has uploaded a real past exam paper. Extract the genuine exam questions from the text and convert each into a multiple-choice question that tests the SAME knowledge and difficulty as the original. If a question was originally open-ended/essay style, create plausible distractor options while keeping the correct answer accurate and exam-appropriate. Find as many distinct questions as reasonably present, up to a maximum of 10. Return ONLY a valid JSON array, no markdown, no explanation, in this exact format: [{"question":"Q1","options":["A","B","C","D"],"correct":0}]. Vary difficulty to match the real exam's distribution.`
      : 'Generate exactly 5 multiple choice questions from the provided lecture notes. Return as JSON array with this format: [{"question":"Q1","options":["A","B","C","D"],"correct":0}]. Make questions educational and vary difficulty.'

    const userPrompt = isPastPaper
      ? `${courseContext ? `Course/Unit context: ${courseContext}\n\n` : ''}Past exam paper content:\n\n${sourceText.slice(0, 9000)}\n\nExtract and convert the real exam questions into MCQ format as instructed.`
      : `Generate 5 MCQs from these notes:\n\n${sourceText}`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: isPastPaper ? 'gpt-4o-mini' : 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: isPastPaper ? 2000 : 1000,
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
      return res.status(200).json({ quizzes, source: isPastPaper ? 'past_paper' : 'notes' })
    } catch (e) {
      return res.status(500).json({ error: 'Failed to parse quiz data' })
    }
  } catch (error) {
    console.error('Quiz generation error:', error)
    return res.status(500).json({ error: error.message || 'Internal server error' })
  }
}
