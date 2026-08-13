import { getSupabase } from './supabaseClient'

export interface QuizQuestionOutcome { topic: string; correct: boolean }
export interface QuizResultEntry { id: string; subject: string; score: number; total: number; date: string; source?: string; questions: QuizQuestionOutcome[] }
interface SaveQuizResultInput { subject: string; score: number; total: number; source?: string; questions?: QuizQuestionOutcome[]; userId?: string | null }

export function saveQuizResult(input: SaveQuizResultInput): void {
  try {
    const existing: QuizResultEntry[] = JSON.parse(localStorage.getItem('quizResults') || '[]')
    existing.push({
      id: `qr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      subject: input.subject || 'General', score: input.score, total: input.total,
      date: new Date().toISOString(), source: input.source, questions: input.questions || [],
    })
    localStorage.setItem('quizResults', JSON.stringify(existing))
  } catch (err) { console.error('Failed to save quiz result:', err) }

  if (input.userId && input.questions?.length) {
    logQuizEvidence(input.userId, input.questions).catch(() => {})
  }
}

async function logQuizEvidence(userId: string, questions: QuizQuestionOutcome[]): Promise<void> {
  const client = await getSupabase()
  for (const q of questions) {
    if (!q.topic) continue
    const { data: matches } = await client.from('knowledge_concepts').select('id').eq('user_id', userId).ilike('name', `%${q.topic}%`).limit(1)
    const conceptId = matches?.[0]?.id
    if (!conceptId) continue
    await client.from('mastery_evidence').insert({ concept_id: conceptId, user_id: userId, evidence_type: q.correct ? 'quiz_correct' : 'quiz_incorrect', weight: 1 })
  }
}
