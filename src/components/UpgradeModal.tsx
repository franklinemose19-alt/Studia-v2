import { motion, AnimatePresence } from 'framer-motion'
import { X, Check, Zap, Globe, Sparkles, Crown } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface UpgradeModalProps {
  isOpen: boolean
  onClose: () => void
  reason?: 'explorer_locked' | 'no_lectures_left' | 'needs_premium'
  currentPlan?: string | null
}

const PLANS = [
  {
    id: 'achiever',
    emoji: '🎯',
    name: 'Achiever',
    price: 'KSh 29',
    period: '/lecture',
    icon: <Zap size={20} />,
    color: 'from-light-blue to-indigo-premium',
    border: 'border-light-blue/30',
    cta: 'Pay Per Lecture',
    perks: ['Pay only when you study', 'KSh 29 (1hr) or KSh 49 (2hr)', 'Full AI notes + quiz'],
  },
  {
    id: 'excellence',
    emoji: '🚀',
    name: 'Excellence',
    price: 'KSh 399',
    period: '/month',
    icon: <Sparkles size={20} />,
    color: 'from-mint to-light-blue',
    border: 'border-mint/30',
    cta: 'Choose Excellence',
    perks: ['25 AI lectures every month', 'Full color Smart Ink notes', 'SnapSolve + Past Papers'],
  },
  {
    id: 'valedictorian',
    emoji: '🏆',
    name: 'Valedictorian',
    price: 'KSh 1,200',
    period: '/semester',
    icon: <Crown size={20} />,
    color: 'from-warning to-red-500',
    border: 'border-warning/40',
    cta: 'Get Best Value',
    highlighted: true,
    badge: '🔥 Best Value',
    perks: ['80 AI lectures per semester', '3D gradient Smart Ink notes', 'Priority AI queue'],
  },
]

const REASON_COPY = {
  explorer_locked: {
    title: 'Your 3 free lectures are used up 🔒',
    subtitle: 'Explorer plan gives you 3 lifetime AI lectures. To keep studying smarter, choose a plan below.',
  },
  no_lectures_left: {
    title: 'Lecture allowance reached 📚',
    subtitle: 'You\'ve used all your AI lectures for this period. Upgrade your plan or wait for the reset.',
  },
  needs_premium: {
    title: 'Premium feature 🌟',
    subtitle: 'This feature requires the Valedictorian plan. Upgrade to unlock the full STUDIA experience.',
  },
}

export default function UpgradeModal({ isOpen, onClose, reason = 'explorer_locked', currentPlan }: UpgradeModalProps) {
  const navigate = useNavigate()
  const copy = REASON_COPY[reason]

  const goToCheckout = (planId: string) => {
    onClose()
    navigate(`/checkout?plan=${planId}`)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center px-4 py-6"
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 20 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          >
            {/* Close */}
            <button onClick={onClose}
              className="absolute top-4 right-4 z-10 p-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition text-gray-500 hover:text-gray-700">
              <X size={18} />
            </button>

            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-premium to-purple-premium px-6 pt-8 pb-6 rounded-t-3xl text-white">
              <div className="text-4xl mb-3">🎓</div>
              <h2 className="font-sora font-bold text-2xl mb-2">{copy.title}</h2>
              <p className="text-white/80 text-sm">{copy.subtitle}</p>
            </div>

            {/* Plan cards */}
            <div className="p-5 sm:p-6 space-y-4">
              <p className="font-sora font-bold text-navy text-base">Choose your plan</p>

              <div className="grid sm:grid-cols-3 gap-3">
                {PLANS.map((plan) => (
                  <div key={plan.id} className={`relative rounded-2xl border-2 p-4 flex flex-col ${
                    plan.highlighted
                      ? 'bg-gradient-to-br from-warning/10 to-red-500/5 border-warning/50 shadow-lg'
                      : `bg-gray-50 ${plan.border}`
                  }`}>
                    {plan.badge && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-warning text-white text-[10px] font-bold px-3 py-0.5 rounded-full whitespace-nowrap">
                        {plan.badge}
                      </span>
                    )}

                    <div className="flex items-center gap-2 mb-3">
                      <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${plan.color} text-white flex items-center justify-center shrink-0`}>
                        {plan.icon}
                      </div>
                      <div>
                        <p className="font-sora font-bold text-navy text-sm">{plan.emoji} {plan.name}</p>
                      </div>
                    </div>

                    <div className="flex items-baseline gap-0.5 mb-3">
                      <span className="font-bold text-navy text-xl">{plan.price}</span>
                      <span className="text-gray-500 text-xs">{plan.period}</span>
                    </div>

                    <ul className="space-y-1.5 mb-4 flex-1">
                      {plan.perks.map((perk, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-xs text-gray-600">
                          <Check size={11} className="text-mint shrink-0 mt-0.5" /> {perk}
                        </li>
                      ))}
                    </ul>

                    <button
                      onClick={() => goToCheckout(plan.id)}
                      className={`w-full py-2.5 rounded-xl text-xs font-bold transition ${
                        plan.highlighted
                          ? 'bg-warning text-white hover:bg-red-500'
                          : 'bg-indigo-premium text-white hover:bg-purple-premium'
                      }`}
                    >
                      {plan.cta}
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button onClick={() => { onClose(); navigate('/pricing') }}
                  className="flex-1 border border-gray-200 text-navy font-medium py-3 rounded-xl hover:bg-gray-50 transition text-sm">
                  See full comparison →
                </button>
                <button onClick={onClose}
                  className="flex-1 text-gray-400 hover:text-gray-600 font-medium py-3 rounded-xl text-sm transition">
                  Maybe later
                </button>
              </div>

              <p className="text-center text-xs text-gray-400">
                💳 Secure M-Pesa payments · Instant activation · Cancel anytime
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
