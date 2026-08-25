import { motion, AnimatePresence } from 'framer-motion'
import { X, Lock, Zap } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface Props {
  isOpen: boolean
  onClose: () => void
  reason: 'explorer_locked' | 'no_minutes_left' | 'needs_premium'
  currentPlan: string | null
}

const PLANS = [
  { id: 'achiever', emoji: '🎯', name: 'Achiever', price: 'KSh 45', perks: ['45 AI minutes', 'Recording + transcription', 'Notes, summary & quiz'] },
  { id: 'achiever-plus', emoji: '🎯', name: 'Achiever+', price: 'KSh 69', perks: ['90 AI minutes', 'Recording + transcription', 'Notes, summary & quiz'] },
  { id: 'excellence', emoji: '🚀', name: 'Excellence', price: 'KSh 399/mo', perks: ['600 min/month', 'SAGE AI Tutor', 'Quizzes + flashcards'] },
  { id: 'valedictorian', emoji: '🏆', name: 'Valedictorian', price: 'KSh 1,199/sem', perks: ['1,800 min/semester', 'SAGE AI Tutor', 'Everything included'] },
]

export default function UpgradeModal({ isOpen, onClose, reason, currentPlan }: Props) {
  const navigate = useNavigate()

  const headline = reason === 'explorer_locked'
    ? "Your free lectures are used up"
    : reason === 'no_minutes_left'
    ? "You're out of AI minutes"
    : "This needs a subscription"

  const subtext = reason === 'explorer_locked'
    ? "You've used all 3 free AI lectures. Buy minutes or subscribe to keep going."
    : reason === 'no_minutes_left'
    ? "Your AI processing minutes have run out for this period."
    : "SAGE AI Tutor, quizzes, and flashcards need Excellence or Valedictorian."

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-black/60 z-[100]" />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="fixed inset-x-4 top-4 bottom-4 overflow-y-auto
                       sm:inset-x-auto sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2
                       sm:w-full sm:max-h-[85dvh]
                       max-w-lg mx-auto z-[110] bg-white rounded-3xl"
          >
            <div className="p-5 sm:p-8 pb-[max(env(safe-area-inset-bottom,1rem),1rem)]">
              <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={20} /></button>

              <div className="text-center mb-4 sm:mb-6">
                <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-2xl bg-indigo-premium/10 flex items-center justify-center mx-auto mb-3">
                  {reason === 'needs_premium' ? <Zap size={22} className="text-indigo-premium" /> : <Lock size={22} className="text-indigo-premium" />}
                </div>
                <h2 className="font-sora font-bold text-lg sm:text-2xl text-navy mb-1.5">{headline}</h2>
                <p className="text-gray-500 text-xs sm:text-sm px-2">{subtext}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                {PLANS.map(plan => (
                  <button key={plan.id} onClick={() => { onClose(); navigate(`/checkout?plan=${plan.id}`) }}
                    className="text-left bg-gray-50 hover:bg-indigo-premium/5 border border-gray-200 hover:border-indigo-premium/40 rounded-2xl p-3 transition">
                    <div className="flex items-center justify-between mb-1.5 gap-1">
                      <span className="text-base">{plan.emoji}</span>
                      <span className="font-bold text-navy text-[11px] text-right">{plan.price}</span>
                    </div>
                    <p className="font-sora font-bold text-navy text-xs mb-1.5">{plan.name}</p>
                    <ul className="space-y-0.5">
                      {plan.perks.map((p, i) => <li key={i} className="text-[10px] text-gray-500 leading-snug">• {p}</li>)}
                    </ul>
                  </button>
                ))}
              </div>

              <button onClick={() => { onClose(); navigate('/pricing') }} className="w-full text-center text-xs text-gray-400 hover:text-gray-600 mt-4 underline">
                Compare all plans in detail →
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
