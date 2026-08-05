import { fetchWithRetry } from './_utils/openaiRetry.js'
import { logTokenUsage } from './_utils/tokenLogger.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const { text, image, userId } = req.body
    if (!text?.trim() && !image) return res.status(400).json({ error: 'No content provided' })

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) return res.status(500).json({ error: 'API key not configured' })

    const messages = image
      ? [{
          role: 'user',
          content: [
            { type: 'text', text: 'Summarize the lecture notes in this image into clear bullet points. Keep it under 300 words.' },
            { type: 'image_url', image_url: { url: image } },
          ],
        }]
      : [{
          role: 'system',
          content: 'You are a study assistant for Kenyan university students. Summarize the lecture notes into clear, concise key points under 300 words. Use bullet points.',
        }, {
          role: 'user',
          content: `Summarize these notes:\n\n${text}`,
        }]

    const response = await fetchWithRetry('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: 'gpt-5-mini', messages, max_tokens: 500 }),
    })

    const data = await response.json()
    if (!response.ok) return res.status(response.status).json({ error: data.error?.message || 'Summarization failed' })

    logTokenUsage(userId, 'summarize', 'gpt-5-mini', data.usage)

    return res.status(200).json({ summary: data.choices?.[0]?.message?.content || '' })
  } catch (error) {
    console.error('Summarize error:', error)
    return res.status(500).json({ error: error.message || 'Internal server error' })
  }
}
