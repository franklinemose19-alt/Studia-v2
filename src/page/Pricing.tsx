import { motion } from 'framer-motion'
import { ArrowLeft, Check, Zap, Crown, Sparkles, Globe } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function Pricing() {
  const navigate = useNavigate()

  const plans = [
    {
      id: 'explorer',
      emoji: '🌍',
      name: 'Explorer',
      price: '0',
      period: '',
      description: 'Try STUDIA risk-free',
      icon: <Globe size={28} />,
      color: 'from-gray-400 to-gray-500',
      badge: null,
      highlighted: false,
      cta: 'Start Free',
      features: [
        '3 lifetime AI lectures (never resets)',
        'Smart Ink notes (plain text)',
        'Quiz generation',
        'AI Summarize',
        'Exam countdown',
        'Unit management',
        'Offline vault',
      ],
      locked: [
        'Colored Smart Ink notes',
        'AI diagrams',
        'SnapSolve',
        'Past Paper AI',
        'Monthly lecture allowance',
      ],
    },
    {
      id: 'achiever-1hr',
      emoji: '🎯',
      name: 'Achiever',
      price: '29',
      period: 'per hour',
      description: 'Pay only when you study',
      icon: <Zap size={28} />,
      color: 'from-light-blue to-indigo-premium',
      badge: '⭐ Most Popular',
      highlighted: false,
      cta: 'Pay Per Lecture',
      features: [
        'KSh 29 — up to 1 hour lecture',
        'KSh 49 — up to 2 hours lecture',
        '✏️ Sketch-style Smart Ink notes',
        'Regular color headings & callouts',
        'Sketch-style 2D flowcharts',
        '+1 bonus AI credit per lecture paid',
        'Quiz & summarize included',
        'Offline vault',
      ],
      locked: [
        'Monthly lecture allowance',
        'Full color system',
        '3D diagrams',
        'SnapSolve & Past Paper AI',
      ],
    },
    {
      id: 'excellence',
      emoji: '🚀',
      name: 'Excellence',
      price: '399',
      period: '/month',
      description: '25 AI lectures every month',
      icon: <Sparkles size={28} />,
      color: 'from-mint to-light-blue',
      badge: null,
      highlighted: false,
      cta: 'Choose Excellence',
      features: [
        '25 AI lecture recordings/month',
        '🎨 Full color Smart Ink notes',
        'Clean 2D diagrams (flowcharts, charts)',
        'Unlimited quiz generation',
        'Unlimited AI summaries',
        'Past Paper AI (model answers)',
        'SnapSolve (snap → instant answer)',
        'Deep Notes AI',
        'Adaptive learning engine',
        'Semester planner',
        'Priority AI processing',
        'Offline vault',
      ],
      locked: [
        '3D gradient diagrams',
        'Intense gradient color system',
      ],
    },
    {
      id: 'valedictorian',
      emoji: '🏆',
      name: 'Valedictorian',
      price: '1,200',
      period: '/semester',
      description: '80 AI lectures every semester',
      icon: <Crown size={32} />,
      color: 'from-warning to-red-500',
      badge: '🔥 Best Value',
      highlighted: true,
      cta: 'Get Valedictorian',
      features: [
        '80 AI lecture recordings/semester',
        '🌟 Intense gradient Smart Ink notes',
        '🔷 3D gradient diagrams with depth & shadows',
        'Full subject-aware color system',
        'Unlimited SnapSolve & Past Paper AI',
        'Smart semester planner',
        'Adaptive learning engine',
        'Priority AI queue',
        'Campus Ambassador eligibility',
        'Best value — save vs monthly Excellence',
      ],
      locked: [],
    },
  ]

  const comparisonRows = [
    { feature: 'AI Lectures Included', values: ['3 lifetime', 'Pay/lecture', '25/month', '80/semester'] },
    { feature: 'Smart Ink Notes', values: ['Plain text', '✏️ Sketch', '🎨 Full color', '🌟 Intense gradient'] },
    { feature: 'AI Diagrams', values: ['✗', '✏️ Sketch 2D', '📊 Clean 2D', '🔷 3D gradient'] },
    { feature: 'Quiz Generation', values: ['✓', '✓', '✓', '✓'] },
    { feature: 'AI Summaries', values: ['✓', '✓', '✓', '✓'] },
    { feature: 'Past Paper AI', values: ['✗', '✗', '✓', '✓'] },
    { feature: 'SnapSolve', values: ['✗', '✗', '✓', '✓'] },
    { feature: 'Deep Notes AI', values: ['✗', '✗', '✓', '✓'] },
    { feature: 'Adaptive Learning', values: ['✗', '✗', '✓', '✓'] },
    { feature: 'Offline Vault', values: ['✓', '✓', '✓', '✓'] },
    { feature: 'Priority Processing', values: ['✗', '✗', '✓', '✓'] },
    { feature: 'Campus Ambassador', values: ['✗', '✗', '✗', '✓'] },
  ]

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
            <sup className="text-indigo-premium text-xs">β</sup>
          </div>
          <div className="w-16" />
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-16">

          {/* Header */}
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="font-sora font-bold text-4xl sm:text-5xl text-navy mb-4">
              Study Smarter. Pay Less.
            </h1>
            <p className="text-lg sm:text-xl text-gray-600 mb-6">
              From free to full power — every plan built specifically for Kenyan university students.
            </p>
            <div className="inline-flex flex-wrap justify-center gap-2">
              <span className="bg-mint/20 text-mint px-3 py-1.5 rounded-full text-xs font-semibold">✓ Smart Ink Notes</span>
              <span className="bg-indigo-premium/10 text-indigo-premium px-3 py-1.5 rounded-full text-xs font-semibold">✓ AI Diagrams</span>
              <span className="bg-green-500/10 text-green-600 px-3 py-1.5 rounded-full text-xs font-semibold">✓ M-Pesa Payments</span>
              <span className="bg-warning/10 text-warning px-3 py-1.5 rounded-full text-xs font-semibold">✓ Works Offline</span>
            </div>
          </div>

          {/* Explorer lifetime lock notice */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 max-w-2xl mx-auto text-center">
            <p className="text-amber-800 font-semibold text-sm mb-1">⚠️ Explorer Free Plan Notice</p>
            <p className="text-amber-700 text-xs">Explorer gives you exactly 3 lifetime AI lectures. Once used, all AI features lock permanently — you'll need to upgrade to continue. There is no reset.</p>
          </div>

          {/* Plan cards */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {plans.map((plan, i) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`relative rounded-2xl p-6 border flex flex-col transition-all ${
                  plan.highlighted
                    ? 'bg-gradient-to-br from-warning/20 to-red-500/10 border-warning/40 shadow-2xl scale-105'
                    : 'bg-white border-gray-200 hover:border-indigo-premium/50 hover:shadow-lg'
                }`}
              >
                {plan.badge && (
                  <div className={`absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold whitespace-nowrap text-white ${
                    plan.highlighted ? 'bg-warning' : 'bg-light-blue'
                  }`}>
                    {plan.badge}
                  </div>
                )}

                <div className="mb-5">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-3xl">{plan.emoji}</span>
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${plan.color} text-white flex items-center justify-center`}>
                      {plan.icon}
                    </div>
                  </div>
                  <h3 className="font-sora font-bold text-xl text-navy">{plan.name}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{plan.description}</p>
                </div>

                <div className="mb-5">
                  <div className="flex items-baseline gap-1 flex-wrap">
                    <span className="text-3xl sm:text-4xl font-bold text-navy">KSh {plan.price}</span>
                    {plan.period && <span className="text-gray-500 text-sm">{plan.period}</span>}
                  </div>
                  {plan.id === 'achiever-1hr' && (
                    <p className="text-xs text-light-blue font-medium mt-1">Or KSh 49 for 2-hour lecture</p>
                  )}
                </div>

                <button
                  onClick={() => navigate(`/checkout?plan=${plan.id === 'achiever-1hr' ? 'achiever' : plan.id}`)}
                  className={`w-full py-3 rounded-xl font-semibold mb-5 transition text-sm ${
                    plan.highlighted
                      ? 'bg-warning text-white hover:bg-red-500'
                      : 'bg-indigo-premium text-white hover:bg-purple-premium'
                  }`}
                >
                  {plan.cta}
                </button>

                <div className="space-y-2 flex-1">
                  {plan.features.map((feature, j) => (
                    <div key={j} className="flex items-start gap-2">
                      <Check className="text-mint shrink-0 mt-0.5" size={14} />
                      <span className="text-xs text-gray-700 break-words">{feature}</span>
                    </div>
                  ))}
                  {plan.locked.map((feature, j) => (
                    <div key={j} className="flex items-start gap-2 opacity-35">
                      <span className="text-gray-400 shrink-0 text-xs mt-0.5">✗</span>
                      <span className="text-xs text-gray-400 break-words line-through">{feature}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Lecture allowance visual */}
          <div className="bg-gradient-to-r from-indigo-premium/5 to-purple-premium/5 rounded-3xl p-8 sm:p-10 border border-indigo-premium/20">
            <div className="text-center mb-8">
              <h2 className="font-sora font-bold text-2xl sm:text-3xl text-navy mb-3">AI Lecture Allowances</h2>
              <p className="text-gray-600 max-w-xl mx-auto text-sm">Every plan includes a set number of full AI lecture recordings. Once used, upgrade to get more.</p>
            </div>
            <div className="grid sm:grid-cols-4 gap-4">
              {[
                { plan: 'Explorer', emoji: '🌍', lectures: 3, note: 'lifetime total', color: 'border-gray-200 bg-gray-50', textColor: 'text-gray-500' },
                { plan: 'Achiever', emoji: '🎯', lectures: null, note: 'KSh 29–49 per session', color: 'border-light-blue/40 bg-blue-50/50', textColor: 'text-light-blue' },
                { plan: 'Excellence', emoji: '🚀', lectures: 25, note: 'per month (resets monthly)', color: 'border-mint/40 bg-green-50/50', textColor: 'text-mint' },
                { plan: 'Valedictorian', emoji: '🏆', lectures: 80, note: 'per semester (6 months)', color: 'border-warning/50 bg-orange-50/50', textColor: 'text-warning' },
              ].map((item, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                  className={`rounded-2xl p-5 border-2 ${item.color} text-center`}>
                  <p className="text-3xl mb-2">{item.emoji}</p>
                  <p className={`font-sora font-bold text-sm ${item.textColor} mb-1`}>{item.plan}</p>
                  <p className={`font-bold text-3xl ${item.textColor}`}>
                    {item.lectures !== null ? item.lectures : '∞'}
                  </p>
                  <p className="text-[10px] text-gray-500 mt-1">{item.note}</p>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Comparison table */}
          <div>
            <h2 className="font-sora font-bold text-2xl sm:text-3xl text-navy text-center mb-8">Full Feature Comparison</h2>

            {/* Mobile */}
            <div className="sm:hidden space-y-3">
              {comparisonRows.map((row, i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-200 p-4">
                  <p className="font-sora font-semibold text-navy text-sm mb-3">{row.feature}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {['Explorer', 'Achiever', 'Excellence', 'Valedictorian'].map((label, j) => (
                      <div key={j} className="text-center">
                        <p className="text-[10px] text-gray-400 mb-1">{label}</p>
                        <p className={`text-xs font-medium ${
                          row.values[j] === '✗' ? 'text-gray-300'
                          : row.values[j] === '✓' ? 'text-mint font-bold'
                          : 'text-gray-700'
                        }`}>{row.values[j]}</p>
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
                    <th className="px-4 py-4 text-center font-semibold text-gray-500 text-sm">🌍 Explorer</th>
                    <th className="px-4 py-4 text-center font-semibold text-light-blue text-sm">🎯 Achiever</th>
                    <th className="px-4 py-4 text-center font-semibold text-mint text-sm">🚀 Excellence</th>
                    <th className="px-4 py-4 text-center font-semibold text-warning text-sm">🏆 Valedictorian</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonRows.map((row, i) => (
                    <tr key={i} className="border-b border-gray-100 hover:bg-gray-50 transition">
                      <td className="px-6 py-3.5 font-medium text-gray-700 text-sm">{row.feature}</td>
                      {row.values.map((val, j) => (
                        <td key={j} className="px-4 py-3.5 text-center text-sm">
                          {val === '✓' ? (
                            <span className="text-mint font-bold">✓</span>
                          ) : val === '✗' ? (
                            <span className="text-gray-300">✗</span>
                          ) : (
                            <span className="text-gray-700 text-xs">{val}</span>
                          )}
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
              {[
                {
                  q: 'What happens after I use my 3 Explorer lectures?',
                  a: 'All AI features are permanently locked — there is no reset or renewal. You\'ll need to upgrade to Achiever (pay per lecture), Excellence (25/month), or Valedictorian (80/semester) to continue using STUDIA\'s AI features.',
                },
                {
                  q: 'What counts as one "AI lecture"?',
                  a: 'One full lecture recording with AI transcription and Smart Ink notes generation counts as one lecture. Quiz generation, AI Summarize, SnapSolve, and other features use a separate bonus credit system.',
                },
                {
                  q: 'Do Excellence and Valedictorian lecture allowances reset?',
                  a: 'Yes — Excellence resets 25 lectures every month on your billing date. Valedictorian gives 80 lectures every 6 months (one full semester). Unused lectures do not carry over.',
                },
                {
                  q: 'What is the Achiever plan exactly?',
                  a: 'Achiever is pay-per-lecture: KSh 29 unlocks one lecture of up to 1 hour, KSh 49 unlocks one lecture of up to 2 hours. Each payment also gives you 1 bonus AI credit usable on quiz, summarize, or AI Tools.',
                },
                {
                  q: 'Is M-Pesa the only payment method?',
                  a: 'Yes, currently. All plans and per-lecture payments are made via M-Pesa STK push directly from the app.',
                },
              ].map((item, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-xl p-5 border border-gray-200">
                  <p className="font-semibold text-navy mb-2 text-sm sm:text-base">{item.q}</p>
                  <p className="text-gray-600 text-sm">{item.a}</p>
                </motion.div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="bg-gradient-to-r from-indigo-premium to-purple-premium rounded-3xl p-8 sm:p-12 text-center text-white">
            <h2 className="font-sora font-bold text-3xl sm:text-4xl mb-4">Start Your STUDIA Journey</h2>
            <p className="text-lg text-white/90 mb-8">3 free AI lectures — no card, no commitment. Upgrade anytime.</p>
            <button onClick={() => navigate('/signup')} className="bg-white text-indigo-premium px-8 py-4 rounded-xl font-bold hover:bg-gray-100 transition">
              Get Started Free
            </button>
          </div>

        </motion.div>
      </div>
    </div>
  )
}
