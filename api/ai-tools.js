import { fetchWithRetry } from './_utils/openaiRetry.js'
import { logTokenUsage } from './_utils/tokenLogger.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { mode, image, text, userId } = req.body
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY
    if (!OPENAI_API_KEY) return res.status(500).json({ error: 'OpenAI API key not configured' })

    // ── Chat ─────────────────────────────────────────────────────────────
    if (mode === 'chat') {
      const { chatMessages, documentContext, studentContext, chatMode } = req.body
      if (!chatMessages || !Array.isArray(chatMessages)) return res.status(400).json({ error: 'chatMessages required' })

      let system = `You are SAGE, an intelligent AI tutor for Kenyan university students. Be warm, encouraging, clear, and exam-focused. Keep replies concise — 2-3 paragraphs max.\n\n`
      if (studentContext) system += `${studentContext}\n\n`
      if (documentContext) system += `Lecture content:\n${documentContext}\n\n`
      const modes = {
        notes: 'Help understand lecture notes. Explain clearly, give examples, highlight exam points.',
        quiz: 'Explain why answers were correct or wrong. Give reasoning and memory tricks.',
        snapsolve: 'Continue tutoring. Go deeper, simplify if confused, suggest related practice.',
        general: 'Answer academic questions clearly. Be encouraging.',
      }
      system += modes[chatMode] || modes.general

      const chatRes = await fetchWithRetry('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
        body: JSON.stringify({
          model: 'gpt-5-mini', max_tokens: 700,
          messages: [{ role: 'system', content: system }, ...chatMessages.map(m => ({ role: m.role, content: m.content }))],
        }),
      })
      const chatData = await chatRes.json()
      logTokenUsage(userId, `chat_${chatMode || 'general'}`, 'gpt-5-mini', chatData.usage)
      if (!chatData.choices?.[0]?.message?.content) return res.status(500).json({ error: 'Chat failed' })
      return res.status(200).json({ reply: chatData.choices[0].message.content })
    }

    // ── Flashcards ────────────────────────────────────────────────────────
    if (mode === 'flashcards') {
      const { lectureContent, subject, count = 12 } = req.body
      if (!lectureContent) return res.status(400).json({ error: 'lectureContent required' })

      const r = await fetchWithRetry('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
        body: JSON.stringify({
          model: 'gpt-5-mini', max_tokens: 2000,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: `Generate ${count} flashcards. Return JSON: {"flashcards":[{"id":"1","front":"Q","back":"A","topic":"T","difficulty":"easy|medium|hard"}]}` },
            { role: 'user', content: `Subject: ${subject || 'General'}\n\n${lectureContent.slice(0, 4000)}` },
          ],
        }),
      })
      const d = await r.json()
      logTokenUsage(userId, 'flashcards', 'gpt-5-mini', d.usage)
      try { return res.status(200).json({ flashcards: JSON.parse(d.choices[0].message.content).flashcards || [] }) }
      catch { return res.status(500).json({ error: 'Failed to generate flashcards' }) }
    }

    // ── Mock Exam ─────────────────────────────────────────────────────────
    if (mode === 'mockexam') {
      const { lectureContent, subject, numQuestions = 10 } = req.body
      if (!lectureContent) return res.status(400).json({ error: 'lectureContent required' })

      const r = await fetchWithRetry('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
        body: JSON.stringify({
          model: 'gpt-5-mini', max_tokens: 3000,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: `Generate a ${numQuestions}-question university-style mock exam. Return JSON: {"examTitle":"T","timeAllowed":"30","questions":[{"id":"1","question":"Q","options":["A","B","C","D"],"correct":0,"explanation":"E","marks":2,"topic":"T","difficulty":"easy|medium|hard"}],"totalMarks":20}` },
            { role: 'user', content: `Subject: ${subject || 'General'}\n\n${lectureContent.slice(0, 4000)}` },
          ],
        }),
      })
      const d = await r.json()
      logTokenUsage(userId, 'mock_exam', 'gpt-5-mini', d.usage)
      try { return res.status(200).json(JSON.parse(d.choices[0].message.content)) }
      catch { return res.status(500).json({ error: 'Failed to generate exam' }) }
    }

    // ── Knowledge Gap — works with EITHER notes or transcript ─────────────
    if (mode === 'knowledgegap') {
      const { transcript, notes, subject } = req.body

      // Fixed: gracefully degrade — only one source is needed
      const hasTranscript = !!(transcript?.trim())
      const hasNotes = !!(notes?.trim())

      if (!hasTranscript && !hasNotes) {
        return res.status(400).json({ error: 'At least notes or transcript is required' })
      }

      const userContent = hasTranscript && hasNotes
        ? `Subject: ${subject || 'General'}\n\nTranscript:\n${transcript.slice(0, 3000)}\n\nStudent Notes:\n${notes.slice(0, 2000)}`
        : hasNotes
        ? `Subject: ${subject || 'General'}\n\nStudent Notes (no transcript available — analyze notes alone):\n${notes.slice(0, 4000)}`
        : `Subject: ${subject || 'General'}\n\nTranscript (no student notes — analyze lecture coverage):\n${transcript.slice(0, 4000)}`

      const r = await fetchWithRetry('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
        body: JSON.stringify({
          model: 'gpt-5-mini', max_tokens: 2000,
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'system',
              content: `You are SAGE performing a Knowledge Gap Analysis for a Kenyan university student.
${hasTranscript && hasNotes ? 'Compare the transcript with student notes to detect gaps.' : hasNotes ? 'Analyze the student notes to assess understanding and identify any gaps or missing concepts.' : 'Analyze the transcript to estimate what a student should have captured.'}
Return ONLY valid JSON:
{
  "knowledgeCoverage": 75,
  "examReadiness": 65,
  "understandingScore": 70,
  "confidenceScore": 60,
  "coveredConcepts": ["concept 1"],
  "missingConcepts": ["concept A"],
  "weakAreas": ["area 1"],
  "strongAreas": ["area 1"],
  "recommendations": ["Study X"],
  "studyNext": "Most important concept to focus on",
  "examTips": ["Tip 1"],
  "topicsMastered": ["topic 1"],
  "summary": "2-sentence assessment"
}`,
            },
            { role: 'user', content: userContent },
          ],
        }),
      })
      const d = await r.json()
      logTokenUsage(userId, 'knowledge_gap', 'gpt-5-mini', d.usage)
      try { return res.status(200).json(JSON.parse(d.choices[0].message.content)) }
      catch { return res.status(500).json({ error: 'Failed to analyze knowledge gaps' }) }
    }

    // ── Deep Notes ────────────────────────────────────────────────────────
    if (mode === 'deepnotes') {
      const { content, subject, existingNotes } = req.body
      const inputContent = content || existingNotes
      if (!inputContent) return res.status(400).json({ error: 'content required' })

      const r = await fetchWithRetry('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
        body: JSON.stringify({
          model: 'gpt-5-mini', max_tokens: 3000,
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'system',
              content: `You are SAGE AI Tutor. Create comprehensive deep notes for a Kenyan university student.
Return ONLY valid JSON:
{"title":"T","subject":"S","overview":"2-3 sentences","sections":[{"heading":"H","explanation":"E","simpleExplanation":"Simple","examples":["Ex"],"definitions":[{"term":"T","definition":"D"}],"memoryTrick":"M","commonMistakes":["M"],"examTips":["T"],"relatedConcepts":["C"],"realWorldApplication":"R"}],"formulasAndKeyFacts":["F"],"quickRevision":["P"],"predictedExamQuestions":["Q?"]}`,
            },
            { role: 'user', content: `Subject: ${subject || 'General'}\n\n${inputContent.slice(0, 4000)}` },
          ],
        }),
      })
      const d = await r.json()
      logTokenUsage(userId, 'deep_notes', 'gpt-5-mini', d.usage)
      try { return res.status(200).json(JSON.parse(d.choices[0].message.content)) }
      catch { return res.status(500).json({ error: 'Failed to generate deep notes' }) }
    }

    // ── SnapSolve ─────────────────────────────────────────────────────────
    if (mode === 'snapsolve') {
      if (!image && !text) return res.status(400).json({ error: 'No image or text provided' })
      const content = image
        ? [{ type: 'image_url', image_url: { url: image } }, { type: 'text', text: `Analyze and solve. Return JSON only: {"question":"Q","answer":"step-by-step answer","explanation":"key concepts","revision_notes":"bullet points","quiz":[{"question":"MCQ","options":["A","B","C","D"],"answer":"A"}]}` }]
        : `Solve: ${text}\nReturn JSON only: {"question":"Q","answer":"answer","explanation":"concepts","revision_notes":"bullets","quiz":[{"question":"MCQ","options":["A","B","C","D"],"answer":"A"}]}`

      const r = await fetchWithRetry('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
        body: JSON.stringify({ model: 'gpt-5-mini', messages: [{ role: 'user', content }], max_tokens: 2000 }),
      })
      const d = await r.json()
      logTokenUsage(userId, 'snapsolve', 'gpt-5-mini', d.usage)
      const raw = d.choices?.[0]?.message?.content?.replace(/```json|```/g, '').trim() || '{}'
      try { return res.status(200).json({ result: JSON.parse(raw) }) }
      catch { return res.status(500).json({ error: 'Failed to parse response' }) }
    }

    // ── Past Papers ───────────────────────────────────────────────────────
    if (mode === 'pastpapers') {
      if (!image && !text) return res.status(400).json({ error: 'No content provided' })
      const content = image
        ? [{ type: 'image_url', image_url: { url: image } }, { type: 'text', text: `Analyze past paper. Return JSON only: {"paper_title":"T","questions":[{"number":"1","question":"Q","model_answer":"A","marks":"2","key_points":["P"]}],"common_themes":["T"],"exam_tips":["T"],"predicted_topics":["T"]}` }]
        : `Analyze:\n${text}\nReturn JSON: {"paper_title":"T","questions":[{"number":"1","question":"Q","model_answer":"A","marks":"2","key_points":["P"]}],"common_themes":["T"],"exam_tips":["T"],"predicted_topics":["T"]}`

      const r = await fetchWithRetry('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
        body: JSON.stringify({ model: 'gpt-5-mini', messages: [{ role: 'user', content }], max_tokens: 3000 }),
      })
      const d = await r.json()
      logTokenUsage(userId, 'past_papers', 'gpt-5-mini', d.usage)
      const raw = d.choices?.[0]?.message?.content?.replace(/```json|```/g, '').trim() || '{}'
      try { return res.status(200).json({ result: JSON.parse(raw) }) }
      catch { return res.status(500).json({ error: 'Failed to parse response' }) }
    }

    return res.status(400).json({ error: `Invalid mode: ${mode}` })
  } catch (err) {
    console.error('SAGE AI error:', err)
    return res.status(500).json({ error: err.message || 'Internal server error' })
  }
}
