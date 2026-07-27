export interface SmartInkNode {
  id: string
  label: string
  sublabel?: string
  shape?: 'rect' | 'diamond' | 'oval'
}

export interface SmartInkEdge {
  from: string
  to: string
  label?: string
}

export interface SmartInkSection {
  type: 'heading' | 'subheading' | 'paragraph' | 'definition' | 'example' | 'examtip' | 'table' | 'summary' | 'flowchart'
  text?: string
  headers?: string[]
  rows?: string[][]
  title?: string
  nodes?: SmartInkNode[]
  edges?: SmartInkEdge[]
}

export interface SmartInkQuickRevision {
  topFacts?: string[]
  keyTerms?: string[]
  commonMistakes?: string[]
}

export interface SmartInkNote {
  title: string
  subjectArea?: string
  sections: SmartInkSection[]
  quickRevision?: SmartInkQuickRevision
}

export type NoteVisualTier = 'plain' | 'lite' | 'pro' | 'semester'

export function parseInlineHighlights(text: string): { text: string; highlight: boolean }[] {
  if (!text) return []
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean)
  return parts.map((part) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return { text: part.slice(2, -2), highlight: true }
    }
    return { text: part, highlight: false }
  })
}

export function getTierFromPlan(plan: string | null, status: string | null): NoteVisualTier {
  // New plan names
  if (plan === 'valedictorian' && status === 'active') return 'semester'
  if (plan === 'excellence' && status === 'active') return 'pro'
  if (plan === 'achiever') return 'lite'
  if (plan === 'explorer') return 'plain'

  // Legacy plan names (backwards compatibility)
  if (plan === 'semester' && status === 'active') return 'semester'
  if (plan === 'pro' && status === 'active') return 'pro'
  if (plan === 'lite') return 'lite'

  return 'plain'
}
