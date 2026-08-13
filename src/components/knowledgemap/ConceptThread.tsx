import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, BookOpen, HelpCircle, ClipboardList, MessageCircle, Loader } from 'lucide-react'
import { getConceptDetail, type KnowledgeConcept } from '../../lib/knowledgeMap'
import { masteryLabel } from '../../lib/masteryScore'

const SOURCE_ICONS: Record<string, any> = { lecture: BookOpen, quiz: ClipboardList, sage_chat: MessageCircle, past_paper: HelpCircle }

export default function ConceptThread({ concept, userId, onClose }: { concept: KnowledgeConcept; userId: string; onClose: () => void }) {
  const [loading, setLoading] = useState(true)
  const [detail, setDetail] = useState<{ sources: any[]; relationships: any[]; liveMastery: number; evidenceCount: number } | null>(null)

  useEffect(() => { getConceptDetail(concept.id, userId).then(d => { setDetail(d); setLoading(false) }) }, [concept.id, userId])

  const mastery = detail?.liveMastery ?? concept.mastery
  const { label, color } = masteryLabel(mastery)

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-black/60 z-[100]" />
      <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="fixed left-0 right-0 bottom-0 z-[110] bg-surface-elevated border-t border-white/10 rounded-t-3xl max-w-3xl mx-auto max-h-[85vh] overflow-y-auto pb-[env(safe-area-inset-bottom,0px)]">
        <div className="sticky top-0 bg-surface-elevated border-b border-white/5 px-5 py-4 flex items-center justify-between">
          <div>
            <p className="font-sora font-bold text-white">{concept.name}</p>
            <p className={`text-xs ${color}`}>{label} · {mastery}% mastery</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-[#8B97B5] hover:text-white"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-5">
          {concept.description && <p className="text-sm text-[#C5CCDE]">{concept.description}</p>}
          {loading ? (
            <div className="py-8 text-center text-[#8B97B5] text-sm flex items-center justify-center gap-2"><Loader size={14} className="animate-spin" /> Loading thread...</div>
          ) : (
            <>
              {detail && detail.relationships.length > 0 && (
                <div>
                  <p className="text-[10px] text-[#8B97B5] font-semibold uppercase tracking-wide mb-2">Connected To</p>
                  <div className="flex flex-wrap gap-1.5">
                    {detail.relationships.map(r => (
                      <span key={r.id} className="text-[10px] bg-brand-blue/10 text-brand-blue px-2.5 py-1 rounded-full">{r.relationship_type === 'prerequisite' ? '⬅ Prerequisite' : 'Related'}</span>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <p className="text-[10px] text-[#8B97B5] font-semibold uppercase tracking-wide mb-2">Appears In ({detail?.sources.length || 0})</p>
                {detail && detail.sources.length > 0 ? (
                  <div className="space-y-2">
                    {detail.sources.map(s => {
                      const Icon = SOURCE_ICONS[s.source_type] || BookOpen
                      return (
                        <div key={s.id} className="bg-surface-base rounded-xl p-3 flex items-start gap-2.5">
                          <Icon size={14} className="text-brand-blue shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <p className="text-xs text-white font-medium">{s.source_label || s.source_type}</p>
                            {s.excerpt && <p className="text-[11px] text-[#8B97B5] mt-0.5">{s.excerpt}</p>}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : <p className="text-xs text-[#8B97B5]">No source history recorded yet.</p>}
              </div>
              <div className="bg-brand-blue/10 border border-brand-blue/20 rounded-xl p-3">
                <p className="text-xs text-brand-blue">{detail?.evidenceCount ? `Based on ${detail.evidenceCount} quiz and flashcard result${detail.evidenceCount !== 1 ? 's' : ''}.` : 'No quiz or flashcard results yet — take a quiz on this topic to build up mastery data.'}</p>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
