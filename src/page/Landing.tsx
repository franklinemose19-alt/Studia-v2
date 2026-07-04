import { motion } from 'framer-motion'
import { Mic, BookOpen, Zap, Image, Calendar, Lock, Check } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function Landing() {
  const navigate = useNavigate()

  const scrollToFeatures = () => {
    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen bg-white overflow-hidden">
      <nav className="fixed w-full top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-premium to-purple-premium flex items-center justify-center">
              <span className="text-white font-bold text-xl">S</span>
            </div>
            <span className="font-sora font-bold text-navy text-lg">STUDIA AI</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <button onClick={scrollToFeatures} className="text-navy hover:text-indigo-premium transition">Features</button>
            <button onClick={() => navigate('/pricing')} className="text-navy hover:text-indigo-premium transition">Pricing</button>
            <button onClick={() => navigate('/login')} className="text-navy hover:text-indigo-premium transition">Sign In</button>
            <button onClick={() => navigate('/signup')} className="bg-indigo-premium text-white px-6 py-2 rounded-lg hover:bg-purple-premium transition">
              Get Started
            </button>
          </div>
          <button onClick={() => navigate('/signup')} className="md:hidden bg-indigo-premium text-white px-4 py-2 rounded-lg text-sm font-medium">
            Start Free
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-28 sm:pt-32 pb-16 sm:pb-20 px-4 sm:px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-premium/5 via-purple-premium/5 to-transparent" />
        <div className="max-w-7xl mx-auto relative z-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-4xl mx-auto">
            <div className="inline-block bg-indigo-premium/10 text-indigo-premium px-4 py-1.5 rounded-full text-xs font-semibold mb-6">
              🆕 Smart Ink Notes — Now with AI Diagrams
            </div>
            <h1 className="font-sora font-bold text-4xl sm:text-5xl md:text-6xl text-navy mb-6 leading-tight">
              Turn Every Lecture Into<br />
              <span className="bg-gradient-to-r from-indigo-premium to-purple-premium bg-clip-text text-transparent">Smart Study Material.</span>
            </h1>
            <p className="text-lg sm:text-xl text-gray-600 mb-8 leading-relaxed max-w-2xl mx-auto">
              Record your lecture. STUDIA transcribes it, generates color-coded Smart Ink notes with auto-diagrams, and quizzes you — automatically.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button onClick={() => navigate('/signup')} className="bg-indigo-premium text-white px-8 py-4 rounded-xl font-semibold hover:bg-purple-premium transition">
                🚀 Start Free — 3 AI Credits
              </button>
              <button onClick={() => navigate('/pricing')} className="border-2 border-navy text-navy px-8 py-4 rounded-xl font-semibold hover:bg-navy/5 transition">
                View Plans
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-4">No card needed. M-Pesa payments. Made for Kenyan students.</p>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-16 sm:py-20 px-4 sm:px-6 bg-surface-light">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-sora font-bold text-3xl sm:text-4xl text-navy mb-4">Everything You Need to Ace Exams</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">STUDIA combines recording, AI, and smart note formatting into one academic platform built for Kenyan university students.</p>
          </div>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
            {[
              { icon: Mic, title: 'Smart Recording', desc: 'Record lectures with echo cancellation, auto-transcription, and coverage tracking per unit.' },
              { icon: BookOpen, title: '🖍️ Smart Ink Notes', desc: 'AI converts your lecture into color-coded notes with headings, definitions, exam tips, and auto-diagrams.' },
              { icon: Zap, title: 'AI Quiz Engine', desc: 'Auto-generate practice MCQs from your notes or upload a past paper PDF for exam-style practice.' },
              { icon: Image, title: 'SnapSolve', desc: 'Snap a photo of any question, diagram, or whiteboard — get an instant step-by-step AI answer.' },
              { icon: Calendar, title: 'Exam Countdown', desc: 'Upload your official timetable PDF — STUDIA auto-matches exams to your units and starts the countdown.' },
              { icon: Lock, title: 'Offline Vault', desc: 'All your recordings, notes, and quizzes saved and accessible anywhere — even without internet.' },
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-white rounded-2xl p-6 border border-gray-200 hover:border-indigo-premium/50 hover:shadow-lg transition group"
              >
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-indigo-premium to-purple-premium text-white flex items-center justify-center mb-4 group-hover:scale-110 transition">
                  <feature.icon size={22} />
                </div>
                <h3 className="font-sora font-bold text-base text-navy mb-2">{feature.title}</h3>
                <p className="text-gray-600 text-sm">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Smart Ink preview section */}
      <section className="py-16 sm:py-20 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="font-sora font-bold text-3xl sm:text-4xl text-navy mb-4">🖍️ Smart Ink Notes — Tiered by Plan</h2>
            <p className="text-gray-600 max-w-xl mx-auto">Your notes get smarter and more visual the higher you go.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { plan: 'Free', color: 'border-gray-200 bg-gray-50', label: 'text-gray-500', preview: 'Plain text notes\nNo colors\nNo diagrams', badge: '' },
              { plan: 'Lite', color: 'border-light-blue/40 bg-blue-50/50', label: 'text-light-blue', preview: '✏️ Sketch-style colors\nDashed 2D flowcharts\nBasic callout boxes', badge: 'KSh 60/lecture' },
              { plan: 'Pro', color: 'border-mint/40 bg-green-50/50', label: 'text-mint', preview: '🎨 Full color system\nClean 2D diagrams\nRich callouts & tables', badge: 'KSh 450/month' },
              { plan: 'Semester', color: 'border-warning/50 bg-orange-50/50', label: 'text-warning', preview: '🌟 Intense gradients\n🔷 3D diagrams + shadows\nDeepest visual richness', badge: 'KSh 800/semester' },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`rounded-2xl p-5 border-2 ${item.color}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <p className={`font-sora font-bold text-sm ${item.label}`}>{item.plan}</p>
                  {item.badge && <span className="text-[10px] text-gray-500 bg-white px-2 py-0.5 rounded-full border border-gray-200">{item.badge}</span>}
                </div>
                <div className="font-mono text-[10px] text-gray-500 whitespace-pre-line leading-relaxed bg-white rounded-lg p-3">
                  {item.preview}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing preview */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 bg-surface-light">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="font-sora font-bold text-3xl sm:text-4xl text-navy mb-4">Simple Pricing</h2>
            <p className="text-gray-600">Start free. Pay only when you need more.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
            {[
              { plan: 'Free', price: '0', period: '', highlight: false, perks: ['3 AI credits', 'Plain notes', 'Quiz & summarize'] },
              { plan: 'Lite', price: '60–110', period: '/lecture', highlight: false, perks: ['Pay as you go', 'Sketch Smart Ink', '1 bonus credit'] },
              { plan: 'Pro', price: '450', period: '/month', highlight: false, perks: ['Unlimited recording', 'Full color Smart Ink', 'Past papers + SnapSolve'] },
              { plan: 'Semester', price: '800', period: '/semester', highlight: true, perks: ['Everything in Pro', '3D gradient notes', 'Best value'] },
            ].map((plan, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`rounded-2xl p-6 border ${
                  plan.highlight
                    ? 'bg-gradient-to-br from-warning/20 to-red-500/10 border-warning/40 shadow-xl scale-105'
                    : 'bg-white border-gray-200'
                }`}
              >
                <h3 className="font-sora font-bold text-lg text-navy mb-1">{plan.plan}</h3>
                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-3xl font-bold text-navy">KSh {plan.price}</span>
                  {plan.period && <span className="text-gray-500 text-xs">{plan.period}</span>}
                </div>
                <ul className="space-y-2 mb-5">
                  {plan.perks.map((perk, j) => (
                    <li key={j} className="flex items-center gap-2 text-xs text-gray-700">
                      <Check size={12} className="text-mint shrink-0" /> {perk}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => navigate('/signup')}
                  className={`w-full py-2.5 rounded-xl text-sm font-semibold transition ${
                    plan.highlight
                      ? 'bg-warning text-white hover:bg-red-500'
                      : 'bg-indigo-premium text-white hover:bg-purple-premium'
                  }`}
                >
                  Get Started
                </button>
              </motion.div>
            ))}
          </div>
          <div className="text-center">
            <button onClick={() => navigate('/pricing')} className="text-indigo-premium hover:text-purple-premium font-semibold text-sm underline">
              See full feature comparison →
            </button>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 bg-gradient-to-r from-indigo-premium to-purple-premium text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-sora font-bold text-4xl sm:text-5xl mb-6">Start Your STUDIA Journey</h2>
          <p className="text-lg sm:text-xl mb-8 text-white/90 max-w-2xl mx-auto">
            Join thousands of students acing their exams with smarter study tools. 3 free AI credits — no card needed.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button onClick={() => navigate('/signup')} className="bg-white text-indigo-premium px-8 py-4 rounded-xl font-bold hover:bg-gray-100 transition">
              Get Started Free
            </button>
            <button onClick={() => navigate('/login')} className="border-2 border-white text-white px-8 py-4 rounded-xl font-bold hover:bg-white/10 transition">
              Sign In
            </button>
          </div>
        </div>
      </section>

      <footer className="bg-navy text-white/60 py-8 px-4 sm:px-6 text-center text-sm">
        <div className="max-w-7xl mx-auto space-y-2">
          <p className="font-sora font-bold text-white text-base">STUDIA AI</p>
          <p>Built for Kenyan university students. Powered by AI.</p>
          <p>© 2025 STUDIA. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
