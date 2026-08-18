import pdfParse from 'pdf-parse'
import { checkRateLimit } from './_utils/rateLimiter.js'
import { chatCompletion } from './_utils/aiGateway.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const { pdfBase64, courses, userId } = req.body
    if (!pdfBase64) return res.status(400).json({ error: 'No PDF provided' })

    const rateCheck = await checkRateLimit(userId, 'parse-timetable')
    if (!rateCheck.allowed) {
      return res.status(429).json({
        error: rateCheck.reason === 'missing_user_id' ? 'Authentication required' : `Too many requests — wait ${Math.ceil(rateCheck.retryAfterSeconds / 60)} minute(s).`,
        retryAfterSeconds: rateCheck.retryAfterSeconds,
      })
    }

    const buffer = Buffer.from(pdfBase64, 'base64')
    const pdfData = await pdfParse(buffer)
    const text = pdfData.text

    const coursesContext = courses && courses.length > 0
      ? courses.map(c => `${c.name}${c.units?.length ? ' (' + c.units.join(', ') + ')' : ''}`).join('; ')
      : 'Not specified'

    try {
      const result = await chatCompletion({
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
            content: `Student's enrolled courses/units: ${coursesContext}\nTimetable text:\n"""${text.slice(0, 8000)}"""\nExtract all exams found. If the student's courses are specified, still include all exams found in the document.`,
          },
        ],
        maxTokens: 2000, feature: 'parse_timetable', userId,
      })
      const jsonMatch = result.content.match(/\[[\s\S]*\]/)
      const exams = jsonMatch ? JSON.parse(jsonMatch[0]) : []
      return res.status(200).json({ exams })
    } catch (err) { return res.status(500).json({ error: err.message || 'Failed to parse timetable' }) }
  } catch (error) {
    console.error('Timetable parsing error:', error)
    return res.status(500).json({ error: error.message || 'Internal server error' })
  }
}
