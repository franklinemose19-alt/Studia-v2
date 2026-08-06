import { motion } from 'framer-motion'
import { ArrowLeft, Check } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const PLANS = [
  {
    id: 'explorer',
    emoji: '🌍',
    name: 'Explorer',
    price: '0',
    period: '',
    priceSub: 'Free forever',
    description: 'Try STUDIA risk-free',
    badge: null,
    highlighted: false,
    cta: 'Start Free',
    features: [
      '3 lifetime AI lectures (no reset)',
      'Smart Ink notes — plain text',
      'AI Quiz generation',
      'AI Summarize',
      'Exam countdown',
      'Unit management',
      'Offline vault',
    ],
    locked: [
      'Colored Smart Ink notes',
      'Premium diagrams',
      'SnapSolve',
      'Past Paper AI',
    ],
  },
  {
    id: 'achiever',
    emoji: '🎯',
    name: 'Achiever',
    price: '49',
    period: '/lecture',
    priceSub: 'Or KSh 79 for 2 hours',
    description: 'Pay only when you study',
    badge: '⭐ Most Popular',
    highlighted: false,
    cta: 'Pay Per Lecture',
    features: [
      'KSh 49 — up to 1 hour lecture',
      'KSh 79 — up to 2 hours lecture',
      'Sketch-style Smart Ink notes',
      'Color headings & callouts',
      '+1 bonus AI credit per lecture paid',
      'Quiz & summarize included',
      'Offline vault',
    ],
    locked: [
      'Monthly lecture allowance',
      'Full color Smart Ink system',
      'Premium diagrams',
      'SnapSolve & Past Paper AI',
    ],
  },
  {
    id: 'excellence',
    emoji: '🚀',
    name: 'Excellence',
    price: '399',
    period: '/month',
    priceSub: '25 AI lectures every month',
    description: 'For consistent studiers',
    badge: null,
    highlighted: false,
    cta: 'Choose Excellence',
    features: [
      '25 AI lecture recordings/month',
      'Full color Smart Ink notes',
      'Clean 2D diagrams',
      'Unlimited quiz generation',
      'Unlimited AI summaries',
      'Past Paper AI (model answers)',
      'SnapSolve — snap → instant answer',
      'Deep Notes AI',
      'Priority AI processing',
      'Offline vault',
    ],
    locked: ['Premium gradient diagrams'],
  },
  {
    id: 'valedictorian',
    emoji: '🏆',
    name: 'Valedictorian',
    price: '1,200',
    period: '/semester',
    priceSub: '80 AI lectures every semester',
    description: 'The complete STUDIA experience',
    badge: '🔥 Best Value',
    highlighted: true,
    cta: 'Get Valedictorian',
    features: [
      '80 AI lecture recordings/semester',
      'Premium gradient Smart Ink notes',
      'Premium gradient diagrams',
      'Full subject-aware color system',
      'Unlimited SnapSolve',
      'Unlimited Past Paper AI',
      'Smart semester planner',
      'Adaptive learning engine',
      'Priority AI queue',
      'Campus Ambassador eligibility',
      'Best value vs monthly Excellence',
    ],
    locked: [],
  },
]

const COMPARISON = [
  { feature: 'AI Lectures Included', values: ['3 lifetime', 'Pay/lecture', '25/month', '80/semester'] },
  { feature: 'Smart Ink Notes', values: ['Plain text', '✏️ Sketch', '🎨 Full color', '🌟 Premium gradient'] },
  { feature: 'AI Diagrams', values: ['✗', '✏️ Sketch 2D', '📊 Clean 2D', '🔷 Premium gradient'] },
  { feature: 'Quiz Generation', values: ['✓', '✓', '✓', '✓'] },
  { feature: 'AI Summaries', values: ['✓', '✓', '✓', '✓'] },
  { feature: 'Past Paper AI', values: ['✗', '✗', '✓', '✓'] },
  { feature: 'SnapSolve', values: ['✗', '✗', '✓', '✓'] },
  { feature: 'Deep Notes AI', values: ['✗', '✗', '✓', '✓'] },
  { feature: 'Priority Processing', values: ['✗', '✗', '✓', '✓'] },
  { feature: 'Offline Vault', values: ['✓', '✓', '✓', '✓'] },
]

