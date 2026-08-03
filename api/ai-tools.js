import { fetchWithRetry } from './_utils/openaiRetry.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { mode, image, text } = req.body
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY

    if (!OPENAI_API_KEY) return res.status(500).json({ error: 'OpenAI API key not configured' })

    // ── Chat ──────────────────────────────────────────────────────────────
    if (mode === 'chat') {
      const { chatMessages, documentContext, studentContext, chatMode } = req.body
      if (!chatMessages || !Array.isArray(chatMessages)) {
        return res.status(400).json({ error: 'chatMessages required' })
      }

      let system = `You are SAGE, an intelligent AI tutor for Kenyan university students built into STUDIA AI. Be warm, encouraging, clear, and exam-focused. Keep replies concise — 2-3 paragraphs max unless more detail is genuinely needed.\n\n`
      if (studentContext) system += `${studentContext}\n\n`
      if (documentContext) system += `You have access to this lecture content:\n${documentContext}\n\n`

      const modeInstructions = {
        notes: 'Help the student understand their lecture notes. Explain clearly, give real examples, highlight exam-relevant points.',
        quiz: 'Help the student understand why answers were correct or wrong. Give reasoning and memory tricks.',
        snapsolve: 'Continue tutoring on this problem. Go deeper, simplify if confused, suggest related practice.',
        general: 'Answer academic questions clearly. Connect to their lecture content where relevant.',
      }
      system += modeInstructions[chatMode] || modeInstructions.general

      const chatRes = await fetchWithRetry('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          max_tokens: 700,
          messages: [
            { role: 'system', content: system },
            ...chatMessages.map(m => ({ role: m.role, content: m.content })),
          ],
        }),
      })
      const chatData = await chatRes.json()
      if (!chatData.choices?.[0]?.message?.content) {
        return res.status(500).json({ error: 'Chat response failed' })
      }
      return res.status(200).json({ reply: chatData.choices[0].message.content })
    }

    // ── Flashcards ────────────────────────────────────────────────────────
    if (mode === 'flashcards') {
      const { lectureContent, subject, count = 12 } = req.body
      if (!lectureContent) return res.status(400).json({ error: 'lectureContent required' })

      const flashRes = await fetchWithRetry('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          max_tokens: 2000,
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'system',
              content: `You are SAGE AI Tutor. Generate ${count} flashcards from the provided lecture content for a Kenyan university student.
Return ONLY valid JSON:
{
  "flashcards": [
    { "id": "1", "front": "Question or term", "back": "Answer or definition", "topic": "Topic name", "difficulty": "easy|medium|hard" }
  ]
}
Make flashcards that test real understanding. Include definitions, concepts, applications, and exam-style questions. Vary difficulty. Cover all major topics.`,
            },
            {
              role: 'user',
              content: `Subject: ${subject || 'General'}\n\nLecture Content:\n${lectureContent.slice(0, 4000)}`,
            },
          ],
        }),
      })
      const flashData = await flashRes.json()
      const raw = flashData.choices?.[0]?.message?.content || '{}'
      try {
        const parsed = JSON.parse(raw)
        return res.status(200).json({ flashcards: parsed.flashcards || [] })
      } catch {
        return res.status(500).json({ error: 'Failed to generate flashcards' })
      }
    }

    // ── Mock Exam ─────────────────────────────────────────────────────────
    if (mode === 'mockexam') {
      const { lectureContent, subject, numQuestions = 10 } = req.body
      if (!lectureContent) return res.status(400).json({ error: 'lectureContent required' })

      const examRes = await fetchWithRetry('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          max_tokens: 3000,
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'system',
              content: `You are SAGE AI Tutor. Generate a ${numQuestions}-question mock exam from the lecture content for a Kenyan university student.
Return ONLY valid JSON:
{
  "examTitle": "Mock Exam title",
  "timeAllowed": "30",
  "questions": [
    {
      "id": "1",
      "question": "Question text",
      "options": ["A. option", "B. option", "C. option", "D. option"],
      "correct": 0,
      "explanation": "Why this answer is correct",
      "marks": 2,
      "topic": "Topic name",
      "difficulty": "easy|medium|hard"
    }
  ],
  "totalMarks": 20
}`,
            },
            {
              role: 'user',
              content: `Subject: ${subject || 'General'}\n\nLecture Content:\n${lectureContent.slice(0, 4000)}`,
            },
          ],
        }),
      })
      const examData = await examRes.json()
      const raw = examData.choices?.[0]?.message?.content || '{}'
      try {
        return res.status(200).json(JSON.parse(raw))
      } catch {
        return res.status(500).json({ error: 'Failed to generate mock exam' })
      }
    }

    // ── Knowledge Gap ─────────────────────────────────────────────────────
    if (mode === 'knowledgegap') {
      const { transcript, notes, subject } = req.body
      if (!transcript && !notes) return res.status(400).json({ error: 'transcript or notes required' })

      const gapRes = await fetchWithRetry('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          max_tokens: 2000,
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'system',
              content: `You are SAGE AI Tutor performing a Knowledge Gap Analysis for a Kenyan university student.
Compare the lecture transcript with the captured notes to detect gaps, weak explanations, and missing concepts.
Return ONLY valid JSON:
{
  "knowledgeCoverage": 75,
  "examReadiness": 65,
  "understandingScore": 70,
  "confidenceScore": 60,
  "coveredConcepts": ["concept 1", "concept 2"],
  "missingConcepts": ["concept A", "concept B"],
  "weakAreas": ["area 1", "area 2"],
  "strongAreas": ["area 1", "area 2"],
  "recommendations": ["Study X topic", "Revise Y concept"],
  "studyNext": "The most important concept to focus on next",
  "examTips": ["Tip 1", "Tip 2", "Tip 3"],
  "topicsMastered": ["topic 1", "topic 2"],
  "summary": "2-sentence assessment of the student understanding"
}`,
            },
            {
              role: 'user',
              content: `Subject: ${subject || 'General'}\n\nTranscript:\n${(transcript || '').slice(0, 3000)}\n\nStudent Notes:\n${(notes || '').slice(0, 2000)}`,
            },
          ],
        }),
      })
      const gapData = await gapRes.json()
      const raw = gapData.choices?.[0]?.message?.content || '{}'
      try {
        return res.status(200).json(JSON.parse(raw))
      } catch {
        return res.status(500).json({ error: 'Failed to analyze knowledge gaps' })
      }
    }

    // ── Deep Notes ────────────────────────────────────────────────────────
    if (mode === 'deepnotes') {
      const { content, subject, existingNotes } = req.body
      const inputContent = content || existingNotes
      if (!inputContent) return res.status(400).json({ error: 'content required' })

      const deepRes = await fetchWithRetry('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          max_tokens: 3000,
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'system',
              content: `You are SAGE AI Tutor. Create comprehensive, exam-ready deep notes for a Kenyan university student.
Return ONLY valid JSON:
{
  "title": "Topic title",
  "subject": "Subject name",
  "overview": "2-3 sentence overview",
  "sections": [
    {
      "heading": "Section heading",
      "explanation": "Detailed explanation",
      "simpleExplanation": "Explain simply",
      "examples": ["Example 1", "Example 2"],
      "definitions": [{"term": "Term", "definition": "Definition"}],
      "memoryTrick": "Mnemonic or memory trick",
      "commonMistakes": ["Mistake 1"],
      "examTips": ["Exam tip 1"],
      "relatedConcepts": ["Concept 1"],
      "realWorldApplication": "Real world use"
    }
  ],
  "formulasAndKeyFacts": ["Formula 1"],
  "quickRevision": ["Point 1", "Point 2"],
  "predictedExamQuestions": ["Question 1?"]
}`,
            },
            {
              role: 'user',
              content: `Subject: ${subject || 'General'}\n\nContent:\n${inputContent.slice(0, 4000)}`,
            },
          ],
        }),
      })
      const deepData = await deepRes.json()
      const raw = deepData.choices?.[0]?.message?.content || '{}'
      try {
        return res.status(200).json(JSON.parse(raw))
      } catch {
        return res.status(500).json({ error: 'Failed to generate deep notes' })
      }
    }

    // ── SnapSolve ─────────────────────────────────────────────────────────
    if (mode === 'snapsolve') {
      if (!image && !text) return res.status(400).json({ error: 'No image or text provided' })

      const model = image ? 'gpt-4o' : 'gpt-4o-mini'
      const content = image
        ? [
            { type: 'image_url', image_url: { url: image } },
            {
              type: 'text',
              text: `You are SAGE AI Tutor. Analyze this image and provide a detailed solution.
Return JSON only: {"question":"extracted question","answer":"detailed step-by-step answer","explanation":"key concepts","revision_notes":"bullet points","quiz":[{"question":"MCQ","options":["A","B","C","D"],"answer":"A"}]}`,
            },
          ]
        : `You are SAGE AI Tutor. Answer: ${text}\nReturn JSON only: {"question":"restated question","answer":"detailed answer","explanation":"key concepts","revision_notes":"bullet points","quiz":[{"question":"MCQ","options":["A","B","C","D"],"answer":"A"}]}`

      const snapRes = await fetchWithRetry('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content }],
          max_tokens: 2000,
        }),
      })
      const snapData = await snapRes.json()
      const raw = snapData.choices?.[0]?.message?.content?.replace(/```json|```/g, '').trim() || '{}'
      try {
        return res.status(200).json({ result: JSON.parse(raw) })
      } catch {
        return res.status(500).json({ error: 'Failed to parse response' })
      }
    }

    // ── Past Papers ───────────────────────────────────────────────────────
    if (mode === 'pastpapers') {
      if (!image && !text) return res.status(400).json({ error: 'No content provided' })

      const model = image ? 'gpt-4o' : 'gpt-4o-mini'
      const content = image
        ? [
            { type: 'image_url', image_url: { url: image } },
            {
              type: 'text',
              text: `Analyze this past paper. Return JSON only: {"paper_title":"title","questions":[{"number":"1","question":"q","model_answer":"a","marks":"2","key_points":["p1"]}],"common_themes":["t1"],"exam_tips":["t1"],"predicted_topics":["t1"]}`,
            },
          ]
        : `Analyze this past paper:\n${text}\nReturn JSON only: {"paper_title":"title","questions":[{"number":"1","question":"q","model_answer":"a","marks":"2","key_points":["p1"]}],"common_themes":["t1"],"exam_tips":["t1"],"predicted_topics":["t1"]}`

      const ppRes = await fetchWithRetry('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
        body: JSON.stringify({ model, messages: [{ role: 'user', content }], max_tokens: 3000 }),
      })
      const ppData = await ppRes.json()
      const raw = ppData.choices?.[0]?.message?.content?.replace(/```json|```/g, '').trim() || '{}'
      try {
        return res.status(200).json({ result: JSON.parse(raw) })
      } catch {
        return res.status(500).json({ error: 'Failed to parse response' })
      }
    }

    return res.status(400).json({ error: `Invalid mode: ${mode}` })

  } catch (err) {
    console.error('SAGE AI error:', err)
    return res.status(500).json({ error: err.message || 'Internal server error' })
  }
}
