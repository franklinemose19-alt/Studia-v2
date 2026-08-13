export interface MasteryEvidenceRow {
  evidence_type: 'quiz_correct' | 'quiz_incorrect' | 'flashcard_known' | 'flashcard_learning'
  weight: number
  created_at: string
}

const BASE_WEIGHTS: Record<MasteryEvidenceRow['evidence_type'], number> = {
  quiz_correct: 3, quiz_incorrect: -2, flashcard_known: 1.5, flashcard_learning: -1,
}

function recencyMultiplier(createdAt: string): number {
  const ageWeeks = (Date.now() - new Date(createdAt).getTime()) / (7 * 24 * 60 * 60 * 1000)
  if (ageWeeks <= 4) return 1
  if (ageWeeks >= 8) return 0.25
  return 1 - ((ageWeeks - 4) / 4) * 0.75
}

export function computeMastery(evidence: MasteryEvidenceRow[]): number {
  if (!evidence || evidence.length === 0) return 0
  let score = 50
  for (const row of evidence) {
    const base = BASE_WEIGHTS[row.evidence_type] ?? 0
    score += base * recencyMultiplier(row.created_at) * (row.weight || 1)
  }
  return Math.max(0, Math.min(100, Math.round(score)))
}

export function masteryLabel(score: number): { label: string; color: string } {
  if (score >= 80) return { label: 'Mastered', color: 'text-mint' }
  if (score >= 60) return { label: 'Solid', color: 'text-brand-blue' }
  if (score >= 40) return { label: 'Developing', color: 'text-warning' }
  if (score > 0) return { label: 'Weak', color: 'text-red-400' }
  return { label: 'Not yet reviewed', color: 'text-[#8B97B5]' }
}
