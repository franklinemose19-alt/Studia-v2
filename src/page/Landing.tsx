import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { Mic, BookOpen, Zap, Camera, Calendar, Lock, Check, Star, Globe2, Brain } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import CommunityCard from '../components/CommunityCard'
import InstallButton from '../components/InstallButton'

export default function Landing() {
  const navigate = useNavigate()
  const { signedIn, loading } = useAuth()

  useEffect(() => {
    if (!loading && signedIn) navigate('/dashboard', { replace: true })
  }, [signedIn, loading, navigate])

  const scrollToFeatures = () => {
    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-premium to-purple-premium flex items-center justify-center">
            <span className="text-white font-bold text-xl">S</span>
          </div>
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-premium" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white overflow-hidden">

      <nav className="fixed w-full top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-premium to-purple-premium flex items-center justify-center">
              <span className="text-white font-bold text-xl">S</span>
            </div>
            <span className="font-sora font-bold text-navy text-lg">STUDIA AI</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <button onClick={scrollToFeatures} className="text-navy hover:text-indigo-premium transition text-sm font-medium">Features</button>
            <button onClick={() => navigate('/pricing')} className="text-navy hover:text-indigo-premium transition text-sm font-medium">Pricing</button>
            <button onClick={() => navigate('/login')} className="text-navy hover:text-indigo-premium transition text-sm font-medium">Sign In</button>
            <button onClick={() => navigate('/signup')} className="bg-indigo-premium text-white px-5 py-2 rounded-lg hover:bg-purple-premium transition text-sm font-semibold">
              Get Started
            </button>
          </div>
          <button onClick={() => navigate('/signup')} className="md:hidden bg-indigo-premium text-white px-4 py-2 rounded-lg text-sm font-semibold">
            Start Free
          </button>
        </div>
      </nav>

      <section className="pt-28 sm:pt-36 pb-16 sm:pb-24 px-4 sm:px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-premium/5 via-purple-premium/5 to-transparent" />
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-gradient-to-r from-indigo-premium/10 to-purple-premium/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-5xl mx-auto relative z-10 text-center">

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <span className="inline-flex items-center gap-2 bg-indigo-premium/8 border border-indigo-premium/20 text-indigo-premium px-4 py-1.5 rounded-full text-xs font-semibold mb-6">
              <span className="w-1.5 h-1.5 bg-indigo-premium rounded-full animate-pulse" />
              Built for university students
            </span>
          </motion.div>

          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="font-sora font-bold text-4xl sm:text-6xl md:text-7xl text-navy mb-4 leading-[1.1] tracking-tight">
            Turn Every Lecture Into<br />
            <span className="bg-gradient-to-r from-indigo-premium to-purple-premium bg-clip-text text-transparent">
              Your Personal AI Tutor.
            </span>
          </motion.h1>

          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="text-lg sm:text-xl text-gray-500 mb-4 max-w-2xl mx-auto font-medium">
            Record once. Revise forever.
          </motion.p>

          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
            className="text-base sm:text-lg text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
            STUDIA transforms your lectures into notes, summaries, questions and deep study material — while SAGE connects your recordings and notes with AI knowledge to help you understand what you were taught and discover what you're missing.
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row flex-wrap gap-4 justify-center mb-8">
            <button
              onClick={() => navigate('/signup')}
              className="bg-indigo-premium text-white px-8 py-4 rounded-xl font-bold text-base hover:bg-purple-premium transition shadow-lg shadow-indigo-premium/25 flex items-center justify-center gap-2"
            >
              🚀 Start Learning Free
            </button>
            <button
              onClick={scrollToFeatures}
              className="border-2 border-gray-200 text-navy px-8 py-4 rounded-xl font-bold text-base hover:border-indigo-premium/50 hover:bg-gray-50 transition flex items-center justify-center gap-2"
            >
              ▶️ See How It Works
            </button>
            <InstallButton variant="hero" />
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
            className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs text-gray-500">
            <span className="flex items-center gap-1.5">
              <Check size={13} className="text-mint" />
              3 free lectures, forever
            </span>
            <span className="flex items-center gap-1.5">
              <Check size={13} className="text-mint" />
              No credit card required
            </span>
            <span className="flex items-center gap-1.5">
              <Check size={13} className="text-mint" />
              Powered by advanced AI
            </span>
            <span className="flex items-center gap-1.5">
              <Check size={13} className="text-mint" />
              M-Pesa payments
            </span>
          </motion.div>
        </div>
      </section>

      <section className="py-12 px-4 sm:px-6 bg-gray-50/50">
        <div className="max-w-6xl mx-auto">
          <p className="text-center text-sm text-gray-400 font-medium mb-8">Students are studying smarter with STUDIA</p>
          <div className="grid sm:grid-cols-3 gap-5">
            {[
              { quote: 'I revised my entire CAT in one evening using STUDIA. The AI quiz questions were spot on.', who: 'Brian K.', course: 'Computer Science Student' },
              { quote: 'My lecture recordings became organized notes automatically. I stopped missing important points.', who: 'Faith M.', course: 'Nursing Student' },
              { quote: 'I no longer spend hours rewriting notes. STUDIA does it in minutes and the Smart Ink notes are beautiful.', who: 'James O.', course: 'Engineering Student' },
            ].map((t, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                className="bg-white rounded-2xl p-6 border border-gray-200 hover:border-indigo-premium/30 hover:shadow-lg transition">
                <div className="flex gap-0.5 mb-4">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} size={14} className="text-warning fill-warning" />
                  ))}
                </div>
                <p className="text-gray-700 text-sm leading-relaxed mb-4">"{t.quote}"</p>
                <div>
                  <p className="font-semibold text-navy text-sm">{t.who}</p>
                  <p className="text-xs text-gray-400">{t.course}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="py-16 sm:py-24 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="font-sora font-bold text-3xl sm:text-4xl text-navy mb-4">
              Everything you need to ace your exams
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              STUDIA replaces five separate study apps with one AI-powered platform built for Kenyan university students.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { icon: Mic, title: 'Smart Recording', desc: 'Record any lecture. AI transcribes it, generates notes, and maps it to your syllabus topics automatically.' },
              { icon: BookOpen, title: 'Smart Ink Notes', desc: 'Beautiful, structured notes that make revision easier before exams. Color-coded and exam-focused.' },
              { icon: Zap, title: 'AI Quiz Engine', desc: 'Revise faster with AI-powered quizzes. Upload a past paper PDF and practice with real exam-style questions.' },
              { icon: Camera, title: 'SnapSolve', desc: 'Snap any question or whiteboard through SAGE. Get a detailed step-by-step answer in seconds.' },
              { icon: Globe2, title: 'Kiswahili + English', desc: 'Lectures taught in Kiswahili, English, or naturally mixed — STUDIA transcribes and studies with you in either.' },
              { icon: Brain, title: 'Personal Knowledge Map', desc: 'STUDIA remembers every concept you\'ve learned and connects it across lectures, quizzes, and past papers.' },
              { icon: Calendar, title: 'Exam Countdown', desc: 'Upload your official timetable — STUDIA auto-matches your exam dates to units and starts the countdown.' },
              { icon: Lock, title: 'Offline Vault', desc: 'Download everything to your phone. Study without internet — on matatu, in the library, anywhere.' },
            ].map((feature, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="bg-white rounded-2xl p-6 border border-gray-200 hover:border-indigo-premium/50 hover:shadow-lg transition group cursor-pointer">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-premium to-purple-premium text-white flex items-center justify-center mb-5 group-hover:scale-110 transition">
                  <feature.icon size={22} />
                </div>
                <h3 className="font-sora font-bold text-base text-navy mb-2">{feature.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 px-4 sm:px-6 bg-gray-50/50">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-sora font-bold text-2xl text-navy text-center mb-10">Why students trust STUDIA</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { icon: '🎓', title: 'Built for University Students', desc: 'Designed specifically for Kenyan campus life' },
              { icon: '💳', title: 'Secure M-Pesa Payments', desc: 'Pay with the method you already use' },
              { icon: '🔒', title: 'Private Recordings', desc: 'Your lectures belong only to you' },
              { icon: '☁️', title: 'Sync Across Devices', desc: 'Start on phone, continue on laptop' },
              { icon: '⚡', title: 'Powered by AI', desc: 'Fast, modern AI running every feature' },
            ].map((item, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                className="bg-white rounded-2xl p-5 border border-gray-200 hover:border-indigo-premium/30 hover:shadow-md transition text-center group">
                <p className="text-3xl mb-3 group-hover:scale-110 transition inline-block">{item.icon}</p>
                <p className="font-sora font-bold text-navy text-sm mb-1">{item.title}</p>
                <p className="text-xs text-gray-500">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="font-sora font-bold text-3xl sm:text-4xl text-navy mb-3">
              Pay for exactly what you use
            </h2>
            <p className="text-gray-500">Buy AI minutes as you need them, or subscribe for the full STUDIA experience.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
            {[
              { emoji: '🎯', plan: 'Achiever', price: 'KSh 45', period: '', badge: null, perks: ['45 AI minutes', 'Recording + transcription', 'Notes, summary & quiz'], highlight: false },
              { emoji: '🎯', plan: 'Achiever+', price: 'KSh 69', period: '', badge: '⭐ Best per-minute value', perks: ['90 AI minutes', 'Recording + transcription', 'Notes, summary & quiz'], highlight: false },
              { emoji: '🚀', plan: 'Excellence', price: 'KSh 399', period: '/month', badge: null, perks: ['600 AI minutes/month', 'SAGE AI Tutor', 'Full color Smart Ink'], highlight: false },
              { emoji: '🏆', plan: 'Valedictorian', price: 'KSh 1,199', period: '/semester', badge: '🔥 Best Value', perks: ['1,800 AI minutes/semester', 'SAGE AI Tutor', 'Everything included'], highlight: true },
            ].map((plan, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                className={`rounded-2xl p-6 border relative ${
                  plan.highlight
                    ? 'bg-gradient-to-br from-warning/20 to-red-500/10 border-warning/40 shadow-xl scale-105'
                    : 'bg-white border-gray-200 hover:shadow-md transition'
                }`}>
                {plan.badge && (
                  <span className={`absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-xs font-bold text-white whitespace-nowrap ${plan.highlight ? 'bg-warning' : 'bg-light-blue'}`}>
                    {plan.badge}
                  </span>
                )}
                <p className="text-2xl mb-1">{plan.emoji}</p>
                <h3 className="font-sora font-bold text-lg text-navy mb-1">{plan.plan}</h3>
                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-2xl font-bold text-navy">{plan.price}</span>
                  {plan.period && <span className="text-gray-500 text-xs">{plan.period}</span>}
                </div>
                <ul className="space-y-1.5 mb-5">
                  {plan.perks.map((perk, j) => (
                    <li key={j} className="flex items-center gap-2 text-xs text-gray-700">
                      <Check size={12} className="text-mint shrink-0" /> {perk}
                    </li>
                  ))}
                </ul>
                <button onClick={() => navigate('/signup')}
                  className={`w-full py-2.5 rounded-xl text-sm font-semibold transition ${
                    plan.highlight ? 'bg-warning text-white hover:bg-red-500' : 'bg-indigo-premium text-white hover:bg-purple-premium'
                  }`}>
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

      <section className="py-16 px-4 sm:px-6 bg-gray-50/50">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-sora font-bold text-2xl sm:text-3xl text-navy text-center mb-10">Frequently asked questions</h2>
          <div className="space-y-4">
            {[
              { q: 'Can I pay using M-Pesa?', a: 'Yes — M-Pesa is the only payment method STUDIA supports right now. All plans are paid via M-Pesa STK push directly inside the app.' },
              { q: 'Can I upgrade anytime?', a: 'Absolutely. You can buy a minutes pack or subscribe to Excellence or Valedictorian at any time from your dashboard.' },
              { q: 'What happens after my three free lectures?', a: 'Your Explorer AI features are permanently locked. There is no reset. You\'ll need to buy an Achiever (KSh 45, 45 min) or Achiever+ (KSh 69, 90 min) minutes pack, or subscribe to Excellence (KSh 399/month, 600 min) or Valedictorian (KSh 1,199/semester, 1,800 min) to continue.' },
              { q: 'Does STUDIA work if my lecturer teaches in Kiswahili?', a: 'Yes. STUDIA transcribes Kiswahili, English, or naturally mixed lectures, and preserves the lecturer\'s original wording and technical terms rather than force-translating everything.' },
              { q: 'Can I study using my phone?', a: 'Yes — STUDIA is built mobile-first. Install it directly from Chrome on Android as a home screen app. Everything works offline once downloaded to your Vault.' },
              { q: 'Do my lectures stay private?', a: 'Yes. Your recordings are encrypted and stored securely in your own account. Only you can access them — STUDIA staff cannot listen to or read your recordings.' },
            ].map((item, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl p-5 border border-gray-200">
                <p className="font-semibold text-navy mb-2 text-sm sm:text-base">{item.q}</p>
                <p className="text-gray-500 text-sm">{item.a}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 px-4 sm:px-6 bg-white border-t border-gray-100">
        <div className="max-w-3xl mx-auto">
          <CommunityCard variant="light" />
        </div>
      </section>

      <section className="py-20 sm:py-24 px-4 sm:px-6 bg-gradient-to-br from-indigo-premium to-purple-premium text-white">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-sora font-bold text-4xl sm:text-5xl mb-4 leading-tight">
            Start studying smarter today.
          </h2>
          <p className="text-white/80 text-lg mb-8">
            3 free AI lectures. No card. No commitment.
          </p>
          <div className="flex flex-col sm:flex-row flex-wrap gap-4 justify-center">
            <button onClick={() => navigate('/signup')}
              className="bg-white text-indigo-premium px-8 py-4 rounded-xl font-bold hover:bg-gray-100 transition shadow-lg">
              🚀 Start Learning Free
            </button>
            <button onClick={() => navigate('/login')}
              className="border-2 border-white/40 text-white px-8 py-4 rounded-xl font-bold hover:bg-white/10 transition">
              Sign In
            </button>
            <InstallButton variant="hero" />
          </div>
        </div>
      </section>

      <footer className="bg-navy text-white/50 py-8 px-4 sm:px-6 text-center text-xs">
        <div className="max-w-7xl mx-auto space-y-1">
          <p className="font-sora font-bold text-white text-sm">STUDIA AI</p>
          <p>Built for Kenyan university students · Powered by AI</p>
          <p>© {new Date().getFullYear()} STUDIA. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
