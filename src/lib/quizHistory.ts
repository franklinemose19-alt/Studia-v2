export interface QuizQuestionOutcome {
  topic: string
  correct: boolean
}

export interface QuizResultEntry {
  id: string
  subject: string
  score: number
  total: number
  date: string
  source?: string
  questions: QuizQuestionOutcome[]
}

interface SaveQuizResultInput {
  subject: string
  score: number
  total: number
  source?: string
  questions?: QuizQuestionOutcome[]
}

// Every quiz-taking surface must go through this — AdaptiveLearning.tsx
// depends on this exact shape, and drift here is what broke it last time.
export function saveQuizResult(input: SaveQuizResultInput): void {
  try {
    const existing: QuizResultEntry[] = JSON.parse(localStorage.getItem('quizResults') || '[]')
    existing.push({
      id: `qr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      subject: input.subject || 'General',
      score: input.score,
      total: input.total,
      date: new Date().toISOString(),
      source: input.source,
      questions: input.questions || [],
    })
    localStorage.setItem('quizResults', JSON.stringify(existing))
  } catch (err) {
    console.error('Failed to save quiz result:', err)
  }
}
