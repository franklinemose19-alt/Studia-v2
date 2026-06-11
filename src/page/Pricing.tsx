import { motion } from 'framer-motion'
import { ArrowLeft, Check, Zap, Crown, Sparkles } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface Plan {
  id: string
  name: string
  price: string | number
  period: string
  description: string
  icon: React.ReactNode
  features: string[]
  highlighted: boolean
  badge?: string
  cta: string
  color: string
}

export default function Pricing() {
  const navigate = useNavigate()

  const plans: Plan[] = [
    {
      id: 'free',
      name: 'Free',
      price: '0',
      period: '',
      description: 'Best for trying STUDIA',
      icon: <Sparkles size={32} />,
      features: [
        '3 full AI lecture recordings',
        'AI transcript & summary',
        'Revision notes',
        'Quiz generation',
        'Basic narration',
        'Limited SnapSolve',
        'Offline vault',
        'Copy feature',
      ],
      highlighted: false,
      cta: 'Get Started Free',
      color: 'from-gray-500 to-gray-600',
    },
    {
      id: 'lite',
      name: 'Lite',
      price: '25-45',
      period: 'per lecture',
      description: 'Pay as you study',
      icon: <Zap size={32} />,
      features: [
        'Full AI lecture processing',
        'Transcript & notes',
        'Deep revision notes',
        'Quiz generation',
        'Narration',
        'Offline vault',
        'Secure escrow payment',
        'Copy feature',
      ],
      highlighted: false,
      cta: 'Start Paying Per Lecture',
      color: 'from-light-blue to-indigo-premium',
    },
    {
      id: 'plus',
      name: 'Plus',
      price: '250',
      period: '/month',
      description: 'For serious students',
      icon: <Crown size={32} />,
      features: [
        'Unlimited lecture recordings',
        'SmartCapture AI',
        'Unlimited transcripts',
        'Unlimited summaries',
        'Unlimited quizzes',
        'Semester planner',
        'Adaptive learning engine',
        'Weak topic detection',
        'Priority storage',
      ],
      highlighted: false,
      cta: 'Choose Plus',
      color: 'from-purple-premium to-indigo-premium',
    },
    {
      id: 'pro',
      name: 'Pro',
      price: '450',
      period: '/month',
      description: 'Complete exam prep',
      icon: <Sparkles size={32} />,
      features: [
        'Everything in Plus',
        'Unlimited SnapSolve',
        'Unlimited past paper analysis',
        'AI model answers',
        'Exam prediction engine',
        'Answer structuring by marks',
        'Exam strategy coaching',
        'Advanced revision packs',
      ],
      highlighted: false,
      cta: 'Choose Pro',
      color: 'from-mint to-light-blue',
    },
    {
      id: 'semester',
      name: 'Semester Pass',
      price: '800',
      period: '/semester',
      description: 'Complete STUDIA experience',
      icon: <Crown size={40} />,
      features: [
        'Unlimited lecture recording',
        'Unlimited AI processing',
        'Unlimited SnapSolve',
        'Unlimited past papers',
        'Unlimited model answers',
        'Smart semester planner',
        'Adaptive learning',
        'SmartCapture AI',
        'Full offline vault',
        'Priority AI queue',
        'Premium support',
      ],
      highlighted: true,
      badge: '🏆 Most Popular',
      cta: 'Get Semester Pass',
      color: 'from-warning to-red-500',
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-surface-light to-white">
      <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-navy hover:text-indigo-premium transition"
          >
            <ArrowLeft size={20} />
            <span className="font-medium">Back</span>
          </button>
          <div className="flex items-center gap-1">
            <span className="font-sora font-bold text-lg text-navy">STUDIA</span>
            <sup className="text-indigo-premium text-xs">β</sup>
          </div>
          <div className="w-20" />
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-16">
          {/* HEADER */}
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="font-sora font-bold text-5xl text-navy mb-4">Simple, Transparent Pricing</h1>
            <p className="text-xl text-gray-600 mb-8">
              Choose the plan that fits your study needs. Upgrade or downgrade anytime.
            </p>
            <div className="inline-block bg-mint/20 text-mint px-4 py-2 rounded-full text-sm font-semibold">
              ✨ All plans include offline access & secure payment protection
            </div>
          </div>

          {/* PRICING CARDS */}
          <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-6">
            {plans.map((plan, i) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`relative rounded-2xl p-8 border transition-all ${
                  plan.highlighted
                    ? 'bg-gradient-to-br from-warning/20 to-red-500/20 border-warning/40 shadow-2xl scale-105 lg:col-span-1'
                    : 'bg-white border-gray-200 hover:border-indigo-premium/50 hover:shadow-lg'
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-warning text-white px-4 py-1 rounded-full text-sm font-bold">
                    {plan.badge}
                  </div>
                )}

                <div className="mb-6">
                  <div className={`w-16 h-16 rounded-lg bg-gradient-to-br ${plan.color} text-white flex items-center justify-center mb-4`}>
                    {plan.icon}
                  </div>
                  <h3 className="font-sora font-bold text-2xl text-navy">{plan.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">{plan.description}</p>
                </div>

                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-navy">KSh {plan.price}</span>
                    {plan.period && <span className="text-gray-600">{plan.period}</span>}
                  </div>
                </div>

                <button
                  onClick={() => navigate(`/checkout?plan=${plan.id}`)}
                  className={`w-full py-3 rounded-xl font-semibold mb-6 transition ${
                    plan.highlighted
                      ? 'bg-warning text-white hover:bg-red-500'
                      : 'bg-indigo-premium text-white hover:bg-purple-premium'
                  }`}
                >
                  {plan.cta}
                </button>

                <div className="space-y-3">
                  {plan.features.map((feature, j) => (
                    <div key={j} className="flex items-start gap-3">
                      <Check className="text-mint flex-shrink-0 mt-1" size={18} />
                      <span className="text-sm text-gray-700">{feature}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>

          {/* COMPARISON TABLE */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-6 py-4 text-left font-sora font-bold text-navy">Feature</th>
                    <th className="px-6 py-4 text-center font-semibold text-gray-600">Free</th>
                    <th className="px-6 py-4 text-center font-semibold text-gray-600">Lite</th>
                    <th className="px-6 py-4 text-center font-semibold text-gray-600">Plus</th>
                    <th className="px-6 py-4 text-center font-semibold text-gray-600">Pro</th>
                    <th className="px-6 py-4 text-center font-semibold text-warning">Semester</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { feature: 'AI Lecture Processing', values: ['✓', '✓', '✓', '✓', '✓'] },
                    { feature: 'Lectures Recorded', values: ['3', 'Pay', '∞', '∞', '∞'] },
                    { feature: 'AI Summaries', values: ['✓', '✓', '✓', '✓', '✓'] },
                    { feature: 'Quiz Generation', values: ['✓', '✓', '✓', '✓', '✓'] },
                    { feature: 'SnapSolve', values: ['Limited', 'Limited', 'Limited', '✓', '✓'] },
                    { feature: 'Past Paper AI', values: ['Limited', 'Limited', 'Limited', '✓', '✓'] },
                    { feature: 'Offline Vault', values: ['✓', '✓', '✓', '✓', '✓'] },
                    { feature: 'Priority Processing', values: ['✗', '✗', '✗', '✓', '✓'] },
                  ].map((row, i) => (
                    <tr key={i} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-700">{row.feature}</td>
                      {row.values.map((val, j) => (
                        <td key={j} className="px-6 py-4 text-center text-gray-600">
                          {val === '✓' ? (
                            <span className="text-mint font-bold">✓</span>
                          ) : val === '✗' ? (
                            <span className="text-gray-400">✗</span>
                          ) : (
                            <span>{val}</span>
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
            <h2 className="font-sora font-bold text-3xl text-navy mb-8 text-center">Frequently Asked Questions</h2>
            <div className="space-y-4">
              {[
                {
                  q: 'Can I switch plans anytime?',
                  a: 'Yes! Upgrade or downgrade your plan at any time. Changes take effect immediately.',
                },
                {
                  q: 'Is my payment secure?',
                  a: 'Yes. We use M-Pesa escrow protection. Funds are held securely and released only after successful processing.',
                },
                {
                  q: 'What if AI processing fails?',
                  a: 'No problem! Your payment is automatically refunded or you can retry at no cost.',
                },
                {
                  q: 'Do I need internet to use STUDIA?',
                  a: 'After downloading to your Offline Vault, you can study without internet. Recording & processing require internet.',
                },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-xl p-6 border border-gray-200"
                >
                  <p className="font-semibold text-navy mb-2">{item.q}</p>
                  <p className="text-gray-600">{item.a}</p>
                </motion.div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="bg-gradient-to-r from-indigo-premium to-purple-premium rounded-3xl p-12 text-center text-white">
            <h2 className="font-sora font-bold text-4xl mb-4">Start Your STUDIA Journey</h2>
            <p className="text-lg text-white/90 mb-8">Join thousands of students acing exams with smarter study tools.</p>
            <button
              onClick={() => navigate('/signup')}
              className="bg-white text-indigo-premium px-8 py-4 rounded-xl font-bold hover:bg-gray-100 transition inline-block"
            >
              Get Started Free
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
