import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Mic, BookOpen, Brain, Check, ArrowRight, X } from 'lucide-react'

interface Props {
  firstName: string
  onComplete: () => void
}

const STEPS = [
  {
    icon: '🎓',
    title: 'Welcome to STUDIA AI',
    subtitle: (name: string) => `Hey ${name}! You have 5 free AI lectures to get started — no card needed.`,
    cta: "Let's go",
    tip: null,
  },
  {
    icon: '📚',
    title: 'Step 1 — Add your course',
    subtitle: () => 'First, add your course and unit. STUDIA uses this to track your syllabus coverage.',
    cta: 'Got it',
    tip: 'Go to Unit Management → add a course like "Mathematics" and a unit like "Calculus"',
  },
  {
    icon: '🎙️',
    title: 'Step 2 — Record a lecture',
    subtitle: () => 'Hit Record during your next class. STUDIA transcribes it and generates Smart Ink notes automatically.',
    cta: 'Makes sense',
    tip: 'Works best with clear audio. Use your phone mic close to the lecturer.',
  },
  {
    icon: '🧠',
    title: 'Step 3 — Let SAGE tutor you',
    subtitle: () => 'After recording, open SAGE AI Tutor. It already has your notes and transcript — ask it anything, generate flashcards, or take a mock exam.',
    cta: 'Start studying',
    tip: 'SAGE knows every lecture you record — no re-uploading needed.',
  },
]

export default function OnboardingModal({ firstName, onComplete }: Props) {
  const [step, setStep] = useState(0)
  const navigate = useNavigate()
  const current = STEPS[step]
  const isLast = step === STEPS.length - 1

  const advance = () => {
    if (isLast) {
      localStorage.setItem('studia_onboarded', 'true')
      onComplete()
    } else {
      setStep(s => s + 1)
    }
  }

  const skip = () => {
    localStorage.setItem('studia_onboarded', 'true')
    onComplete()
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center px-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: -12 }}
          transition={{ duration: 0.25 }}
          className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden"
        >
          {/* Skip */}
          {step === 0 && (
            <button onClick={skip} className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100 transition">
              <X size={18} />
            </button>
          )}

          {/* Header gradient */}
          <div className="bg-gradient-to-br from-indigo-premium to-purple-premium px-6 pt-10 pb-8 text-center">
            <div className="text-5xl mb-4">{current.icon}</div>
            <h2 className="font-sora font-bold text-white text-xl mb-2">{current.title}</h2>
            <p className="text-white/80 text-sm leading-relaxed">{current.subtitle(firstName)}</p>
          </div>

          {/* Body */}
          <div className="px-6 py-6 space-y-5">
            {current.tip && (
              <div className="bg-indigo-premium/8 border border-indigo-premium/20 rounded-2xl p-4 flex gap-3">
                <span className="text-indigo-premium shrink-0 mt-0.5">💡</span>
                <p className="text-sm text-navy">{current.tip}</p>
              </div>
            )}

            {/* Step indicators */}
            <div className="flex items-center justify-center gap-2">
              {STEPS.map((_, i) => (
                <div key={i} className={`rounded-full transition-all duration-300 ${
                  i === step ? 'w-6 h-2 bg-indigo-premium' : i < step ? 'w-2 h-2 bg-mint' : 'w-2 h-2 bg-gray-200'
                }`} />
              ))}
            </div>

            {/* CTA */}
            <button
              onClick={advance}
              className="w-full bg-indigo-premium text-white font-bold py-3.5 rounded-2xl hover:bg-purple-premium transition flex items-center justify-center gap-2"
            >
              {isLast ? (
                <><Check size={18} /> {current.cta}</>
              ) : (
                <>{current.cta} <ArrowRight size={18} /></>
              )}
            </button>

            {isLast && (
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => { skip(); navigate('/units') }}
                  className="py-2.5 rounded-xl border border-gray-200 text-navy text-sm font-medium hover:bg-gray-50 transition flex items-center justify-center gap-1.5">
                  <BookOpen size={14} /> Add Units
                </button>
                <button onClick={() => { skip(); navigate('/recording') }}
                  className="py-2.5 rounded-xl border border-gray-200 text-navy text-sm font-medium hover:bg-gray-50 transition flex items-center justify-center gap-1.5">
                  <Mic size={14} /> Record Now
                </button>
              </div>
            )}

            {step > 0 && (
              <button onClick={skip} className="w-full text-xs text-gray-400 hover:text-gray-500 transition">
                Skip intro
              </button>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
