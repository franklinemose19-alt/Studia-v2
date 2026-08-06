export interface StudentContext {
  currentPlan: string | null
  quizHistory: { score: number; total: number; subject: string }[]
  weakTopics: string[]
  strongTopics: string[]
  studiedSubjects: string[]
  totalLectures: number
  averageScore: number
}

export function buildStudentContext(currentPlan: string | null): StudentContext {
  let quizHistory: any[] = []
  let totalLectures = 0

  try { quizHistory = JSON.parse(localStorage.getItem('quizResults') || '[]') } catch {}
  try { totalLectures = JSON.parse(localStorage.getItem('recordingsMetadata') || '[]').length } catch {}

  const averageScore = quizHistory.length > 0
    ? Math.round(quizHistory.reduce((s, q) => s + (q.total > 0 ? (q.score / q.total) * 100 : 0), 0) / quizHistory.length)
    : 0

  const subjectScores: Record<string, { total: number; count: number }> = {}
  quizHistory.forEach(q => {
    if (!q.subject) return
    if (!subjectScores[q.subject]) subjectScores[q.subject] = { total: 0, count: 0 }
    subjectScores[q.subject].total += q.total > 0 ? (q.score / q.total) * 100 : 0
    subjectScores[q.subject].count++
  })

  const subjectAvgs = Object.entries(subjectScores).map(([s, d]) => ({ subject: s, avg: Math.round(d.total / d.count) }))
  const weakTopics = subjectAvgs.filter(s => s.avg < 60).map(s => s.subject)
  const strongTopics = subjectAvgs.filter(s => s.avg >= 80).map(s => s.subject)
  const studiedSubjects = [...new Set(quizHistory.map(q => q.subject).filter(Boolean))]

  return { currentPlan, quizHistory: quizHistory.slice(-10), weakTopics, strongTopics, studiedSubjects, totalLectures, averageScore }
}

export function formatContextForAI(ctx: StudentContext): string {
  const parts: string[] = []
  if (ctx.currentPlan) parts.push(`Student plan: ${ctx.currentPlan}`)
  if (ctx.totalLectures > 0) parts.push(`Lectures recorded: ${ctx.totalLectures}`)
  if (ctx.averageScore > 0) parts.push(`Average quiz score: ${ctx.averageScore}%`)
  if (ctx.weakTopics.length > 0) parts.push(`Weak subjects: ${ctx.weakTopics.join(', ')}`)
  if (ctx.strongTopics.length > 0) parts.push(`Strong subjects: ${ctx.strongTopics.join(', ')}`)
  return parts.join('\n')
}
