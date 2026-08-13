import { fetchWithRetry } from './_utils/openaiRetry.js'
import { logTokenUsage } from './_utils/tokenLogger.js'
import { checkRateLimit } from './_utils/rateLimiter.js'

const notesCache = new Map()

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const { transcript, segments, courseName, unitName, userId } = req.body
    if (!transcript?.trim()) return res.status(400).json({ error: 'No transcript provided' })

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) return res.status(500).json({ error: 'API key not configured' })

    const rateCheck = await checkRateLimit(userId, 'generate-lecture-notes')
    if (!rateCheck.allowed) {
      return res.status(429).json({
        error: rateCheck.reason === 'missing_user_id' ? 'Authentication required' : `Too many requests — wait ${Math.ceil(rateCheck.retryAfterSeconds / 60)} minute(s).`,
        retryAfterSeconds: rateCheck.retryAfterSeconds,
      })
    }

    const cacheKey = `${transcript.slice(0, 200)}-${courseName || ''}-${unitName || ''}`
    if (notesCache.has(cacheKey)) return res.status(200).json(notesCache.get(cacheKey))

    // Compact timestamp map so GPT can attach real timestamps to the script
    // instead of guessing. Only start-time + a text preview per segment —
    // full segment text would roughly double the prompt for no real benefit.
    const segmentMap = Array.isArray(segments) && segments.length > 0
      ? segments.map(s => `[${Math.floor(s.start)}s] ${s.text.slice(0, 80)}`).join('\n')
      : null

    const systemPrompt = `You are STUDIA Smart Ink, an AI that converts lecture transcripts into structured, exam-focused study notes for Kenyan university students, and also builds a timestamped structured lecture script.

The lecture may be in English, Kiswahili, or natural code-switching between them. Preserve the lecturer's original technical terminology and wording faithfully — do not force translation where it would lose meaning. If Kiswahili is present, keep it in the structured script exactly as spoken.

Return ONLY valid JSON, no markdown fences:
{
  "title": "Short descriptive title",
  "subjectArea": "Medicine|Law|Engineering|Business|Computer Science|Economics|Science|Humanities|General",
  "detectedLanguages": ["English"] or ["English","Kiswahili"] if code-switching was present,
  "sections": [
    { "type": "heading", "text": "MAIN TOPIC" },
    { "type": "subheading", "text": "Subtopic" },
    { "type": "paragraph", "text": "Explanation. Wrap key terms in **double asterisks**." },
    { "type": "definition", "text": "Term: definition" },
    { "type": "example", "text": "Example" },
    { "type": "examtip", "text": "High-yield exam point" },
    { "type": "summary", "text": "Concise recap" },
    { "type": "table", "headers": ["Col A", "Col B"], "rows": [["val", "val"]] },
    { "type": "flowchart", "title": "Chart title", "nodes": [{ "id": "1", "label": "Step", "sublabel": "", "shape": "rect" }], "edges": [{ "from": "1", "to": "2", "label": "" }] }
  ],
  "quickRevision": { "topFacts": ["fact 1"], "keyTerms": ["term 1"], "commonMistakes": ["mistake"] },
  "structuredScript": [
    { "timestamp": 0, "heading": "Section heading in lecturer's own topic order", "definition": "if any, else empty string", "explanation": "the lecturer's explanation, close to original wording", "keyTerm": "one important term or empty string" }
  ]
}

Rules for structuredScript:
- One entry per distinct topic shift, in the order the lecturer covered them.
- "timestamp" is the second from the map below where this topic begins — pick the closest one.
- Keep entries concise, not a full restatement of the transcript.
${segmentMap ? `\nTimestamp map (second: preview):\n${segmentMap.slice(0, 6000)}` : '\nNo timestamp map available — set "timestamp" to 0 for all entries.'}`

    const response = await fetchWithRetry('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'gpt-5-mini',
        max_tokens: 6500,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Generate Smart Ink notes and the structured script.\n${courseName ? `Course: ${courseName}` : ''}\n${unitName ? `Unit: ${unitName}` : ''}\n\nTranscript:\n${transcript}` },
        ],
      }),
    })

    const data = await response.json()
    if (!response.ok) return res.status(response.status).json({ error: data.error?.message || 'Notes generation failed' })

    logTokenUsage(userId, 'lecture_notes', 'gpt-5-mini', data.usage)

    const raw = data.choices?.[0]?.message?.content || ''
    let structured
    try { structured = JSON.parse(raw) }
    catch { return res.status(200).json({ notes: raw, structured: null, structuredScript: [] }) }

    const plainText = flattenToPlainText(structured)
    const result = {
      notes: plainText,
      structured,
      structuredScript: structured.structuredScript || [],
      detectedLanguages: structured.detectedLanguages || ['English'],
    }
    notesCache.set(cacheKey, result)
    if (notesCache.size > 50) notesCache.delete(notesCache.keys().next().value)

    return res.status(200).json(result)
  } catch (error) {
    console.error('Lecture notes error:', error)
    return res.status(500).json({ error: error.message || 'Internal server error' })
  }
}

function flattenToPlainText(s) {
  if (!s?.sections) return ''
  const lines = []
  if (s.title) lines.push(s.title, '')
  for (const sec of s.sections) {
    const clean = (sec.text || '').replace(/\*\*/g, '')
    if (sec.type === 'heading') lines.push(`## ${clean}`, '')
    else if (sec.type === 'subheading') lines.push(`### ${clean}`, '')
    else if (sec.type === 'definition') lines.push(`Definition: ${clean}`, '')
    else if (sec.type === 'example') lines.push(`Example: ${clean}`, '')
    else if (sec.type === 'examtip') lines.push(`⭐ Exam Tip: ${clean}`, '')
    else if (sec.type === 'summary') lines.push(`Summary: ${clean}`, '')
    else if (sec.type === 'table' && sec.headers) {
      lines.push(sec.headers.join(' | '))
      sec.rows?.forEach(r => lines.push(r.join(' | ')))
      lines.push('')
    } else if (sec.type === 'flowchart') {
      lines.push(`[Diagram: ${sec.title || 'Flow'}]`)
      sec.nodes?.forEach(n => lines.push(`  → ${n.label}`))
      lines.push('')
    } else if (clean) lines.push(clean, '')
  }
  if (s.quickRevision?.topFacts?.length) {
    lines.push('Quick Revision:')
    s.quickRevision.topFacts.forEach(f => lines.push(`• ${f}`))
  }
  return lines.join('\n')
}
