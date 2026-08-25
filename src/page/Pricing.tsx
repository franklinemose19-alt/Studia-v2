import { motion } from 'framer-motion'
import { Check, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const PLANS = [
  {
    id: 'explorer', emoji: '🌍', name: 'Explorer', price: 'Free', priceSub: '3 lifetime AI lectures',
    features: ['3 AI lectures, forever (no reset)', 'Plain text Smart Ink notes', 'Basic quiz generation', 'Manual notes library'],
    cta: 'Get Started', highlight: false,
  },
  {
    id: 'achiever', emoji: '🎯', name: 'Achiever', price: 'KSh 45', priceSub: '45 minutes of AI processing',
    features: ['45 minutes: recording + transcription', 'AI notes & summary generation', 'Sketch-style Smart Ink notes', 'No quizzes or SAGE (subscribe for those)'],
    cta: 'Buy Minutes', highlight: false,
  },
  {
    id: 'achiever-plus', emoji: '🎯', name: 'Achiever+', price: 'KSh 69', priceSub: '90 minutes of AI processing',
    features: ['90 minutes: recording + transcription', 'AI notes & summary generation', 'Sketch-style Smart Ink notes', 'No quizzes or SAGE (subscribe for those)'],
    cta: 'Buy Minutes', highlight: false, badge: '⭐ Best per-minute value',
  },
  {
    id: 'excellence', emoji: '🚀', name: 'Excellence', price: 'KSh 399', priceSub: '600 minutes (10hrs) every month',
    features: ['600 AI minutes every month', 'Full color Smart Ink notes', 'SAGE AI Tutor — unlimited chat', 'Quizzes, flashcards, deep notes', 'Knowledge Map access'],
    cta: 'Subscribe', highlight: false,
  },
  {
    id: 'valedictorian', emoji: '🏆', name: 'Valedictorian', price: 'KSh 1,199', priceSub: '1,800 minutes (30hrs) per semester',
    features: ['1,800 AI minutes per semester', 'Premium gradient Smart Ink notes', 'SAGE AI Tutor — unlimited chat', 'Everything in Excellence', 'Priority AI queue'],
    cta: 'Subscribe', highlight: true, badge: '🔥 Best Value',
  },
]

const COMPARISON = [
  { feature: 'AI Minutes Included', values: ['3 lectures lifetime', '45 min', '90 min', '600 min/month', '1,800 min/semester'] },
  { feature: 'Recording & Transcription', values: [true, true, true, true, true] },
  { feature: 'AI Notes & Summary', values: [true, true, true, true, true] },
  { feature: 'Smart Ink Style', values: ['Plain', 'Sketch', 'Sketch', 'Full Color', 'Premium Gradient'] },
  { feature: 'Quiz Generation', values: [true, false, false, true, true] },
  { feature: 'SAGE AI Tutor', values: [false, false, false, true, true] },
  { feature: 'Flashcards & Deep Notes', values: [false, false, false, true, true] },
  { feature: 'Knowledge Map', values: [false, false, false, true, true] },
]

export default function Pricing() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-surface-light to-white">
      <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="text-navy hover:text-indigo-premium transition text-sm font-medium">← Back</button>
          <span className="font-sora font-bold text-lg text-navy">Pricing</span>
          <div className="w-16" />
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 space-y-16">
        <div className="text-center">
          <h1 className="font-sora font-bold text-4xl sm:text-5xl text-navy mb-4">Simple, honest pricing</h1>
          <p className="text-gray-500 text-lg max-w-xl mx-auto">Pay for exactly the AI minutes you use, or subscribe for the full STUDIA experience.</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-5">
          {PLANS.map((plan, i) => (
            <motion.div key={plan.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
              className={`rounded-2xl p-6 border relative flex flex-col ${plan.highlight ? 'bg-gradient-to-br from-warning/15 to-red-500/5 border-warning/40 shadow-xl lg:scale-105' : 'bg-white border-gray-200 hover:shadow-md transition'}`}>
              {plan.badge && (
                <span className={`absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-xs font-bold text-white whitespace-nowrap ${plan.highlight ? 'bg-warning' : 'bg-light-blue'}`}>{plan.badge}</span>
              )}
              <p className="text-2xl mb-1">{plan.emoji}</p>
              <h3 className="font-sora font-bold text-lg text-navy mb-1">{plan.name}</h3>
              <div className="mb-1"><span className="text-2xl font-bold text-navy">{plan.price}</span></div>
              <p className="text-xs text-gray-500 mb-4">{plan.priceSub}</p>
              <ul className="space-y-2 mb-6 flex-1">
                {plan.features.map((f, j) => (
                  <li key={j} className="flex items-start gap-2 text-xs text-gray-700"><Check size={12} className="text-mint shrink-0 mt-0.5" /> {f}</li>
                ))}
              </ul>
              <button onClick={() => navigate(`/checkout?plan=${plan.id}`)}
                className={`w-full py-2.5 rounded-xl text-sm font-semibold transition ${plan.highlight ? 'bg-warning text-white hover:bg-red-500' : 'bg-indigo-premium text-white hover:bg-purple-premium'}`}>
                {plan.cta}
              </button>
            </motion.div>
          ))}
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="w-full bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-5 py-4 text-left text-sm font-semibold text-navy">Feature</th>
                {PLANS.map(p => <th key={p.id} className="px-5 py-4 text-center text-sm font-semibold text-navy">{p.emoji} {p.name}</th>)}
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map((row, i) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                  <td className="px-5 py-3 text-sm text-navy font-medium">{row.feature}</td>
                  {row.values.map((v, j) => (
                    <td key={j} className="px-5 py-3 text-center text-sm">
                      {typeof v === 'boolean' ? (v ? <Check size={16} className="text-mint mx-auto" /> : <X size={16} className="text-gray-300 mx-auto" />) : <span className="text-gray-700">{v}</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="md:hidden space-y-4">
          {PLANS.map(plan => (
            <div key={plan.id} className="bg-white rounded-2xl border border-gray-200 p-5">
              <p className="font-sora font-bold text-navy mb-3">{plan.emoji} {plan.name}</p>
              <div className="space-y-2">
                {COMPARISON.map((row, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">{row.feature}</span>
                    {typeof row.values[PLANS.indexOf(plan)] === 'boolean'
                      ? (row.values[PLANS.indexOf(plan)] ? <Check size={14} className="text-mint" /> : <X size={14} className="text-gray-300" />)
                      : <span className="text-navy font-medium">{row.values[PLANS.indexOf(plan)]}</span>}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
