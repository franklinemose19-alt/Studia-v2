import pdfParse from 'pdf-parse'
import { checkRateLimit } from './_utils/rateLimiter.js'
import { chatCompletion, embed } from './_utils/aiGateway.js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { mode, image, text, userId } = req.body

    const rateCheck = await checkRateLimit(userId, 'ai-tools')
    if (!rateCheck.allowed) {
      return res.status(429).json({
        error: rateCheck.reason === 'missing_user_id' ? 'Authentication required' : `Too many requests — wait ${Math.ceil(rateCheck.retryAfterSeconds / 60)} minute(s).`,
        retryAfterSeconds: rateCheck.retryAfterSeconds,
      })
    }

    // ── Chat ─────────────────────────────────────────────────────────────
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
        general: 'Answer academic questions clearly, including programming/CS/IT questions with real working code. Be encouraging.',
      }
      system += modeInstructions[chatMode] || modeInstructions.general

      try {
        const result = await chatCompletion({
          messages: [{ role: 'system', content: system }, ...chatMessages.map(m => ({ role: m.role, content: m.content }))],
          maxTokens: 900, feature: `chat_${chatMode || 'general'}`, userId,
        })
        return res.status(200).json({ reply: result.content })
      } catch (err) { return res.status(500).json({ error: err.message }) }
    }

    // ── Flashcards ────────────────────────────────────────────────────────
    if (mode === 'flashcards') {
      const { lectureContent, subject, count = 12 } = req.body
      if (!lectureContent) return res.status(400).json({ error: 'lectureContent required' })
      try {
        const result = await chatCompletion({
          messages: [
            { role: 'system', content: `Generate ${count} flashcards. Return JSON: {"flashcards":[{"id":"1","front":"Q","back":"A","topic":"T","difficulty":"easy|medium|hard"}]}` },
            { role: 'user', content: `Subject: ${subject || 'General'}\n\n${lectureContent.slice(0, 4000)}` },
          ],
          maxTokens: 2000, responseFormat: { type: 'json_object' }, feature: 'flashcards', userId,
        })
        return res.status(200).json({ flashcards: JSON.parse(result.content).flashcards || [] })
      } catch (err) { return res.status(500).json({ error: err.message || 'Failed to generate flashcards' }) }
    }

    // ── Mock Exam ─────────────────────────────────────────────────────────
    if (mode === 'mockexam') {
      const { lectureContent, subject, numQuestions = 10 } = req.body
      if (!lectureContent) return res.status(400).json({ error: 'lectureContent required' })
      try {
        const result = await chatCompletion({
          messages: [
            { role: 'system', content: `Generate a ${numQuestions}-question university-style mock exam. Return JSON: {"examTitle":"T","timeAllowed":"30","questions":[{"id":"1","question":"Q","options":["A","B","C","D"],"correct":0,"explanation":"E","marks":2,"topic":"T","difficulty":"easy|medium|hard"}],"totalMarks":20}` },
            { role: 'user', content: `Subject: ${subject || 'General'}\n\n${lectureContent.slice(0, 4000)}` },
          ],
          maxTokens: 3000, responseFormat: { type: 'json_object' }, feature: 'mock_exam', userId,
        })
        return res.status(200).json(JSON.parse(result.content))
      } catch (err) { return res.status(500).json({ error: err.message || 'Failed to generate exam' }) }
    }

    // ── Knowledge Gap ─────────────────────────────────────────────────────
    if (mode === 'knowledgegap') {
      const { transcript, notes, subject } = req.body
      const hasTranscript = !!(transcript?.trim())
      const hasNotes = !!(notes?.trim())
      if (!hasTranscript && !hasNotes) return res.status(400).json({ error: 'At least notes or transcript is required' })
      const userContent = hasTranscript && hasNotes
        ? `Subject: ${subject || 'General'}\n\nTranscript:\n${transcript.slice(0, 3000)}\n\nStudent Notes:\n${notes.slice(0, 2000)}`
        : hasNotes ? `Subject: ${subject || 'General'}\n\nStudent Notes (no transcript — analyze notes alone):\n${notes.slice(0, 4000)}`
        : `Subject: ${subject || 'General'}\n\nTranscript (no notes — estimate coverage):\n${transcript.slice(0, 4000)}`
      try {
        const result = await chatCompletion({
          messages: [
            { role: 'system', content: `You are SAGE performing a Knowledge Gap Analysis. ${hasTranscript && hasNotes ? 'Compare transcript with notes.' : hasNotes ? 'Analyze notes alone.' : 'Estimate coverage from transcript.'} Return ONLY valid JSON: {"knowledgeCoverage":75,"examReadiness":65,"understandingScore":70,"confidenceScore":60,"coveredConcepts":["c1"],"missingConcepts":["cA"],"weakAreas":["a1"],"strongAreas":["a1"],"recommendations":["Study X"],"studyNext":"Most important concept","examTips":["Tip1"],"topicsMastered":["t1"],"summary":"2-sentence assessment"}` },
            { role: 'user', content: userContent },
          ],
          maxTokens: 2000, responseFormat: { type: 'json_object' }, feature: 'knowledge_gap', userId,
        })
        return res.status(200).json(JSON.parse(result.content))
      } catch (err) { return res.status(500).json({ error: err.message || 'Failed to analyze knowledge gaps' }) }
    }

    // ── Deep Notes ────────────────────────────────────────────────────────
    if (mode === 'deepnotes') {
      const { content, subject, existingNotes } = req.body
      const inputContent = content || existingNotes
      if (!inputContent) return res.status(400).json({ error: 'content required' })
      try {
        const result = await chatCompletion({
          messages: [
            { role: 'system', content: `You are SAGE AI Tutor. Create comprehensive deep notes. Use $...$ for inline math where relevant. Return ONLY valid JSON: {"title":"T","subject":"S","overview":"2-3 sentences","sections":[{"heading":"H","explanation":"E","simpleExplanation":"Simple","examples":["Ex"],"definitions":[{"term":"T","definition":"D"}],"memoryTrick":"M","commonMistakes":["M"],"examTips":["T"],"relatedConcepts":["C"],"realWorldApplication":"R"}],"formulasAndKeyFacts":["F"],"quickRevision":["P"],"predictedExamQuestions":["Q?"]}` },
            { role: 'user', content: `Subject: ${subject || 'General'}\n\n${inputContent.slice(0, 4000)}` },
          ],
          maxTokens: 3000, responseFormat: { type: 'json_object' }, feature: 'deep_notes', userId,
        })
        return res.status(200).json(JSON.parse(result.content))
      } catch (err) { return res.status(500).json({ error: err.message || 'Failed to generate deep notes' }) }
    }

    // ── Study Coach ───────────────────────────────────────────────────────
    if (mode === 'coach') {
      const { studentContext, question } = req.body
      try {
        const result = await chatCompletion({
          messages: [
            { role: 'system', content: `You are SAGE's Study Coach. Give a short, honest status update and one specific, actionable recommendation. Don't inflate progress that isn't there. Return ONLY valid JSON: {"message":"1-2 sentence honest status update","recommendation":"one specific actionable piece of advice","suggestedAction":"a concrete next step"}` },
            { role: 'user', content: `${studentContext || 'No study data yet.'}\n\n${question ? `Student asked: ${question}` : 'Give a general progress check-in.'}` },
          ],
          maxTokens: 500, responseFormat: { type: 'json_object' }, feature: 'study_coach', userId,
        })
        return res.status(200).json(JSON.parse(result.content))
      } catch (err) { return res.status(500).json({ error: err.message || 'Failed to generate coaching advice' }) }
    }

    // ── SnapSolve ─────────────────────────────────────────────────────────
    if (mode === 'snapsolve') {
      if (!image && !text) return res.status(400).json({ error: 'No image or text provided' })
      const { documentContext } = req.body
      const codeNote = 'If this is a programming/coding question, write real working code inside markdown code fences with the language name. If math is involved, use $...$ / $$...$$ KaTeX syntax.'
      const ctxNote = documentContext ? `The student has this lecture context available — use it if relevant, ignore if unrelated:\n${documentContext.slice(0, 1500)}\n\n` : ''
      const content = image
        ? [{ type: 'image_url', image_url: { url: image } }, { type: 'text', text: `${ctxNote}Analyze and solve. ${codeNote} Return JSON only: {"question":"Q","answer":"step-by-step answer","explanation":"key concepts"}` }]
        : `${ctxNote}Solve: ${text}\n${codeNote}\nReturn JSON only: {"question":"Q","answer":"answer","explanation":"concepts"}`
      try {
        const result = await chatCompletion({ messages: [{ role: 'user', content }], maxTokens: 2000, feature: 'snapsolve', userId })
        const raw = result.content.replace(/```json|```/g, '').trim()
        return res.status(200).json({ result: JSON.parse(raw) })
      } catch (err) { return res.status(500).json({ error: err.message || 'Failed to parse response' }) }
    }

    // ── Past Papers ───────────────────────────────────────────────────────
    if (mode === 'pastpapers') {
      const { pdfBase64 } = req.body
      if (!image && !text && !pdfBase64) return res.status(400).json({ error: 'No content provided' })
      let sourceText = text
      if (pdfBase64) {
        try { sourceText = (await pdfParse(Buffer.from(pdfBase64, 'base64'))).text }
        catch { return res.status(500).json({ error: 'Could not read the uploaded PDF' }) }
      }
      const promptInstructions = `Analyze this past paper. Extract real questions and give model answers. Return JSON only: {"paper_title":"T","questions":[{"number":"1","question":"Q","model_answer":"A","marks":"2","key_points":["P"]}],"common_themes":["T"],"exam_tips":["T"],"predicted_topics":["T"]}`
      const content = image
        ? [{ type: 'image_url', image_url: { url: image } }, { type: 'text', text: promptInstructions }]
        : `${promptInstructions}\n\nPast paper content:\n\n${(sourceText || '').slice(0, 9000)}`
      try {
        const result = await chatCompletion({ messages: [{ role: 'user', content }], maxTokens: 3000, feature: 'past_papers', userId })
        const raw = result.content.replace(/```json|```/g, '').trim()
        return res.status(200).json({ result: JSON.parse(raw) })
      } catch (err) { return res.status(500).json({ error: err.message || 'Failed to parse response' }) }
    }

    // ── Language View ─────────────────────────────────────────────────────
    if (mode === 'language_view') {
      const { sourceText, targetView } = req.body
      if (!sourceText?.trim()) return res.status(400).json({ error: 'sourceText required' })
      if (!['academic_english', 'simple_kiswahili', 'simple_english'].includes(targetView)) return res.status(400).json({ error: 'Invalid targetView' })
      const viewPrompts = {
        academic_english: 'Rewrite this lecture content as accurate academic English, preserving all technical terminology precisely. Same structure and detail — a translation/formalization, not a simplification.',
        simple_kiswahili: 'Rewrite this lecture content in simple, everyday Kiswahili, the way you would explain it to a friend. Keep important technical terms in original form if translating would confuse rather than help.',
        simple_english: 'Rewrite this lecture content in simple, everyday English, the way you would explain it to a friend. Keep important technical terms but explain them simply.',
      }
      try {
        const result = await chatCompletion({
          messages: [{ role: 'system', content: viewPrompts[targetView] }, { role: 'user', content: sourceText.slice(0, 6000) }],
          maxTokens: 2500, feature: `language_view_${targetView}`, userId,
        })
        return res.status(200).json({ text: result.content })
      } catch (err) { return res.status(500).json({ error: err.message || 'Failed to generate language view' }) }
    }

    // ── Extract Concepts (Knowledge Map) ────────────────────────────────────
    if (mode === 'extract_concepts') {
      const { lectureContent, subject, sourceLabel, sourceId, courseName } = req.body
      if (!lectureContent?.trim()) return res.status(400).json({ error: 'lectureContent required' })
      if (!userId) return res.status(400).json({ error: 'userId required for knowledge map' })

      let candidates
      try {
        const extractResult = await chatCompletion({
          messages: [
            { role: 'system', content: `Extract the 3-8 most important academic concepts taught in this lecture. For each, give a short canonical name (as it would appear in a textbook index, in English even if the lecture was in Kiswahili), a one-sentence description, and a short relevant excerpt. Also identify any concepts this lecture clearly depends on that were NOT covered here. Return ONLY valid JSON: {"concepts":[{"name":"Concept Name","description":"One sentence","excerpt":"Short excerpt"}],"likelyPrerequisites":["Prerequisite concept name"]}` },
            { role: 'user', content: `Subject: ${subject || courseName || 'General'}\n\n${lectureContent.slice(0, 6000)}` },
          ],
          maxTokens: 1500, responseFormat: { type: 'json_object' }, feature: 'extract_concepts', userId,
        })
        candidates = JSON.parse(extractResult.content)
      } catch (err) { return res.status(500).json({ error: err.message || 'Failed to extract concepts' }) }

      const conceptCandidates = candidates.concepts || []
      const likelyPrerequisites = candidates.likelyPrerequisites || []
      if (conceptCandidates.length === 0) return res.status(200).json({ concepts: [], prerequisiteWarnings: [] })

      let embeddings
      try {
        const embedResult = await embed({ input: conceptCandidates.map(c => `${c.name}: ${c.description}`), feature: 'concept_embedding', userId })
        embeddings = embedResult.embeddings
      } catch (err) { return res.status(500).json({ error: err.message || 'Failed to generate embeddings' }) }

      const results = []
      for (let i = 0; i < conceptCandidates.length; i++) {
        const candidate = conceptCandidates[i]
        const embedding = embeddings[i]
        if (!embedding) continue

        const matchRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/match_concepts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, apikey: SUPABASE_SERVICE_KEY },
          body: JSON.stringify({ query_embedding: embedding, match_user_id: userId, match_count: 3 }),
        })
        const matches = await matchRes.json()
        const topMatch = Array.isArray(matches) && matches.length > 0 ? matches[0] : null

        let action, conceptId

        if (topMatch && topMatch.similarity >= 0.88) {
          action = 'matched'; conceptId = topMatch.id
        } else if (topMatch && topMatch.similarity >= 0.72) {
          try {
            const judgeResult = await chatCompletion({
              messages: [
                { role: 'system', content: `Are these the same academic concept? Return ONLY JSON: {"same": true|false, "confidence": "high"|"medium"|"low"}` },
                { role: 'user', content: `Concept A: ${candidate.name} — ${candidate.description}\nConcept B: ${topMatch.name} — ${topMatch.description || ''}` },
              ],
              maxTokens: 150, responseFormat: { type: 'json_object' }, feature: 'concept_match_judge', userId,
            })
            const judgment = JSON.parse(judgeResult.content)
            if (judgment.same) { action = 'matched'; conceptId = topMatch.id } else { action = 'new' }
          } catch { action = 'new' }
        } else {
          action = 'new'
        }

        if (action === 'new') {
          const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/knowledge_concepts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, apikey: SUPABASE_SERVICE_KEY, Prefer: 'return=representation' },
            body: JSON.stringify({ user_id: userId, name: candidate.name, subject: subject || courseName || 'General', description: candidate.description, embedding }),
          })
          const inserted = await insertRes.json()
          conceptId = Array.isArray(inserted) ? inserted[0]?.id : inserted?.id
        }

        if (conceptId) {
          await fetch(`${SUPABASE_URL}/rest/v1/concept_sources`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, apikey: SUPABASE_SERVICE_KEY, Prefer: 'return=minimal' },
            body: JSON.stringify({ concept_id: conceptId, user_id: userId, source_type: 'lecture', source_id: sourceId || null, source_label: sourceLabel || courseName || 'Lecture', excerpt: candidate.excerpt || '' }),
          }).catch(() => {})
          await fetch(`${SUPABASE_URL}/rest/v1/knowledge_concepts?id=eq.${conceptId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, apikey: SUPABASE_SERVICE_KEY },
            body: JSON.stringify({ last_reviewed_at: new Date().toISOString(), updated_at: new Date().toISOString() }),
          }).catch(() => {})
        }
        results.push({ name: candidate.name, action, conceptId })
      }

      let prerequisiteWarnings = []
      if (likelyPrerequisites.length > 0) {
        const namesFilter = likelyPrerequisites.map(n => encodeURIComponent(n)).join(',')
        try {
          const prereqRes = await fetch(`${SUPABASE_URL}/rest/v1/knowledge_concepts?user_id=eq.${userId}&name=in.(${namesFilter})&select=id,name,mastery`, {
            headers: { Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, apikey: SUPABASE_SERVICE_KEY },
          })
          const prereqData = await prereqRes.json()
          if (Array.isArray(prereqData)) prerequisiteWarnings = prereqData.filter(p => p.mastery < 50).map(p => ({ id: p.id, concept: p.name, mastery: p.mastery }))
          const prereqIds = prereqData?.map(p => p.id).filter(Boolean) || []
          for (const result of results) {
            if (!result.conceptId) continue
            for (const prereqId of prereqIds) {
              if (prereqId === result.conceptId) continue
              await fetch(`${SUPABASE_URL}/rest/v1/concept_relationships`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, apikey: SUPABASE_SERVICE_KEY, Prefer: 'return=minimal' },
                body: JSON.stringify({ user_id: userId, concept_id: result.conceptId, related_concept_id: prereqId, relationship_type: 'prerequisite', confidence: 'suggested' }),
              }).catch(() => {})
            }
          }
        } catch { /* non-critical */ }
      }

      return res.status(200).json({ concepts: results, prerequisiteWarnings })
    }

    // ── Knowledge Recall ──────────────────────────────────────────────────
    if (mode === 'knowledge_recall') {
      const { query } = req.body
      if (!query?.trim()) return res.status(400).json({ error: 'query required' })
      if (!userId) return res.status(400).json({ error: 'userId required' })

      let queryEmbedding
      try {
        const embedResult = await embed({ input: query, feature: 'knowledge_recall_query', userId })
        queryEmbedding = embedResult.embeddings[0]
      } catch (err) { return res.status(500).json({ error: err.message || 'Failed to process query' }) }

      const matchRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/match_concepts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, apikey: SUPABASE_SERVICE_KEY },
        body: JSON.stringify({ query_embedding: queryEmbedding, match_user_id: userId, match_count: 1 }),
      })
      const matches = await matchRes.json()
      const concept = Array.isArray(matches) && matches.length > 0 ? matches[0] : null

      if (!concept || concept.similarity < 0.5) {
        return res.status(200).json({ found: false, message: "I don't have anything in your knowledge map matching that yet — record a lecture covering it and I'll remember it going forward." })
      }

      const [sourcesRes, conceptRes] = await Promise.all([
        fetch(`${SUPABASE_URL}/rest/v1/concept_sources?concept_id=eq.${concept.id}&user_id=eq.${userId}&select=source_type,source_label,excerpt,created_at&order=created_at.asc`, { headers: { Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, apikey: SUPABASE_SERVICE_KEY } }),
        fetch(`${SUPABASE_URL}/rest/v1/knowledge_concepts?id=eq.${concept.id}&select=mastery`, { headers: { Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, apikey: SUPABASE_SERVICE_KEY } }),
      ])
      const sources = await sourcesRes.json()
      const conceptRow = await conceptRes.json()
      const mastery = conceptRow?.[0]?.mastery ?? 0
      const sourcesSummary = Array.isArray(sources) ? sources.map(s => `- ${s.source_label} (${s.source_type}): ${s.excerpt}`).join('\n') : ''

      try {
        const result = await chatCompletion({
          messages: [
            { role: 'system', content: `You are SAGE recalling what a student has learned about "${concept.name}" across their whole academic history. Synthesize the sources below into one coherent answer — don't just list them. Mention their current mastery level (${mastery}%) naturally, and note what they still seem weak on if mastery is below 60%.` },
            { role: 'user', content: `Concept: ${concept.name}\nDescription: ${concept.description || ''}\n\nEverywhere this appeared:\n${sourcesSummary || 'No detailed source history yet.'}` },
          ],
          maxTokens: 700, feature: 'knowledge_recall', userId,
        })
        return res.status(200).json({ found: true, conceptName: concept.name, mastery, reply: result.content, sourceCount: Array.isArray(sources) ? sources.length : 0 })
      } catch (err) { return res.status(500).json({ error: err.message || 'Failed to recall knowledge' }) }
    }

    return res.status(400).json({ error: `Invalid mode: ${mode}` })
  } catch (err) {
    console.error('SAGE AI error:', err)
    return res.status(500).json({ error: err.message || 'Internal server error' })
  }
}
