import { fetchWithRetry } from './_utils/openaiRetry.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  try {
    const { transcript, courseName, unitName } = req.body
    if (!transcript || !transcript.trim()) {
      return res.status(400).json({ error: 'No transcript provided' })
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return res.status(500).json({ error: 'API key not configured' })
    }

    const systemPrompt = `You are STUDIA Smart Ink, an AI that converts lecture transcripts into beautifully structured, exam-focused study notes for Kenyan university students across ALL subjects (medicine, law, engineering, business, science, humanities, etc).

Think like the best student in class taking notes. Adapt entirely to the actual subject matter — do NOT force medical categories onto non-medical content.

Return ONLY valid JSON (no markdown fences, no explanation) in this exact shape:
{
  "title": "Short descriptive title for this lecture",
  "subjectArea": "Medicine | Law | Engineering | Business | Computer Science | Economics | Science | Humanities | General",
  "sections": [
    { "type": "heading", "text": "MAIN TOPIC" },
    { "type": "subheading", "text": "Subtopic name" },
    { "type": "paragraph", "text": "Explanation. Wrap key terms in **double asterisks**." },
    { "type": "definition", "text": "Term: clear definition" },
    { "type": "example", "text": "A concrete example or application" },
    { "type": "examtip", "text": "A high-yield exam-ready point" },
    { "type": "summary", "text": "Concise recap" },
    { "type": "table", "headers": ["Col A", "Col B"], "rows": [["val", "val"]] },
    {
      "type": "flowchart",
      "title": "Short chart title",
      "nodes": [
        { "id": "1", "label": "Step 1", "sublabel": "optional detail", "shape": "rect|diamond|oval" },
        { "id": "2", "label": "Step 2", "sublabel": "", "shape": "rect" }
      ],
      "edges": [
        { "from": "1", "to": "2", "label": "optional arrow label" }
      ]
    }
  ],
  "quickRevision": {
    "topFacts": ["fact 1", "fact 2", "fact 3"],
    "keyTerms": ["term 1", "term 2", "term 3"],
    "commonMistakes": ["a common mistake students make"]
  }
}

Rules:
- Use "flowchart" sections for processes, cause-effect chains, classifications, or step-by-step procedures. Max 8 nodes per chart. Limit to 1-2 flowcharts per lecture.
- Use "table" for genuine comparisons or classifications — only when it truly fits.
- Use "examtip" sparingly — only genuinely high-yield points.
- Keep paragraphs concise — a few sentences max.
- Produce 6-16 sections total. Include quickRevision always.
- node "shape": use "rect" for steps/concepts, "diamond" for decisions/conditions, "oval" for start/end points.`

    const response = await fetchWithRetry('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        max_tokens: 4000,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `Generate Smart Ink notes from this lecture transcript.
${courseName ? `Course: ${courseName}` : ''}
${unitName ? `Unit: ${unitName}` : ''}

Transcript:
${transcript}`,
          },
        ],
      }),
    })

    const data = await response.json()
    if (!response.ok) {
      console.error('OpenAI Error:', data)
      return res.status(response.status).json({ error: data.error?.message || 'Notes generation failed' })
    }

    const raw = data.choices?.[0]?.message?.content || ''
    let structured
    try {
      structured = JSON.parse(raw)
    } catch (parseErr) {
      console.error('Smart Ink JSON parse error:', parseErr)
      return res.status(200).json({ notes: raw, structured: null })
    }

    const plainText = flattenToPlainText(structured)
    return res.status(200).json({ notes: plainText, structured })
  } catch (error) {
    console.error('Lecture notes generation error:', error)
    return res.status(500).json({ error: error.message || 'Internal server error' })
  }
}

function flattenToPlainText(structured) {
  if (!structured || !Array.isArray(structured.sections)) return ''
  const lines = []
  if (structured.title) lines.push(structured.title, '')
  for (const s of structured.sections) {
    const clean = (s.text || '').replace(/\*\*/g, '')
    if (s.type === 'heading') lines.push(`## ${clean}`, '')
    else if (s.type === 'subheading') lines.push(`### ${clean}`, '')
    else if (s.type === 'definition') lines.push(`Definition: ${clean}`, '')
    else if (s.type === 'example') lines.push(`Example: ${clean}`, '')
    else if (s.type === 'examtip') lines.push(`⭐ Exam Tip: ${clean}`, '')
    else if (s.type === 'summary') lines.push(`Summary: ${clean}`, '')
    else if (s.type === 'table' && s.headers && s.rows) {
      lines.push(s.headers.join(' | '))
      s.rows.forEach((r) => lines.push(r.join(' | ')))
      lines.push('')
    } else if (s.type === 'flowchart' && s.nodes) {
      lines.push(`[Diagram: ${s.title || 'Flow'}]`)
      s.nodes.forEach((n) => lines.push(`  → ${n.label}${n.sublabel ? ': ' + n.sublabel : ''}`))
      lines.push('')
    } else if (clean) lines.push(clean, '')
  }
  if (structured.quickRevision) {
    if (structured.quickRevision.topFacts?.length) {
      lines.push('Quick Revision:')
      structured.quickRevision.topFacts.forEach((f) => lines.push(`• ${f}`))
      lines.push('')
    }
    if (structured.quickRevision.keyTerms?.length) {
      lines.push('Key Terms: ' + structured.quickRevision.keyTerms.join(', '))
    }
  }
  return lines.join('\n')
}
