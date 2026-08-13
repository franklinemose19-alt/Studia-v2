import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, ChevronRight, Brain, BookOpen } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { listConcepts, groupBySubject, type KnowledgeConcept } from '../lib/knowledgeMap'
import { masteryLabel } from '../lib/masteryScore'
import ConceptThread from '../components/knowledgemap/ConceptThread'

function MasteryRing({ value, size = 44 }: { value: number; size?: number }) {
  const r = (size - 6) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (Math.min(100, Math.max(0, value)) / 100) * circ
  const color = value >= 80 ? '#2EE59D' : value >= 60 ? '#3B82F6' : value >= 40 ? '#F59E0B' : value > 0 ? '#EF4444' : '#4A5568'
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90 absolute inset-0">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="3" strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center"><span className="text-[10px] font-bold text-white">{value}%</span></div>
    </div>
  )
}

export default function KnowledgeMap() {
  const navigate = useNavigate()
  const { userId } = useAuth()
  const [loading, setLoading] = useState(true)
  const [concepts, setConcepts] = useState<KnowledgeConcept[]>([])
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null)
  const [selectedConcept, setSelectedConcept] = useState<KnowledgeConcept | null>(null)

  useEffect(() => {
    if (!userId) return
    listConcepts(userId).then(data => {
      setConcepts(data); setLoading(false)
      const subjects = Object.keys(groupBySubject(data))
      if (subjects.length > 0) setExpandedSubject(subjects[0])
    })
  }, [userId])

  const grouped = groupBySubject(concepts)
  const subjectNames = Object.keys(grouped)
  const overallMastery = concepts.length > 0 ? Math.round(concepts.reduce((s, c) => s + c.mastery, 0) / concepts.length) : 0

  return (
    <div className="min-h-screen bg-surface-base">
      <nav className="border-b border-white/5 bg-surface-elevated/50 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-sm text-[#8B97B5] hover:text-white"><ArrowLeft size={16} /> Back</button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-blue to-purple-500 flex items-center justify-center"><Brain size={16} className="text-white" /></div>
            <span className="font-sora font-bold text-white">Knowledge Map</span>
          </div>
          <div className="w-16" />
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {loading ? (
          <div className="py-16 text-center text-[#8B97B5] text-sm">Loading your knowledge map...</div>
        ) : concepts.length === 0 ? (
          <div className="text-center py-16">
            <BookOpen size={36} className="mx-auto text-[#4A5568] mb-3" />
            <p className="text-white font-semibold mb-1">Nothing here yet</p>
            <p className="text-[#8B97B5] text-sm max-w-xs mx-auto">Record a lecture and STUDIA will start building your personal knowledge map automatically.</p>
            <button onClick={() => navigate('/recording')} className="mt-4 bg-brand-blue text-white px-5 py-2.5 rounded-xl text-sm font-semibold">Record a Lecture</button>
          </div>
        ) : (
          <>
            <div className="bg-surface-elevated border border-white/5 rounded-2xl p-5 flex items-center gap-4">
              <MasteryRing value={overallMastery} size={56} />
              <div>
                <p className="text-white font-sora font-bold">{concepts.length} concepts tracked</p>
                <p className="text-xs text-[#8B97B5]">{overallMastery}% average mastery across everything you've learned</p>
              </div>
            </div>
            <div className="space-y-3">
              {subjectNames.map(subject => (
                <div key={subject} className="bg-surface-elevated border border-white/5 rounded-2xl overflow-hidden">
                  <button onClick={() => setExpandedSubject(expandedSubject === subject ? null : subject)} className="w-full px-4 py-3 flex items-center justify-between">
                    <span className="text-sm font-semibold text-white">{subject}</span>
                    <span className="text-xs text-[#8B97B5]">{grouped[subject].length} concepts</span>
                  </button>
                  <AnimatePresence>
                    {expandedSubject === subject && (
                      <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden border-t border-white/5">
                        <div className="divide-y divide-white/5">
                          {grouped[subject].map(concept => {
                            const { label, color } = masteryLabel(concept.mastery)
                            return (
                              <button key={concept.id} onClick={() => setSelectedConcept(concept)} className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/3 transition text-left">
                                <MasteryRing value={concept.mastery} />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm text-white font-medium truncate">{concept.name}</p>
                                  <p className={`text-[10px] ${color}`}>{label}</p>
                                </div>
                                <ChevronRight size={14} className="text-[#8B97B5] shrink-0" />
                              </button>
                            )
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
      {selectedConcept && <ConceptThread concept={selectedConcept} userId={userId!} onClose={() => setSelectedConcept(null)} />}
    </div>
  )
}
