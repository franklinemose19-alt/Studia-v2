import { fetchWithRetry } from './_utils/openaiRetry.js'
import { logTokenUsage } from './_utils/tokenLogger.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const { image, userId } = req.body
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) return res.status(500).json({ error: 'API key not configured' })
    if (!image) return res.status(400).json({ error: 'No image provided' })

    const response = await fetchWithRetry('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'gpt-5-mini',
        messages: [{
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: image } },
            { type: 'text', text: `Extract and structure the content from this image into clean notes.
Return JSON only: {"title":"Short title","course":"Subject if identifiable or empty","content":"Full structured notes"}` },
          ],
        }],
        max_tokens: 1500,
      }),
    })

    const data = await response.json()
    if (!data.choices?.[0]?.message?.content) {
      return res.status(500).json({ error: 'Failed to generate notes' })
    }

    logTokenUsage(userId, 'snap_generate_notes', 'gpt-5-mini', data.usage)

    const raw = data.choices[0].message.content.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(raw)
    return res.status(200).json({
      title: parsed.title || 'Untitled Notes',
      course: parsed.course || '',
      content: parsed.content || '',
    })
  } catch (err) {
    console.error('Generate notes error:', err)
    return res.status(500).json({ error: err.message || 'Internal server error' })
  }
}
