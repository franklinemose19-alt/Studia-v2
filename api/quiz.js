import pdfParse from 'pdf-parse'
import { checkRateLimit } from './_utils/rateLimiter.js'
import { chatCompletion } from './_utils/aiGateway.js'
import { getVerifiedUserId } from './_utils/verifyUser.js'
import { consumeAICredit, releaseAICredit } from './_utils/aiCredits.js'

const quizCache = new Map()

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const authId = await getVerifiedUserId(req)
    if (!authId) return res.status(401).json({ error: 'Please sign in again.', code: 'not_authenticated' })

    const { text, pdfBase64, courseContext } = req.body

    const rateCheck = await checkRateLimit(authId, 'quiz')
    if (!rateCheck.allowed) {
      return res.status(429).json({ error: `Too many requests — wait ${Math.ceil(rateCheck.retryAfterSeconds / 60)} minute(s).`, retryAfterSeconds: rateCheck.retryAfterSeconds })
    }

    let sourceText = text
    let isPastPaper = false
    if (pdfBase64) {
      isPastPaper = true
      try { sourceText = (await pdfParse(Buffer.from(pdfBase64, 'base64'))).text }
      catch { return res.status(500).json({ error: 'Could not read the uploaded PDF' }) }
    }
    if (!sourceText?.trim()) return res.status(400).json({ error: 'No content provided' })

    const cacheKey = `${sourceText.slice(0, 150)}-${isPastPaper}`
    if (quizCache.has(cacheKey)) return res.status(200).json(quizCache.get(cacheKey))

    const credit = await consumeAICredit(authId)
    if (!credit.allowed) {
      return res.status(402).json({ error: 'Your 3 free AI lectures have been used. Upgrade to continue using SAGE AI Tutor.', code: 'ai_credit_exhausted' })
    }

    const systemPrompt = isPastPaper
      ? `You are an exam-paper analyst for STUDIA. Extract genuine exam questions from the text and convert each into MCQ format. Return ONLY a valid JSON array: [{"question":"Q","options":["A","B","C","D"],"correct":0,"topic":"Topic"}]. Max 10 questions.`
      : `Generate exactly 5 multiple choice questions from the provided lecture notes. Return as JSON array: [{"question":"Q","options":["A","B","C","D"],"correct":0,"topic":"Topic"}]. Vary difficulty, cover all major topics.`
    const userPrompt = isPastPaper
      ? `${courseContext ? `Course context: ${courseContext}\n\n` : ''}Past paper:\n\n${sourceText.slice(0, 9000)}`
      : `Generate 5 MCQs:\n\n${sourceText}`

    try {
      const result = await chatCompletion({
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
        maxTokens: isPastPaper ? 2000 : 1000, temperature: 0.7, feature: 'quiz_generation', userId: authId,
      })
      const jsonMatch = result.content.match(/\[[\s\S]*\]/)
      const quizzes = jsonMatch ? JSON.parse(jsonMatch[0]) : []
      const responseBody = { quizzes, source: isPastPaper ? 'past_paper' : 'notes' }
      quizCache.set(cacheKey, responseBody)
      if (quizCache.size > 30) quizCache.delete(quizCache.keys().next().value)
      return res.status(200).json(responseBody)
    } catch (err) {
      await releaseAICredit(authId, credit.source)
      return res.status(500).json({ error: err.message || 'Quiz generation failed' })
    }
  } catch (error) {
    console.error('Quiz error:', error)
    return res.status(500).json({ error: error.message || 'Internal server error' })
  }
}
