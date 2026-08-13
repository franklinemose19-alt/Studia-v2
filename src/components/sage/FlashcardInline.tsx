import { useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { logFlashcardEvidence } from '../../lib/knowledgeMap'

interface Flashcard { id: string; front: string; back: string; topic?: string }

export default function FlashcardInline({ cards, userId }: { cards: Flashcard[]; userId?: string | null }) {
  const [i, setI] = useState(0)
  const [flipped, setFlipped] = useState(false)
  if (!cards?.length) return null
  const card = cards[i]

  const markAndAdvance = (known: boolean) => {
    if (userId && card.topic) logFlashcardEvidence(userId, card.topic, known).catch(() => {})
    if (i < cards.length - 1) { setI(i + 1); setFlipped(false) }
  }

  return (
    <div className="my-2 bg-surface-base rounded-xl border border-white/10 p-4">
      <p className="text-[10px] text-[#8B97B5] mb-2">Flashcard {i + 1} of {cards.length}</p>
      <div onClick={() => setFlipped(!flipped)} className="cursor-pointer h-32" style={{ perspective: '1000px' }}>
        <motion.div animate={{ rotateY: flipped ? 180 : 0 }} transition={{ duration: 0.4 }} style={{ transformStyle: 'preserve-3d', position: 'relative', height: '100%' }}>
          <div style={{ backfaceVisibility: 'hidden' }} className="absolute inset-0 bg-brand-blue/10 border border-brand-blue/30 rounded-xl p-4 flex items-center justify-center text-center">
            <p className="text-sm text-white font-medium">{card.front}</p>
          </div>
          <div style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }} className="absolute inset-0 bg-mint/10 border border-mint/30 rounded-xl p-4 flex items-center justify-center text-center">
            <p className="text-sm text-white">{card.back}</p>
          </div>
        </motion.div>
      </div>
      {flipped ? (
        <div className="flex gap-2 mt-3">
          <button onClick={() => markAndAdvance(false)} className="flex-1 bg-yellow-500/20 border border-yellow-500/40 text-yellow-300 py-2 rounded-lg text-xs font-semibold">Still Learning</button>
          <button onClick={() => markAndAdvance(true)} className="flex-1 bg-green-500/20 border border-green-500/40 text-green-300 py-2 rounded-lg text-xs font-semibold">Got It ✓</button>
        </div>
      ) : (
        <div className="flex items-center justify-between mt-3">
          <button onClick={() => { setI(Math.max(0, i - 1)); setFlipped(false) }} disabled={i === 0} className="p-1.5 rounded-lg bg-white/5 text-[#8B97B5] disabled:opacity-30"><ChevronLeft size={16} /></button>
          <span className="text-[10px] text-[#8B97B5]">Tap card to flip</span>
          <button onClick={() => { setI(Math.min(cards.length - 1, i + 1)); setFlipped(false) }} disabled={i === cards.length - 1} className="p-1.5 rounded-lg bg-white/5 text-[#8B97B5] disabled:opacity-30"><ChevronRight size={16} /></button>
        </div>
      )}
    </div>
  )
}
