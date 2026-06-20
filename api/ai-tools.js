export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { mode, image, text } = req.body
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY

    if (!OPENAI_API_KEY) {
      return res.status(500).json({ error: 'OpenAI API key not configured' })
    }

    let messages
    const model = image ? 'gpt-4o' : 'gpt-4o-mini'

    if (mode === 'snapsolve') {
      if (!image && !text) return res.status(400).json({ error: 'No image or text provided' })
      const content = image
        ? [
            { type: 'image_url', image_url: { url: image } },
            {
              type: 'text',
              text: `You are an expert academic tutor. Look at this image which may contain a question, assignment, past paper, whiteboard, or handwritten notes.

Respond with a JSON object in this exact format:
{
  "question": "The extracted question or topic from the image",
  "answer": "A detailed, step-by-step answer or solution",
  "explanation": "A clear explanation of the key concepts involved",
  "revision_notes": "Quick bullet-point revision notes on this topic",
  "quiz": [
    { "question": "Related MCQ question", "options": ["A", "B", "C", "D"], "answer": "A" },
    { "question": "Related MCQ question", "options": ["A", "B", "C", "D"], "answer": "B" }
  ]
}

Only respond with the JSON object, nothing else.`,
            },
          ]
        : `You are an expert academic tutor. The student has typed this question or topic:\n\n${text}\n\nRespond with a JSON object in this exact format:
{
  "question": "The question or topic, restated clearly",
  "answer": "A detailed, step-by-step answer or solution",
  "explanation": "A clear explanation of the key concepts involved",
  "revision_notes": "Quick bullet-point revision notes on this topic",
  "quiz": [
    { "question": "Related MCQ question", "options": ["A", "B", "C", "D"], "answer": "A" },
    { "question": "Related MCQ question", "options": ["A", "B", "C", "D"], "answer": "B" }
  ]
}

Only respond with the JSON object, nothing else.`

      messages = [{ role: 'user', content }]
    } else if (mode === 'pastpapers') {
      if (!image && !text) return res.status(400).json({ error: 'No content provided' })
      const content = image
        ? [
            { type: 'image_url', image_url: { url: image } },
            {
              type: 'text',
              text: `You are an expert academic examiner. Analyze this past paper image.

Respond with a JSON object in this exact format:
{
  "paper_title": "Title or subject of the paper",
  "questions": [
    {
      "number": "1",
      "question": "The question text",
      "model_answer": "A detailed model answer",
      "marks": "Estimated marks",
      "key_points": ["Key point 1", "Key point 2"]
    }
  ],
  "common_themes": ["Theme 1", "Theme 2", "Theme 3"],
  "exam_tips": ["Tip 1", "Tip 2", "Tip 3"],
  "predicted_topics": ["Topic likely to appear", "Topic 2"]
}

Only respond with the JSON object, nothing else.`,
            },
          ]
        : `You are an expert academic examiner. Analyze this past paper content:\n\n${text}\n\nRespond with a JSON object in this exact format:
{
  "paper_title": "Title or subject of the paper",
  "questions": [
    {
      "number": "1",
      "question": "The question text",
      "model_answer": "A detailed model answer",
      "marks": "Estimated marks",
      "key_points": ["Key point 1", "Key point 2"]
    }
  ],
  "common_themes": ["Theme 1", "Theme 2", "Theme 3"],
  "exam_tips": ["Tip 1", "Tip 2", "Tip 3"],
  "predicted_topics": ["Topic likely to appear", "Topic 2"]
}

Only respond with the JSON object, nothing else.`

      messages = [{ role: 'user', content }]
    } else if (mode === 'deepnotes') {
      if (!text && !image) return res.status(400).json({ error: 'No content provided' })
      const content = image
        ? [
            { type: 'image_url', image_url: { url: image } },
            {
              type: 'text',
              text: `You are an expert academic note-taker and tutor. Read this image of notes or study material.

Respond with a JSON object in this exact format:
{
  "title": "Title of the topic",
  "subject": "Subject/course area",
  "overview": "A 2-3 sentence overview of the topic",
  "deep_notes": [
    {
      "heading": "Section heading",
      "content": "Detailed expanded explanation of this section",
      "examples": ["Example 1", "Example 2"],
      "key_terms": ["Term: Definition", "Term: Definition"]
    }
  ],
  "summary": "A concise summary of everything covered",
  "revision_checklist": ["Point to remember 1", "Point to remember 2"],
  "further_reading": ["Topic to explore 1", "Topic to explore 2"]
}

Only respond with the JSON object, nothing else.`,
            },
          ]
        : `You are an expert academic note-taker. Expand these notes into deep study material:\n\n${text}\n\nRespond with a JSON object in this exact format:
{
  "title": "Title of the topic",
  "subject": "Subject/course area",
  "overview": "A 2-3 sentence overview",
  "deep_notes": [
    {
      "heading": "Section heading",
      "content": "Detailed expanded explanation",
      "examples": ["Example 1", "Example 2"],
      "key_terms": ["Term: Definition"]
    }
  ],
  "summary": "Concise summary",
  "revision_checklist": ["Point 1", "Point 2"],
  "further_reading": ["Topic 1", "Topic 2"]
}

Only respond with the JSON object, nothing else.`

      messages = [{ role: 'user', content }]
    } else {
      return res.status(400).json({ error: 'Invalid mode' })
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: 3000,
      }),
    })

    const data = await response.json()

    if (!data.choices?.[0]?.message?.content) {
      console.error('OpenAI error:', JSON.stringify(data))
      return res.status(500).json({ error: data.error?.message || 'Failed to process' })
    }

    const raw = data.choices[0].message.content.replace(/```json|```/g, '').trim()

    let parsed
    try {
      parsed = JSON.parse(raw)
    } catch (parseErr) {
      console.error('JSON parse error:', parseErr, 'Raw:', raw)
      return res.status(500).json({ error: 'AI response could not be parsed. Please try again.' })
    }

    return res.status(200).json({ result: parsed })
  } catch (err) {
    console.error('AI Tools error:', err)
    return res.status(500).json({ error: err.message || 'Internal server error' })
  }
}
