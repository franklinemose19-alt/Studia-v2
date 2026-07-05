export interface StudentContextData {
  units: string[]
  recentWeakTopics: string[]
  recentQuizScores: { subject: string; percentage: number }[]
  totalLectures: number
  totalQuizzes: number
  currentPlan: string | null
}

export function buildStudentContext(currentPlan?: string | null): StudentContextData {
  let units: any[] = []
  let quizResults: any[] = []
  let recordings: any[] = []

  try { units = JSON.parse(localStorage.getItem('units') || '[]') } catch {}
  try { quizResults = JSON.parse(localStorage.getItem('quizResults') || '[]') } catch {}
  try { recordings = JSON.parse(localStorage.getItem('recordingsMetadata') || '[]') } catch {}

  const topicStats: Record<string, { correct: number; total: number }> = {}
  quizResults.forEach((q: any) => {
    if (Array.isArray(q.questions)) {
      q.questions.forEach((ques: any) => {
        if (!ques.topic) return
        if (!topicStats[ques.topic]) topicStats[ques.topic] = { correct: 0, total: 0 }
        topicStats[ques.topic].total++
        if (ques.correct) topicStats[ques.topic].correct++
      })
    }
  })

  const weakTopics = Object.entries(topicStats)
    .filter(([, s]) => s.total >= 2 && s.correct / s.total < 0.6)
    .sort((a, b) => (a[1].correct / a[1].total) - (b[1].correct / b[1].total))
    .slice(0, 5)
    .map(([topic]) => topic)

  const recentScores = quizResults.slice(0, 5).map((q: any) => ({
    subject: q.subject || 'General',
    percentage: q.total > 0 ? Math.round((q.score / q.total) * 100) : 0,
  }))

  return {
    units: units.map((u: any) => `${u.course} — ${u.unitName}`).slice(0, 8),
    recentWeakTopics: weakTopics,
    recentQuizScores: recentScores,
    totalLectures: recordings.length,
    totalQuizzes: quizResults.length,
    currentPlan: currentPlan || null,
  }
}

export function formatContextForAI(ctx: StudentContextData): string {
  if (!ctx.units.length && !ctx.totalLectures && !ctx.totalQuizzes) return ''

  const lines: string[] = ['[Student Learning Profile]']
  if (ctx.currentPlan) lines.push(`Plan: ${ctx.currentPlan}`)
  if (ctx.units.length) lines.push(`Currently studying: ${ctx.units.slice(0, 5).join(', ')}`)
  if (ctx.recentWeakTopics.length) lines.push(`Known weak topics: ${ctx.recentWeakTopics.join(', ')}`)
  if (ctx.recentQuizScores.length) {
    const avg = Math.round(ctx.recentQuizScores.reduce((s, q) => s + q.percentage, 0) / ctx.recentQuizScores.length)
    lines.push(`Recent quiz average: ${avg}% across ${ctx.totalQuizzes} quiz${ctx.totalQuizzes !== 1 ? 'zes' : ''}`)
  }
  if (ctx.totalLectures) lines.push(`Lectures recorded: ${ctx.totalLectures}`)
  lines.push('[End Profile]')
  return lines.join('\n')
}
