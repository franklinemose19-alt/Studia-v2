import { fetchWithRetry } from './_utils/openaiRetry.js'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

async function verifyAdmin(userId) {
  if (!userId) return false
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/users?auth_id=eq.${userId}&is_admin=eq.true&select=auth_id`, {
      headers: {
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        apikey: SUPABASE_SERVICE_KEY,
      },
    })
    const data = await res.json()
    return Array.isArray(data) && data.length > 0
  } catch { return false }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { mode, image, text } = req.body

    if (!OPENAI_API_KEY) return res.status(500).json({ error: 'OpenAI API key not configured' })

    // ── Chat ──────────────────────────────────────────────────────────────
    if (mode === 'chat') {
      const { chatMessages, documentContext, studentContext, chatMode } = req.body
      if (!chatMessages || !Array.isArray(chatMessages)) return res.status(400).json({ error: 'chatMessages required' })

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
          model: 'gpt-5-mini',
          max_tokens: 700,
          messages: [{ role: 'system', content: system }, ...chatMessages.map(m => ({ role: m.role, content: m.content }))],
        }),
      })
      const chatData = await chatRes.json()
      if (!chatData.choices?.[0]?.message?.content) return res.status(500).json({ error: 'Chat response failed' })
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
          model: 'gpt-5-mini',
          max_tokens: 2000,
          response_format: { type: 'json_object' },
          messages: [{
            role: 'system',
            content: `You are SAGE AI Tutor. Generate ${count} flashcards from the provided lecture content for a Kenyan university student.
Return ONLY valid JSON in this exact format:
{
  "flashcards": [
    { "id": "1", "front": "Question or term", "back": "Answer or definition", "topic": "Topic name", "difficulty": "easy|medium|hard" }
  ]
}
Make flashcards that test real understanding, not just memory. Include definitions, concepts, applications, and exam-style questions. Vary difficulty. Cover all major topics.`,
          }, {
            role: 'user',
            content: `Subject: ${subject || 'General'}\n\nLecture Content:\n${lectureContent.slice(0, 4000)}`,
          }],
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
          model: 'gpt-5-mini',
          max_tokens: 3000,
          response_format: { type: 'json_object' },
          messages: [{
            role: 'system',
            content: `You are SAGE AI Tutor. Generate a ${numQuestions}-question mock exam from the lecture content for a Kenyan university student. Simulate a real university exam paper.
Return ONLY valid JSON:
{
  "examTitle": "Mock Exam title",
  "timeAllowed": "number in minutes",
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
  "totalMarks": number
}
Questions should mirror real university exam style and difficulty. Include definitions, applications, analysis, and calculations where relevant.`,
          }, {
            role: 'user',
            content: `Subject: ${subject || 'General'}\n\nLecture Content:\n${lectureContent.slice(0, 4000)}`,
          }],
        }),
      })

      const examData = await examRes.json()
      const raw = examData.choices?.[0]?.message?.content || '{}'
      try {
        const parsed = JSON.parse(raw)
        return res.status(200).json(parsed)
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
          model: 'gpt-5-mini',
          max_tokens: 2000,
          response_format: { type: 'json_object' },
          messages: [{
            role: 'system',
            content: `You are SAGE AI Tutor performing a Knowledge Gap Analysis for a Kenyan university student.
Compare the lecture transcript with the captured notes to detect gaps, weak explanations, and missing concepts.
Return ONLY valid JSON:
{
  "knowledgeCoverage": number (0-100),
  "examReadiness": number (0-100),
  "understandingScore": number (0-100),
  "confidenceScore": number (0-100),
  "coveredConcepts": ["concept 1", "concept 2"],
  "missingConcepts": ["concept A", "concept B"],
  "weakAreas": ["area 1", "area 2"],
  "strongAreas": ["area 1", "area 2"],
  "recommendations": ["Study X topic", "Revise Y concept"],
  "studyNext": "The most important concept to focus on next",
  "examTips": ["Tip 1", "Tip 2", "Tip 3"],
  "topicsMastered": ["topic 1", "topic 2"],
  "summary": "2-sentence assessment of the student's understanding"
}
Be specific and actionable. Base scores on actual content comparison.`,
          }, {
            role: 'user',
            content: `Subject: ${subject || 'General'}\n\nTranscript:\n${(transcript || '').slice(0, 3000)}\n\nStudent Notes:\n${(notes || '').slice(0, 2000)}`,
          }],
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
      if (!content && !existingNotes) return res.status(400).json({ error: 'content required' })
      const inputContent = content || existingNotes

      const deepRes = await fetchWithRetry('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
        body: JSON.stringify({
          model: 'gpt-5-mini',
          max_tokens: 3000,
          response_format: { type: 'json_object' },
          messages: [{
            role: 'system',
            content: `You are SAGE AI Tutor. Create comprehensive, exam-ready deep notes from the provided content for a Kenyan university student.
Return ONLY valid JSON:
{
  "title": "Topic title",
  "subject": "Subject name",
  "overview": "2-3 sentence overview",
  "sections": [
    {
      "heading": "Section heading",
      "explanation": "Detailed explanation",
      "simpleExplanation": "Explain like I'm 16",
      "examples": ["Real-world example 1", "Example 2"],
      "definitions": [{"term": "Term", "definition": "Definition"}],
      "memoryTrick": "Mnemonic or memory trick",
      "commonMistakes": ["Mistake 1", "Mistake 2"],
      "examTips": ["Exam tip 1", "Exam tip 2"],
      "relatedConcepts": ["Concept 1", "Concept 2"],
      "realWorldApplication": "How this applies in the real world"
    }
  ],
  "formulasAndKeyFacts": ["Formula 1", "Key fact 2"],
  "quickRevision": ["Point 1", "Point 2", "Point 3"],
  "predictedExamQuestions": ["Question 1?", "Question 2?"]
}`,
          }, {
            role: 'user',
            content: `Subject: ${subject || 'General'}\n\nContent:\n${inputContent.slice(0, 4000)}`,
          }],
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

    // ── Developer Mode (admin only) ────────────────────────────────────────
    if (mode === 'devmode') {
      const { chatMessages, adminUserId } = req.body
      const isAdmin = await verifyAdmin(adminUserId)
      if (!isAdmin) return res.status(403).json({ error: 'Developer Mode is restricted to admins only.' })
      if (!chatMessages || !Array.isArray(chatMessages)) return res.status(400).json({ error: 'chatMessages required' })

      const devSystem = `You are SAGE Developer Assistant — an expert AI software engineer embedded in STUDIA AI for admin use only. You have deep expertise in:
- React + TypeScript + Vite
- Supabase (Auth, Database, Storage, RLS policies, SQL)
- Vercel serverless functions (Node.js, limitations, cold starts)
- Tailwind CSS
- OpenAI API integration (GPT-5 mini, Whisper, function calling)
- M-Pesa Daraja API integration
- PWA setup with vite-plugin-pwa
- Performance optimization
- Security best practices
- Git/GitHub workflows

When writing code: use TypeScript, follow the existing STUDIA coding style (functional components, hooks, Tailwind), and always consider the Vercel Hobby plan's 12-function limit.
When writing SQL: use PostgreSQL syntax compatible with Supabase, include RLS policies.
Be direct, technical, and precise. This is a developer tool — no need to simplify.`

      const devRes = await fetchWithRetry('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
        body: JSON.stringify({
          model: 'gpt-5-mini',
          max_tokens: 2000,
          messages: [{ role: 'system', content: devSystem }, ...chatMessages.map(m => ({ role: m.role, content: m.content }))],
        }),
      })

      const devData = await devRes.json()
      if (!devData.choices?.[0]?.message?.content) return res.status(500).json({ error: 'Dev mode response failed' })
      return res.status(200).json({ reply: devData.choices[0].message.content })
    }

    // ── SnapSolve ─────────────────────────────────────────────────────────
    if (mode === 'snapsolve') {
      if (!image && !text) return res.status(400).json({ error: 'No image or text provided' })
      const content = image
        ? [{ type: 'image_url', image_url: { url: image } }, { type: 'text', text: `You are SAGE AI Tutor. Analyze this image and provide a detailed solution.
Return JSON: {"question":"extracted question","answer":"detailed step-by-step answer","explanation":"key concepts","revision_notes":"bullet points","quiz":[{"question":"MCQ","options":["A","B","C","D"],"answer":"A"}]}` }]
        : `You are SAGE AI Tutor. Answer: ${text}\nReturn JSON: {"question":"restated question","answer":"detailed answer","explanation":"key concepts","revision_notes":"bullet points","quiz":[{"question":"MCQ","options":["A","B","C","D"],"answer":"A"}]}`

      const snapRes = await fetchWithRetry('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
        body: JSON.stringify({ model: 'gpt-5-mini', messages: [{ role: 'user', content }], max_tokens: 2000 }),
      })
      const snapData = await snapRes.json()
      const raw = snapData.choices?.[0]?.message?.content?.replace(/```json|```/g, '').trim() || '{}'
      try { return res.status(200).json({ result: JSON.parse(raw) }) }
      catch { return res.status(500).json({ error: 'Failed to parse response' }) }
    }

    // ── Past Papers ───────────────────────────────────────────────────────
    if (mode === 'pastpapers') {
      if (!image && !text) return res.status(400).json({ error: 'No content provided' })
      const content = image
        ? [{ type: 'image_url', image_url: { url: image } }, { type: 'text', text: `Analyze this past paper. Return JSON: {"paper_title":"title","questions":[{"number":"1","question":"q","model_answer":"a","marks":"2","key_points":["p1"]}],"common_themes":["t1"],"exam_tips":["t1"],"predicted_topics":["t1"]}` }]
        : `Analyze this past paper:\n${text}\nReturn JSON: {"paper_title":"title","questions":[{"number":"1","question":"q","model_answer":"a","marks":"2","key_points":["p1"]}],"common_themes":["t1"],"exam_tips":["t1"],"predicted_topics":["t1"]}`

      const ppRes = await fetchWithRetry('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
        body: JSON.stringify({ model: 'gpt-5-mini', messages: [{ role: 'user', content }], max_tokens: 3000 }),
      })
      const ppData = await ppRes.json()
      const raw = ppData.choices?.[0]?.message?.content?.replace(/```json|```/g, '').trim() || '{}'
      try { return res.status(200).json({ result: JSON.parse(raw) }) }
      catch { return res.status(500).json({ error: 'Failed to parse response' }) }
    }

    return res.status(400).json({ error: 'Invalid mode' })
  } catch (err) {
    console.error('SAGE AI error:', err)
    return res.status(500).json({ error: err.message || 'Internal server error' })
  }
}
