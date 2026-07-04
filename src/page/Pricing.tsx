import { motion } from 'framer-motion'
import { ArrowLeft, Check, Zap, Crown, Sparkles, Pencil } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function Pricing() {
  const navigate = useNavigate()

  const plans = [
    {
      id: 'free',
      name: 'Free',
      price: '0',
      period: '',
      description: 'Try STUDIA risk-free',
      icon: <Sparkles size={28} />,
      color: 'from-gray-500 to-gray-600',
      badge: null,
      highlighted: false,
      cta: 'Get Started Free',
      features: [
        '3 shared AI credits (recording, quiz, summarize)',
        'Plain text AI notes',
        'Basic quiz generation',
        'Offline vault',
        'Exam countdown',
        'Unit management',
      ],
      notIncluded: ['Smart Ink notes', 'Colored notes', 'Diagrams', 'Past paper AI', 'SnapSolve'],
    },
    {
      id: 'lite',
      name: 'Lite',
      price: '60–110',
      period: 'per lecture',
      description: 'Pay only when you study',
      icon: <Pencil size={28} />,
      color: 'from-light-blue to-indigo-premium',
      badge: null,
      highlighted: false,
      cta: 'Pay Per Lecture',
      features: [
        'KSh 60 for up to 1hr lecture',
        'KSh 110 for up to 2hr lecture',
        '✏️ Sketch-style Smart Ink notes',
        'Regular color headings & callouts',
        'Sketch-style 2D flowcharts',
        '1 bonus AI credit per lecture paid',
        'Quiz & summarize included',
        'Offline vault',
      ],
      notIncluded: ['Full color system', '3D diagrams', 'Past paper AI', 'SnapSolve'],
    },
    {
      id: 'pro',
      name: 'Pro',
      price: '450',
      period: '/month',
      description: 'Unlimited AI for serious students',
      icon: <Sparkles size={28} />,
      color: 'from-mint to-light-blue',
      badge: null,
      highlighted: false,
      cta: 'Choose Pro',
      features: [
        'Unlimited lecture recordings',
        '🎨 Full color Smart Ink notes',
        'Clean 2D diagrams (flowcharts, charts, trees)',
        'Unlimited quiz generation',
        'Unlimited AI summaries',
        'Past paper AI (model answers)',
        'SnapSolve (snap a question → get answer)',
        'Deep Notes AI',
        'Adaptive learning engine',
        'Semester planner',
        'Priority AI processing',
        'Offline vault',
      ],
      notIncluded: ['3D gradient diagrams', 'Intense gradient color system'],
    },
    {
      id: 'semester',
      name: 'Semester Pass',
      price: '800',
      period: '/semester',
      description: 'Maximum power for exam season',
      icon: <Crown size={32} />,
      color: 'from-warning to-red-500',
      badge: '🏆 Best Value',
      highlighted: true,
      cta: 'Get Semester Pass',
      features: [
        'Everything in Pro',
        '🌟 Intense gradient Smart Ink notes',
        '3D gradient diagrams with depth & shadows',
        'Full subject-aware color system',
        'Unlimited all AI features',
        'Priority AI queue',
        'Campus Ambassador eligibility',
        'Best value — save vs monthly Pro',
      ],
      notIncluded: [],
    },
  ]

  const comparisonRows = [
    { feature: 'AI Lecture Processing', values: ['3 credits', 'Pay/lecture', '∞', '∞'] },
    { feature: 'Smart Ink Notes', values: ['Plain text', '✏️ Sketch', '🎨 Full color', '🌟 Intense gradient'] },
    { feature: 'Diagrams', values: ['✗', '✏️ Sketch 2D', '📊 Clean 2D', '🔷 3D gradient'] },
    { feature: 'Quiz Generation', values: ['✓', '✓', '✓', '✓'] },
    { feature: 'AI Summaries', values: ['✓', '✓', '✓', '✓'] },
    { feature: 'Past Paper AI', values: ['✗', '✗', '✓', '✓'] },
    { feature: 'SnapSolve', values: ['✗', '✗', '✓', '✓'] },
    { feature: 'Deep Notes AI', values: ['✗', '✗', '✓', '✓'] },
    { feature: 'Adaptive Learning', values: ['✗', '✗', '✓', '✓'] },
    { feature: 'Offline Vault', values: ['✓', '✓', '✓', '✓'] },
    { feature: 'Priority Processing', values: ['✗', '✗', '✓', '✓'] },
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
            <span className="font-sora font-bold text-lg text-navy">STUDIA</span>
            <sup className="text-indigo-premium text-xs">β</sup>
          </div>
          <div className="w-16" />
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-16">

          {/* Header */}
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="font-sora font-bold text-4xl sm:text-5xl text-navy mb-4">Simple, Transparent Pricing</h1>
            <p className="text-lg sm:text-xl text-gray-600 mb-6">
              From free to full power — choose the plan that matches how seriously you study.
            </p>
            <div className="inline-flex flex-wrap justify-center gap-2">
              <span className="bg-mint/20 text-mint px-3 py-1.5 rounded-full text-xs font-semibold">✓ Smart Ink Notes</span>
              <span className="bg-indigo-premium/10 text-indigo-premium px-3 py-1.5 rounded-full text-xs font-semibold">✓ AI Diagrams</span>
              <span className="bg-purple-premium/10 text-purple-premium px-3 py-1.5 rounded-full text-xs font-semibold">✓ M-Pesa Payments</span>
              <span className="bg-warning/10 text-warning px-3 py-1.5 rounded-full text-xs font-semibold">✓ Offline Vault</span>
            </div>
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
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-warning text-white px-4 py-1 rounded-full text-xs font-bold whitespace-nowrap">
                    {plan.badge}
                  </div>
                )}

                <div className="mb-5">
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${plan.color} text-white flex items-center justify-center mb-4`}>
                    {plan.icon}
                  </div>
                  <h3 className="font-sora font-bold text-xl text-navy">{plan.name}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{plan.description}</p>
                </div>

                <div className="mb-5">
                  <div className="flex items-baseline gap-1 flex-wrap">
                    <span className="text-3xl sm:text-4xl font-bold text-navy">KSh {plan.price}</span>
                    {plan.period && <span className="text-gray-500 text-sm">{plan.period}</span>}
                  </div>
                </div>

                <button
                  onClick={() => navigate(`/checkout?plan=${plan.id}`)}
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
                      <Check className="text-mint shrink-0 mt-0.5" size={15} />
                      <span className="text-xs text-gray-700 break-words">{feature}</span>
                    </div>
                  ))}
                  {plan.notIncluded.map((feature, j) => (
                    <div key={j} className="flex items-start gap-2 opacity-40">
                      <span className="text-gray-400 shrink-0 text-xs mt-0.5">✗</span>
                      <span className="text-xs text-gray-400 break-words line-through">{feature}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Smart Ink highlight section */}
          <div className="bg-gradient-to-r from-indigo-premium/5 to-purple-premium/5 rounded-3xl p-8 sm:p-10 border border-indigo-premium/20">
            <div className="text-center mb-8">
              <h2 className="font-sora font-bold text-3xl text-navy mb-3">🖍️ Smart Ink Notes — Tiered by Plan</h2>
              <p className="text-gray-600 max-w-2xl mx-auto">Every plan gets AI notes from your recordings — but higher tiers unlock progressively richer visual formatting, color systems, and diagram styles.</p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { tier: 'Free', style: 'Plain text', diagram: 'No diagrams', color: 'border-gray-200', text: 'text-gray-500', preview: '## Heading\nDefinition: term...\nExample: case...' },
                { tier: 'Lite', style: '✏️ Sketch colors', diagram: 'Sketch 2D flowcharts', color: 'border-light-blue/40', text: 'text-light-blue', preview: '🔴 Heading\n🔵 Definition\n🟢 Example\n✏️ [Flowchart]' },
                { tier: 'Pro', style: '🎨 Full color', diagram: 'Clean 2D diagrams', color: 'border-mint/40', text: 'text-mint', preview: '🔴 Heading\n💙 Definition\n💚 Example\n📊 [2D Diagram]' },
                { tier: 'Semester', style: '🌟 Intense gradient', diagram: '3D gradient diagrams', color: 'border-warning/40', text: 'text-warning', preview: '🌈 Heading\n✨ Definition\n💫 Example\n🔷 [3D Diagram]' },
              ].map((item, i) => (
                <div key={i} className={`bg-white rounded-xl p-4 border-2 ${item.color}`}>
                  <p className={`font-sora font-bold text-sm mb-1 ${item.text}`}>{item.tier}</p>
                  <p className="text-xs text-gray-600 mb-1">{item.style}</p>
                  <p className="text-xs text-gray-500 mb-3">{item.diagram}</p>
                  <div className="bg-gray-50 rounded-lg p-2 font-mono text-[9px] text-gray-400 whitespace-pre-line leading-relaxed">
                    {item.preview}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Comparison table */}
          <div>
            <h2 className="font-sora font-bold text-2xl sm:text-3xl text-navy text-center mb-8">Full Feature Comparison</h2>

            {/* Mobile cards */}
            <div className="sm:hidden space-y-3">
              {comparisonRows.map((row, i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-200 p-4">
                  <p className="font-sora font-semibold text-navy text-sm mb-3">{row.feature}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {['Free', 'Lite', 'Pro', 'Semester'].map((label, j) => (
                      <div key={j} className="text-center">
                        <p className="text-[10px] text-gray-400 mb-1">{label}</p>
                        <p className={`text-xs font-medium ${
                          row.values[j] === '✗' ? 'text-gray-300'
                          : row.values[j] === '✓' ? 'text-mint font-bold'
                          : 'text-gray-700'
                        }`}>
                          {row.values[j]}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden sm:block bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-6 py-4 text-left font-sora font-bold text-navy">Feature</th>
                    <th className="px-4 py-4 text-center font-semibold text-gray-500 text-sm">Free</th>
                    <th className="px-4 py-4 text-center font-semibold text-light-blue text-sm">Lite</th>
                    <th className="px-4 py-4 text-center font-semibold text-mint text-sm">Pro</th>
                    <th className="px-4 py-4 text-center font-semibold text-warning text-sm">Semester</th>
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
                            <span className="text-gray-700">{val}</span>
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
                { q: 'What are Smart Ink Notes?', a: 'Smart Ink Notes is STUDIA\'s AI note-formatting system — it turns your lecture transcript into color-coded, structured notes with callout boxes, defined key terms, exam tips, and auto-generated diagrams. The visual richness depends on your plan.' },
                { q: 'What\'s the difference between 2D and 3D diagrams?', a: 'Pro plan gets clean, flat 2D flowcharts and comparison charts with solid borders. Semester plan gets the same diagrams with added depth: gradient fills, drop shadows, and layered styling that gives a premium 3D appearance.' },
                { q: 'Can I switch plans anytime?', a: 'Yes. Upgrade or downgrade at any time — changes take effect immediately.' },
                { q: 'Is M-Pesa the only payment method?', a: 'Yes, currently. We support M-Pesa for all plans and Lite per-lecture payments.' },
                { q: 'What if AI processing fails?', a: 'Your payment is automatically protected. If notes generation fails, you keep the recording and can retry.' },
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
            <p className="text-lg text-white/90 mb-8">3 free AI credits included — no card, no commitment.</p>
            <button onClick={() => navigate('/signup')} className="bg-white text-indigo-premium px-8 py-4 rounded-xl font-bold hover:bg-gray-100 transition inline-block">
              Get Started Free
            </button>
          </div>

        </motion.div>
      </div>
    </div>
  )
}
