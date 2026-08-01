// Connects recordings, notes, and summaries so SAGE never needs
// the student to re-upload the same content

export interface LecturePacket {
  id: string
  name: string
  course?: string
  unit?: string
  duration: number
  timestamp: string
  transcript?: string
  notes?: string
  structuredNotes?: any
  summary?: string
  subject?: string
}

export interface Recording {
  id: string
  name: string
  duration: number
  timestamp: string
  course?: string
  unit?: string
  transcript?: string
  notes?: string
  structuredNotes?: any
}

export function getAllRecordings(): Recording[] {
  try {
    return JSON.parse(localStorage.getItem('recordingsMetadata') || '[]')
  } catch {
    return []
  }
}

export function getLecturePacket(recordingId: string): LecturePacket | null {
  const recordings = getAllRecordings()
  const rec = recordings.find(r => r.id === recordingId)
  if (!rec) return null

  // Try to get summary from summarize history (keyed by lecture id)
  let summary: string | undefined
  try {
    const summaryStore = JSON.parse(localStorage.getItem('sage_summaries') || '{}')
    summary = summaryStore[recordingId]
  } catch {}

  return {
    id: rec.id,
    name: rec.name,
    course: rec.course,
    unit: rec.unit,
    duration: rec.duration,
    timestamp: rec.timestamp,
    transcript: rec.transcript,
    notes: rec.notes,
    structuredNotes: rec.structuredNotes,
    summary,
    subject: rec.course || 'General',
  }
}

export function buildLecturePromptContext(packet: LecturePacket | null): string {
  if (!packet) return ''
  const parts: string[] = [`[Lecture: ${packet.name}]`]
  if (packet.course) parts.push(`Subject: ${packet.course}`)
  if (packet.unit) parts.push(`Unit: ${packet.unit}`)
  if (packet.notes) parts.push(`\nAI Notes:\n${packet.notes.slice(0, 2000)}`)
  if (packet.summary) parts.push(`\nSummary:\n${packet.summary.slice(0, 1000)}`)
  if (packet.transcript) parts.push(`\nTranscript excerpt:\n${packet.transcript.slice(0, 1500)}`)
  return parts.join('\n')
}

export function saveSummaryForLecture(lectureId: string, summary: string) {
  try {
    const store = JSON.parse(localStorage.getItem('sage_summaries') || '{}')
    store[lectureId] = summary
    localStorage.setItem('sage_summaries', JSON.stringify(store))
  } catch {}
}

export function getSageProgress(): {
  totalLectures: number
  lecturesWithNotes: number
  lecturesWithTranscript: number
  subjectsStudied: string[]
} {
  const recs = getAllRecordings()
  return {
    totalLectures: recs.length,
    lecturesWithNotes: recs.filter(r => !!r.notes).length,
    lecturesWithTranscript: recs.filter(r => !!r.transcript).length,
    subjectsStudied: [...new Set(recs.map(r => r.course).filter(Boolean))] as string[],
  }
}
