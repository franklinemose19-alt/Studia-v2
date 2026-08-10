import pdfParse from 'pdf-parse'
import { fetchWithRetry } from './_utils/openaiRetry.js'
import { logTokenUsage } from './_utils/tokenLogger.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { mode, image, text, userId } = req.body
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY
    if (!OPENAI_API_KEY) return res.status(500).json({ error: 'OpenAI API key not configured' })

    // ── Chat (Tutor + Developer Agent, subject-aware) ──────────────────────
    if (mode === 'chat') {
      const { chatMessages, documentContext, studentContext, chatMode, subjectStructure } = req.body
      if (!chatMessages || !Array.isArray(chatMessages)) return res.status(400).json({ error: 'chatMessages required' })

      let system = `You are SAGE, an intelligent AI tutor for Kenyan university students built into STUDIA AI. Be warm, encouraging, clear, and exam-focused. Keep replies concise — 2-3 paragraphs max unless more detail is genuinely needed.

Formatting rules:
- Programming/code: use markdown code fences with language name, e.g. \`\`\`python
- Math: use $...$ for inline math and $$...$$ for a standalone equation (KaTeX syntax)
- Tabular data: use markdown pipe tables
- Only if a chart genuinely helps, include ONE \`\`\`chart fenced block: {"type":"bar"|"line","title":"...","labels":["..."],"datasets":[{"name":"...","values":[...]}]}
- Only if a process/flow diagram genuinely helps, include ONE \`\`\`diagram fenced block: {"title":"...","nodes":[{"id":"1","label":"..."}],"edges":[{"from":"1","to":"2"}]}
Most answers need none of the chart/diagram blocks.\n\n`

      if (subjectStructure) system += `For this subject, structure your answer as: ${subjectStructure}\n\n`
      if (studentContext) system += `${studentContext}\n\n`
      if (documentContext) system += `Lecture content the student has:\n${documentContext}\n\n`

      const modeInstructions = {
        notes: 'Help understand lecture notes. Explain clearly, give examples, highlight exam points.',
        quiz: 'Explain why answers were correct or wrong. Give reasoning and memory tricks.',
        snapsolve: 'Continue tutoring on this problem. Go deeper, simplify if confused, suggest related practice.',
        developer: 'You are in Developer Mode — a focused coding assistant. Help with debugging, algorithms, code explanations, and CS/IT/ICT concepts. Always write real, working code in fenced blocks with the language name. Be technical and direct — no need to soften explanations for a programming audience.',
        general: 'Answer academic questions clearly, including programming/CS/IT questions with real working code. Be encouraging.',
      }
      system += modeInstructions[chatMode] || modeInstructions.general

      const chatRes = await fetchWithRetry('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
        body: JSON.stringify({
          model: 'gpt-5-mini', max_tokens: 900,
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

    // ── Knowledge Gap ─────────────────────────────────────────────────────
    if (mode === 'knowledgegap') {
      const { transcript, notes, subject } = req.body
      const hasTranscript = !!(transcript?.trim())
      const hasNotes = !!(notes?.trim())
      if (!hasTranscript && !hasNotes) return res.status(400).json({ error: 'At least notes or transcript is required' })

      const userContent = hasTranscript && hasNotes
        ? `Subject: ${subject || 'General'}\n\nTranscript:\n${transcript.slice(0, 3000)}\n\nStudent Notes:\n${notes.slice(0, 2000)}`
        : hasNotes
        ? `Subject: ${subject || 'General'}\n\nStudent Notes (no transcript — analyze notes alone):\n${notes.slice(0, 4000)}`
        : `Subject: ${subject || 'General'}\n\nTranscript (no notes — estimate coverage):\n${transcript.slice(0, 4000)}`

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
${hasTranscript && hasNotes ? 'Compare the transcript with student notes to detect gaps.' : hasNotes ? 'Analyze the student notes to assess understanding and identify gaps.' : 'Analyze the transcript to estimate coverage.'}
Return ONLY valid JSON:
{"knowledgeCoverage":75,"examReadiness":65,"understandingScore":70,"confidenceScore":60,"coveredConcepts":["c1"],"missingConcepts":["cA"],"weakAreas":["a1"],"strongAreas":["a1"],"recommendations":["Study X"],"studyNext":"Most important concept","examTips":["Tip1"],"topicsMastered":["t1"],"summary":"2-sentence assessment"}`,
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
            { role: 'system', content: `You are SAGE AI Tutor. Create comprehensive deep notes for a Kenyan university student. Use $...$ for inline math where relevant.
Return ONLY valid JSON:
{"title":"T","subject":"S","overview":"2-3 sentences","sections":[{"heading":"H","explanation":"E","simpleExplanation":"Simple","examples":["Ex"],"definitions":[{"term":"T","definition":"D"}],"memoryTrick":"M","commonMistakes":["M"],"examTips":["T"],"relatedConcepts":["C"],"realWorldApplication":"R"}],"formulasAndKeyFacts":["F"],"quickRevision":["P"],"predictedExamQuestions":["Q?"]}` },
            { role: 'user', content: `Subject: ${subject || 'General'}\n\n${inputContent.slice(0, 4000)}` },
          ],
        }),
      })
      const d = await r.json()
      logTokenUsage(userId, 'deep_notes', 'gpt-5-mini', d.usage)
      try { return res.status(200).json(JSON.parse(d.choices[0].message.content)) }
      catch { return res.status(500).json({ error: 'Failed to generate deep notes' }) }
    }

    // ── Study Coach ───────────────────────────────────────────────────────
    if (mode === 'coach') {
      const { studentContext, question } = req.body
      const r = await fetchWithRetry('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
        body: JSON.stringify({
          model: 'gpt-5-mini', max_tokens: 500,
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'system',
              content: `You are SAGE's Study Coach for a Kenyan university student. Give a short, warm, honest status update and one specific, actionable recommendation. Don't inflate progress that isn't there.
Return ONLY valid JSON: {"message":"1-2 sentence honest status update","recommendation":"one specific actionable piece of advice","suggestedAction":"a concrete next step"}`,
            },
            { role: 'user', content: `${studentContext || 'No study data yet — this student is just getting started.'}\n\n${question ? `Student asked: ${question}` : 'Give a general progress check-in.'}` },
          ],
        }),
      })
      const d = await r.json()
      logTokenUsage(userId, 'study_coach', 'gpt-5-mini', d.usage)
      try { return res.status(200).json(JSON.parse(d.choices[0].message.content)) }
      catch { return res.status(500).json({ error: 'Failed to generate coaching advice' }) }
    }

    // ── SnapSolve (Camera, context-aware) ──────────────────────────────────
    if (mode === 'snapsolve') {
      if (!image && !text) return res.status(400).json({ error: 'No image or text provided' })
      const { documentContext } = req.body
      const codeNote = 'If this is a programming/coding question, write real working code inside markdown code fences with the language name. If math is involved, use $...$ / $$...$$ KaTeX syntax.'
      const ctxNote = documentContext ? `The student has this lecture context available — use it if relevant, but ignore it if this question is unrelated:\n${documentContext.slice(0, 1500)}\n\n` : ''
      const content = image
        ? [{ type: 'image_url', image_url: { url: image } }, { type: 'text', text: `${ctxNote}Analyze and solve. ${codeNote} Return JSON only: {"question":"Q","answer":"step-by-step answer","explanation":"key concepts"}` }]
        : `${ctxNote}Solve: ${text}\n${codeNote}\nReturn JSON only: {"question":"Q","answer":"answer","explanation":"concepts"}`

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

    // ── Past Papers (now accepts image, text, OR real PDF upload) ──────────
    if (mode === 'pastpapers') {
      const { pdfBase64 } = req.body
      if (!image && !text && !pdfBase64) return res.status(400).json({ error: 'No content provided' })

      let sourceText = text
      if (pdfBase64) {
        try {
          const pdfData = await pdfParse(Buffer.from(pdfBase64, 'base64'))
          sourceText = pdfData.text
        } catch (e) {
          return res.status(500).json({ error: 'Could not read the uploaded PDF' })
        }
      }

      const promptInstructions = `Analyze this past paper. Extract real questions and give model answers. Return JSON only: {"paper_title":"T","questions":[{"number":"1","question":"Q","model_answer":"A","marks":"2","key_points":["P"]}],"common_themes":["T"],"exam_tips":["T"],"predicted_topics":["T"]}`

      const content = image
        ? [{ type: 'image_url', image_url: { url: image } }, { type: 'text', text: promptInstructions }]
        : `${promptInstructions}\n\nPast paper content:\n\n${(sourceText || '').slice(0, 9000)}`

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
