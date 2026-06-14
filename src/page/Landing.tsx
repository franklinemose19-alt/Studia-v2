import { motion } from 'framer-motion'
import { ArrowRight, Mic, BookOpen, Zap, Image, Calendar, Lock, Star } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function Landing() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-white overflow-hidden">
      {/* NAVBAR */}
      <nav className="fixed w-full top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-premium to-purple-premium flex items-center justify-center">
              <span className="text-white font-bold text-xl">S</span>
            </div>
            <span className="font-sora font-bold text-navy text-lg">STUDIA</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <button onClick={() => navigate('/pricing')} className="text-navy hover:text-indigo-premium transition">Features</button>
            <button onClick={() => navigate('/pricing')} className="text-navy hover:text-indigo-premium transition">Pricing</button>
            <button onClick={() => navigate('/login')} className="text-navy hover:text-indigo-premium transition">Sign In</button>
            <button
              onClick={() => navigate('/signup')}
              className="bg-indigo-premium text-white px-6 py-2 rounded-lg hover:bg-purple-premium transition"
            >
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="pt-32 pb-20 px-4 sm:px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-premium/5 via-purple-premium/5 to-transparent" />
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center relative z-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <h1 className="font-sora font-bold text-5xl md:text-6xl text-navy mb-6 leading-tight">
              Turn Every Lecture Into Smart Study Material.
            </h1>
            <p className="text-lg text-gray-600 mb-8 leading-relaxed">
              STUDIA is an AI academic system that records lectures, generates notes, creates quizzes, and builds your exam success plan.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => navigate('/signup')}
                className="bg-indigo-premium text-white px-8 py-4 rounded-xl font-semibold hover:bg-purple-premium transition flex items-center gap-2"
              >
                🚀 Get Started Free
              </button>
              <button className="border-2 border-navy text-navy px-8 py-4 rounded-xl font-semibold hover:bg-navy/5 transition">
                🎓 View Demo
              </button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="relative h-96 hidden md:block"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-premium/20 to-purple-premium/20 rounded-3xl blur-3xl" />
            <div className="relative bg-gradient-to-br from-white to-surface-light rounded-3xl p-6 border border-gray-200 shadow-2xl">
              <div className="space-y-4">
                <div className="h-12 bg-gradient-to-r from-indigo-premium to-purple-premium rounded-lg" />
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="py-20 px-4 sm:px-6 bg-surface-light">
        <div className="max-w-7xl mx-auto">
          <h2 className="font-sora font-bold text-4xl text-navy text-center mb-12">Powerful Features</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: Mic, title: 'Lecture Recording', desc: 'Record & auto-organize lectures by course' },
              { icon: BookOpen, title: 'Smart Notes', desc: 'AI generates structured study notes' },
              { icon: Zap, title: 'Quiz Engine', desc: 'Auto-generate practice questions' },
              { icon: Image, title: 'SnapSolve', desc: 'Upload images, get instant answers' },
              { icon: Calendar, title: 'Semester Planner', desc: 'Plan exams & study schedule' },
              { icon: Lock, title: 'Offline Vault', desc: 'Study anywhere, no internet needed' },
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-white rounded-2xl p-6 border border-gray-200 hover:border-indigo-premium/50 hover:shadow-lg transition group cursor-pointer"
              >
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-indigo-premium to-purple-premium text-white flex items-center justify-center mb-4 group-hover:scale-110 transition">
                  <feature.icon size={24} />
                </div>
                <h3 className="font-sora font-bold text-lg text-navy mb-2">{feature.title}</h3>
                <p className="text-gray-600 text-sm">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <h2 className="font-sora font-bold text-4xl text-navy text-center mb-12">Simple Pricing</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { plan: 'Free', price: '0', features: ['3 lectures', 'Basic notes'] },
              {
                plan: 'Plus',
                price: '250',
                features: ['Unlimited lectures', 'AI summaries', 'Quiz generation'],
                highlighted: true,
              },
              {
                plan: 'Semester Pass',
                price: '800',
                features: ['Everything', 'Offline download', 'Priority support'],
                badge: 'BEST',
              },
            ].map((plan, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`rounded-2xl p-8 relative ${
                  plan.highlighted
                    ? 'bg-gradient-to-br from-indigo-premium to-purple-premium text-white border-2 border-indigo-premium shadow-2xl scale-105'
                    : 'bg-white border border-gray-200'
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-warning text-white px-4 py-1 rounded-full text-sm font-bold">
                    {plan.badge}
                  </div>
                )}
                <h3 className="font-sora font-bold text-2xl mb-2">{plan.plan}</h3>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-4xl font-bold">KSh {plan.price}</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, j) => (
                    <li key={j} className="flex items-center gap-2">
                      <Star size={16} className={plan.highlighted ? 'text-mint' : 'text-indigo-premium'} />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => navigate('/signup')}
                  className={`w-full py-3 rounded-lg font-semibold transition ${
                    plan.highlighted
                      ? 'bg-white text-indigo-premium hover:bg-gray-100'
                      : 'bg-indigo-premium text-white hover:bg-purple-premium'
                  }`}
                >
                  Get Started
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 sm:px-6 bg-gradient-to-r from-indigo-premium to-purple-premium text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-sora font-bold text-5xl mb-8">Start Your STUDIA Journey</h2>
          <p className="text-xl mb-8 text-white/90">Join thousands of students acing their exams with smarter study tools.</p>
          <div className="flex gap-4 justify-center flex-wrap">
            <button
              onClick={() => navigate('/signup')}
              className="bg-white text-indigo-premium px-8 py-4 rounded-xl font-bold hover:bg-gray-100 transition"
            >
              Get Started Free
            </button>
            <button
              onClick={() => navigate('/login')}
              className="border-2 border-white text-white px-8 py-4 rounded-xl font-bold hover:bg-white/10 transition"
            >
              Sign In
            </button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-navy text-white/60 py-8 px-4 sm:px-6 text-center text-sm">
        <div className="max-w-7xl mx-auto">
          <p>© 2024 STUDIA. Built for students. By students.</p>
        </div>
      </footer>
    </div>
  )
}
