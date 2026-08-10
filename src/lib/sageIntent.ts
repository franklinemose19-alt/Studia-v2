export type SageIntent =
  | 'chat' | 'flashcards' | 'mockexam' | 'deepnotes' | 'knowledgegap' | 'coach' | 'snapsolve'

export function detectIntent(text: string, hasImage: boolean): SageIntent {
  if (hasImage) return 'snapsolve'
  const t = (text || '').toLowerCase()

  if (/\bflash ?cards?\b/.test(t)) return 'flashcards'
  if (/\b(quiz me|test me|mock exam|give me (a |an )?(quiz|test|exam)|practice questions|past paper)\b/.test(t)) return 'mockexam'
  if (/\b(deep notes|go deeper|explain (this |everything |in depth|in detail)|expand (this|these) notes|more detail)\b/.test(t)) return 'deepnotes'
  if (/\b(what am i missing|knowledge gap|gaps? in my|am i (exam )?ready|weak (topics?|areas?)|coverage|missing concepts?)\b/.test(t)) return 'knowledgegap'
  if (/\b(how am i doing|study plan|what should i (revise|study)|recommend|my progress|study coach|coach me)\b/.test(t)) return 'coach'

  return 'chat'
}

interface SubjectTemplate { match: RegExp; structure: string }

const SUBJECT_TEMPLATES: SubjectTemplate[] = [
  { match: /math|calculus|algebra|geometry|statistics/i, structure: 'Given → Formula → Working → Answer → Verification' },
  { match: /physic/i, structure: 'Given → Formula → Substitution → Units → Answer' },
  { match: /account/i, structure: 'Principle → Debit/Credit → Entry → Explanation' },
  { match: /financ|economic/i, structure: 'Data → Formula → Calculation → Table/Graph → Interpretation' },
  { match: /computer science|\bcs\b|\bit\b|\bict\b|programming|software/i, structure: 'Explanation → Code → Output → Debugging → Explanation' },
  { match: /engineer/i, structure: 'Formula → Variables → Calculation → Units → Result → Interpretation' },
  { match: /\blaw\b|legal/i, structure: 'Concept → Applicable legal framework → Explanation' },
  { match: /medic|nursing|health/i, structure: 'Educational explanation with clear safety boundaries — this is a study aid, not clinical guidance' },
]

export function getSubjectStructure(subjectOrText?: string): string | null {
  if (!subjectOrText) return null
  const found = SUBJECT_TEMPLATES.find(t => t.match.test(subjectOrText))
  return found ? found.structure : null
}
