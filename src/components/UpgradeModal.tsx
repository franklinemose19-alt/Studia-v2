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
  { id: 'achiever', emoji: '🎯', name: 'Achiever', price: 'KSh 45', perks: ['45 AI minutes', 'Recording + transcription', 'AI notes, summary & quiz'] },
  { id: 'achiever-plus', emoji: '🎯', name: 'Achiever+', price: 'KSh 69', perks: ['90 AI minutes', 'Recording + transcription', 'AI notes, summary & quiz'] },
  { id: 'excellence', emoji: '🚀', name: 'Excellence', price: 'KSh 399/mo', perks: ['600 AI minutes/month', 'SAGE AI Tutor', 'Quizzes + flashcards'] },
  { id: 'valedictorian', emoji: '🏆', name: 'Valedictorian', price: 'KSh 1,199/sem', perks: ['1,800 AI minutes/semester', 'SAGE AI Tutor', 'Everything included'] },
]

export default function UpgradeModal({ isOpen, onClose, reason, currentPlan }: Props) {
  const navigate = useNavigate()

  const headline = reason === 'explorer_locked'
    ? "Your free lectures are used up"
    : reason === 'no_minutes_left'
    ? "You're out of AI minutes"
    : "This needs a subscription"

  const subtext = reason === 'explorer_locked'
    ? "You've used all 3 free AI lectures. Buy a minutes pack or subscribe to keep going."
    : reason === 'no_minutes_left'
    ? "Your AI processing minutes have run out for this period."
    : "SAGE AI Tutor, quizzes, and flashcards need Excellence or Valedictorian."

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-black/60 z-[100]" />
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 max-w-lg mx-auto z-[110] bg-white rounded-3xl p-6 sm:p-8 max-h-[85vh] overflow-y-auto">
            <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={20} /></button>

            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-2xl bg-indigo-premium/10 flex items-center justify-center mx-auto mb-4">
                {reason === 'needs_premium' ? <Zap size={26} className="text-indigo-premium" /> : <Lock size={26} className="text-indigo-premium" />}
              </div>
              <h2 className="font-sora font-bold text-2xl text-navy mb-2">{headline}</h2>
              <p className="text-gray-500 text-sm">{subtext}</p>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              {PLANS.map(plan => (
                <button key={plan.id} onClick={() => { onClose(); navigate(`/checkout?plan=${plan.id}`) }}
                  className="text-left bg-gray-50 hover:bg-indigo-premium/5 border border-gray-200 hover:border-indigo-premium/40 rounded-2xl p-4 transition">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-lg">{plan.emoji}</span>
                    <span className="font-bold text-navy text-sm">{plan.price}</span>
                  </div>
                  <p className="font-sora font-bold text-navy text-sm mb-2">{plan.name}</p>
                  <ul className="space-y-1">
                    {plan.perks.map((p, i) => <li key={i} className="text-xs text-gray-500">• {p}</li>)}
                  </ul>
                </button>
              ))}
            </div>

            <button onClick={() => { onClose(); navigate('/pricing') }} className="w-full text-center text-xs text-gray-400 hover:text-gray-600 mt-4 underline">
              Compare all plans in detail →
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