const FAQ = [
  {
    q: 'What happens after my 3 free lectures?',
    a: 'All AI generation features are permanently locked — there is no reset. You\'ll need to upgrade to Achiever (KSh 49–79/lecture), Excellence (KSh 399/month), or Valedictorian (KSh 1,200/semester).',
  },
  {
    q: 'What counts as one AI lecture?',
    a: 'One full lecture recording with AI transcription and Smart Ink notes generation. Quiz generation, summaries, SnapSolve, and Deep Notes use a separate bonus credit system.',
  },
  {
    q: 'Do Excellence and Valedictorian allowances reset?',
    a: 'Excellence resets 25 lectures every month on your billing date. Valedictorian gives 80 lectures every 6 months. Unused lectures do not carry over.',
  },
  {
    q: 'Can I pay using M-Pesa?',
    a: 'Yes — M-Pesa is the only payment method STUDIA supports. All payments are made via M-Pesa STK push directly inside the app.',
  },
  {
    q: 'Can I study offline?',
    a: 'Yes. Install STUDIA as a PWA and all your notes, recordings, and quiz results are saved locally in the Offline Vault. No internet needed for revision.',
  },
]

export default function Pricing() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-surface-light to-white">
      <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 text-navy hover:text-indigo-premium transition">
            <ArrowLeft size={20} />
            <span className="font-medium hidden sm:inline">Back</span>
          </button>
          <div className="flex items-center gap-1">
            <span className="font-sora font-bold text-lg text-navy">STUDIA AI</span>
          </div>
          <button onClick={() => navigate('/signup')} className="bg-indigo-premium text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-purple-premium transition">
            Start Free
          </button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16 space-y-16">

        {/* Header */}
        <div className="text-center max-w-2xl mx-auto">
          <h1 className="font-sora font-bold text-4xl sm:text-5xl text-navy mb-4">Study Smarter. Pay Less.</h1>
          <p className="text-gray-500 text-lg">Every plan built for Kenyan university students. Start free — upgrade anytime via M-Pesa.</p>
        </div>

        {/* Explorer notice */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 max-w-2xl mx-auto text-center">
          <p className="text-amber-800 font-semibold text-sm mb-1">⚠️ Explorer Free Plan Notice</p>
          <p className="text-amber-700 text-xs">Explorer gives you exactly 3 lifetime AI lectures. Once used, AI generation locks permanently — no reset, ever.</p>
        </div>

        {/* Plan cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 items-start">
          {PLANS.map((plan, i) => (
            <motion.div key={plan.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
              className={`relative rounded-2xl p-6 border flex flex-col ${
                plan.highlighted
                  ? 'bg-gradient-to-br from-warning/15 to-red-500/10 border-warning/50 shadow-2xl ring-2 ring-warning/30'
                  : 'bg-white border-gray-200 hover:border-indigo-premium/40 hover:shadow-lg transition'
              }`}>
              {plan.badge && (
                <div className={`absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold text-white whitespace-nowrap ${
                  plan.highlighted ? 'bg-warning' : 'bg-light-blue'
                }`}>
                  {plan.badge}
                </div>
              )}

              <div className="mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-3xl">{plan.emoji}</span>
                </div>
                <h3 className="font-sora font-bold text-xl text-navy">{plan.name}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{plan.description}</p>
              </div>

              <div className="mb-5">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-navy">KSh {plan.price}</span>
                  {plan.period && <span className="text-gray-500 text-sm">{plan.period}</span>}
                </div>
                <p className="text-xs text-indigo-premium mt-1 font-medium">{plan.priceSub}</p>
              </div>

              <button
                onClick={() => navigate(`/checkout?plan=${plan.id}`)}
                className={`w-full py-3 rounded-xl font-semibold text-sm mb-5 transition ${
                  plan.highlighted
                    ? 'bg-warning text-white hover:bg-orange-600'
                    : 'bg-indigo-premium text-white hover:bg-purple-premium'
                }`}
              >
                {plan.cta}
              </button>

              <div className="space-y-2 flex-1">
                {plan.features.map((f, j) => (
                  <div key={j} className="flex items-start gap-2">
                    <Check size={13} className="text-mint shrink-0 mt-0.5" />
                    <span className="text-xs text-gray-700">{f}</span>
                  </div>
                ))}
                {plan.locked.map((f, j) => (
                  <div key={j} className="flex items-start gap-2 opacity-35">
                    <span className="text-gray-400 text-xs shrink-0 mt-0.5">✗</span>
                    <span className="text-xs text-gray-400 line-through">{f}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Lecture allowances visual */}
        <div className="bg-gradient-to-r from-indigo-premium/5 to-purple-premium/5 rounded-3xl p-8 border border-indigo-premium/15">
          <div className="text-center mb-8">
            <h2 className="font-sora font-bold text-2xl sm:text-3xl text-navy mb-2">AI Lecture Allowances</h2>
            <p className="text-gray-500 text-sm">Once used, upgrade to get more — unused lectures don't carry over.</p>
          </div>
          <div className="grid sm:grid-cols-4 gap-4">
            {[
              { plan: 'Explorer', emoji: '🌍', value: '3', note: 'lifetime total', border: 'border-gray-200 bg-gray-50', text: 'text-gray-500' },
              { plan: 'Achiever', emoji: '🎯', value: 'Pay/session', note: 'KSh 49 or 79 each', border: 'border-light-blue/30 bg-blue-50/50', text: 'text-light-blue' },
              { plan: 'Excellence', emoji: '🚀', value: '25', note: 'per month', border: 'border-mint/30 bg-green-50/50', text: 'text-mint' },
              { plan: 'Valedictorian', emoji: '🏆', value: '80', note: 'per semester', border: 'border-warning/40 bg-amber-50/50', text: 'text-warning' },
            ].map((item, i) => (
              <div key={i} className={`rounded-2xl p-5 border-2 ${item.border} text-center`}>
                <p className="text-3xl mb-2">{item.emoji}</p>
                <p className={`font-sora font-bold text-sm ${item.text} mb-1`}>{item.plan}</p>
                <p className={`font-bold text-3xl ${item.text}`}>{item.value}</p>
                <p className="text-[10px] text-gray-500 mt-1">{item.note}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Feature comparison */}
        <div>
          <h2 className="font-sora font-bold text-2xl sm:text-3xl text-navy text-center mb-8">Full Feature Comparison</h2>

          {/* Mobile */}
          <div className="sm:hidden space-y-3">
            {COMPARISON.map((row, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-4">
                <p className="font-semibold text-navy text-sm mb-3">{row.feature}</p>
                <div className="grid grid-cols-2 gap-2">
                  {['Explorer', 'Achiever', 'Excellence', 'Valedictorian'].map((plan, j) => (
                    <div key={j} className="text-center">
                      <p className="text-[10px] text-gray-400 mb-1">{plan}</p>
                      <p className={`text-xs font-medium ${row.values[j] === '✗' ? 'text-gray-300' : row.values[j] === '✓' ? 'text-mint font-bold' : 'text-gray-700'}`}>
                        {row.values[j]}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Desktop */}
          <div className="hidden sm:block bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-6 py-4 text-left font-sora font-bold text-navy">Feature</th>
                  <th className="px-4 py-4 text-center font-semibold text-gray-400 text-sm">🌍 Explorer</th>
                  <th className="px-4 py-4 text-center font-semibold text-light-blue text-sm">🎯 Achiever</th>
                  <th className="px-4 py-4 text-center font-semibold text-mint text-sm">🚀 Excellence</th>
                  <th className="px-4 py-4 text-center font-semibold text-warning text-sm">🏆 Valedictorian</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((row, i) => (
                  <tr key={i} className="border-b border-gray-100 hover:bg-gray-50 transition">
                    <td className="px-6 py-3.5 font-medium text-gray-700 text-sm">{row.feature}</td>
                    {row.values.map((val, j) => (
                      <td key={j} className="px-4 py-3.5 text-center">
                        {val === '✓' ? <span className="text-mint font-bold">✓</span>
                          : val === '✗' ? <span className="text-gray-300">✗</span>
                          : <span className="text-gray-700 text-xs">{val}</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ */}
        <div className="max-w-3xl mx-auto">
          <h2 className="font-sora font-bold text-2xl sm:text-3xl text-navy mb-8 text-center">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {FAQ.map((item, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-5">
                <p className="font-semibold text-navy mb-2 text-sm sm:text-base">{item.q}</p>
                <p className="text-gray-500 text-sm">{item.a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="bg-gradient-to-r from-indigo-premium to-purple-premium rounded-3xl p-8 sm:p-12 text-center text-white">
          <h2 className="font-sora font-bold text-3xl sm:text-4xl mb-4">Start studying smarter today.</h2>
          <p className="text-white/80 text-lg mb-8">3 free AI lectures. No card. No commitment.</p>
          <button onClick={() => navigate('/signup')} className="bg-white text-indigo-premium px-8 py-4 rounded-xl font-bold text-lg hover:bg-gray-100 transition">
            Get Started Free
          </button>
        </div>

      </div>
    </div>
  )
}
