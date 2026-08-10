import { useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface Flashcard { id: string; front: string; back: string }

export default function FlashcardInline({ cards }: { cards: Flashcard[] }) {
  const [i, setI] = useState(0)
  const [flipped, setFlipped] = useState(false)
  if (!cards?.length) return null
  const card = cards[i]

  return (
    <div className="my-2 bg-surface-base rounded-xl border border-white/10 p-4">
      <p className="text-[10px] text-[#8B97B5] mb-2">Flashcard {i + 1} of {cards.length}</p>
      <div onClick={() => setFlipped(!flipped)} className="cursor-pointer h-32" style={{ perspective: '1000px' }}>
        <motion.div animate={{ rotateY: flipped ? 180 : 0 }} transition={{ duration: 0.4 }}
          style={{ transformStyle: 'preserve-3d', position: 'relative', height: '100%' }}>
          <div style={{ backfaceVisibility: 'hidden' }} className="absolute inset-0 bg-brand-blue/10 border border-brand-blue/30 rounded-xl p-4 flex items-center justify-center text-center">
            <p className="text-sm text-white font-medium">{card.front}</p>
          </div>
          <div style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }} className="absolute inset-0 bg-mint/10 border border-mint/30 rounded-xl p-4 flex items-center justify-center text-center">
            <p className="text-sm text-white">{card.back}</p>
          </div>
        </motion.div>
      </div>
      <div className="flex items-center justify-between mt-3">
        <button onClick={() => { setI(Math.max(0, i - 1)); setFlipped(false) }} disabled={i === 0}
          className="p-1.5 rounded-lg bg-white/5 text-[#8B97B5] disabled:opacity-30"><ChevronLeft size={16} /></button>
        <span className="text-[10px] text-[#8B97B5]">Tap card to flip</span>
        <button onClick={() => { setI(Math.min(cards.length - 1, i + 1)); setFlipped(false) }} disabled={i === cards.length - 1}
          className="p-1.5 rounded-lg bg-white/5 text-[#8B97B5] disabled:opacity-30"><ChevronRight size={16} /></button>
      </div>
    </div>
  )
}
