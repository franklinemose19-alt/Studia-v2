import pdfParse from 'pdf-parse'
import { fetchWithRetry } from './_utils/openaiRetry.js'
import { logTokenUsage } from './_utils/tokenLogger.js'
import { checkRateLimit } from './_utils/rateLimiter.js'

const quizCache = new Map()

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const { text, pdfBase64, courseContext, userId } = req.body
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) return res.status(500).json({ error: 'API key not configured' })

    const rateCheck = await checkRateLimit(userId, 'quiz')
    if (!rateCheck.allowed) {
      return res.status(429).json({
        error: rateCheck.reason === 'missing_user_id'
          ? 'Authentication required'
          : `Too many requests — please wait ${Math.ceil(rateCheck.retryAfterSeconds / 60)} minute(s) and try again.`,
        retryAfterSeconds: rateCheck.retryAfterSeconds,
      })
    }

    let sourceText = text
    let isPastPaper = false

    if (pdfBase64) {
      isPastPaper = true
      try {
        const pdfData = await pdfParse(Buffer.from(pdfBase64, 'base64'))
        sourceText = pdfData.text
      } catch {
        return res.status(500).json({ error: 'Could not read the uploaded PDF' })
      }
    }

    if (!sourceText?.trim()) return res.status(400).json({ error: 'No content provided' })

    const cacheKey = `${sourceText.slice(0, 150)}-${isPastPaper}`
    if (quizCache.has(cacheKey)) return res.status(200).json(quizCache.get(cacheKey))

    const systemPrompt = isPastPaper
      ? `You are an exam-paper analyst for STUDIA. Extract genuine exam questions from the text and convert each into MCQ format. Return ONLY a valid JSON array: [{"question":"Q","options":["A","B","C","D"],"correct":0,"topic":"Topic"}]. Max 10 questions.`
      : `Generate exactly 5 multiple choice questions from the provided lecture notes. Return as JSON array: [{"question":"Q","options":["A","B","C","D"],"correct":0,"topic":"Topic"}]. Vary difficulty, cover all major topics.`

    const userPrompt = isPastPaper
      ? `${courseContext ? `Course context: ${courseContext}\n\n` : ''}Past paper:\n\n${sourceText.slice(0, 9000)}`
      : `Generate 5 MCQs:\n\n${sourceText}`

    const response = await fetchWithRetry('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'gpt-5-mini',
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
        temperature: 0.7,
        max_tokens: isPastPaper ? 2000 : 1000,
      }),
    })

    const data = await response.json()
    if (!response.ok) return res.status(response.status).json({ error: data.error?.message || 'Quiz generation failed' })

    logTokenUsage(userId, 'quiz_generation', 'gpt-5-mini', data.usage)

    const content = data.choices?.[0]?.message?.content || ''
    const jsonMatch = content.match(/\[[\s\S]*\]/)
    const quizzes = jsonMatch ? JSON.parse(jsonMatch[0]) : []
    const result = { quizzes, source: isPastPaper ? 'past_paper' : 'notes' }

    quizCache.set(cacheKey, result)
    if (quizCache.size > 30) quizCache.delete(quizCache.keys().next().value)

    return res.status(200).json(result)
  } catch (error) {
    console.error('Quiz error:', error)
    return res.status(500).json({ error: error.message || 'Internal server error' })
  }
}
