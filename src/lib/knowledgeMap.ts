import { getSupabase } from './supabaseClient'
import { computeMastery, type MasteryEvidenceRow } from './masteryScore'

export interface KnowledgeConcept {
  id: number; user_id: string; name: string; subject: string | null; topic: string | null
  description: string | null; mastery: number; first_encountered_at: string; last_reviewed_at: string | null
}
export interface ConceptSource { id: number; concept_id: number; source_type: string; source_id: string | null; source_label: string | null; excerpt: string | null; created_at: string }
export interface ConceptRelationship { id: number; concept_id: number; related_concept_id: number; relationship_type: string; confidence: string }

export async function listConcepts(userId: string): Promise<KnowledgeConcept[]> {
  const client = await getSupabase()
  const { data, error } = await client.from('knowledge_concepts').select('*').eq('user_id', userId).order('subject', { ascending: true })
  if (error || !data || data.length === 0) return []

  // One extra query for ALL evidence, grouped client-side — cheaper than
  // N+1 per concept, and keeps the list view honest instead of always
  // showing the stale default-0 stored column.
  const { data: allEvidence } = await client.from('mastery_evidence').select('concept_id, evidence_type, weight, created_at').eq('user_id', userId)
  const byConceptId: Record<number, MasteryEvidenceRow[]> = {}
  for (const row of allEvidence || []) {
    if (!byConceptId[row.concept_id]) byConceptId[row.concept_id] = []
    byConceptId[row.concept_id].push(row as MasteryEvidenceRow)
  }
  return data.map(c => ({ ...c, mastery: computeMastery(byConceptId[c.id] || []) }))
}

export async function getConceptDetail(conceptId: number, userId: string) {
  const client = await getSupabase()
  const [sourcesRes, relRes, evidenceRes] = await Promise.all([
    client.from('concept_sources').select('*').eq('concept_id', conceptId).eq('user_id', userId).order('created_at', { ascending: true }),
    client.from('concept_relationships').select('*').eq('concept_id', conceptId).eq('user_id', userId),
    client.from('mastery_evidence').select('evidence_type, weight, created_at').eq('concept_id', conceptId).eq('user_id', userId),
  ])
  const sources: ConceptSource[] = sourcesRes.data || []
  const relationships: ConceptRelationship[] = relRes.data || []
  const evidence: MasteryEvidenceRow[] = (evidenceRes.data || []) as MasteryEvidenceRow[]
  return { sources, relationships, liveMastery: computeMastery(evidence), evidenceCount: evidence.length }
}

export function groupBySubject(concepts: KnowledgeConcept[]): Record<string, KnowledgeConcept[]> {
  const groups: Record<string, KnowledgeConcept[]> = {}
  for (const c of concepts) {
    const key = c.subject || 'General'
    if (!groups[key]) groups[key] = []
    groups[key].push(c)
  }
  return groups
}

export async function logFlashcardEvidence(userId: string, topicName: string, known: boolean): Promise<void> {
  try {
    const client = await getSupabase()
    const { data: matches } = await client.from('knowledge_concepts').select('id').eq('user_id', userId).ilike('name', `%${topicName}%`).limit(1)
    const conceptId = matches?.[0]?.id
    if (!conceptId) return // no matching concept yet — skip, never create one client-side
    await client.from('mastery_evidence').insert({ concept_id: conceptId, user_id: userId, evidence_type: known ? 'flashcard_known' : 'flashcard_learning', weight: 1 })
  } catch (err) { console.error('logFlashcardEvidence failed:', err) }
}
