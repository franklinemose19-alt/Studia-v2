import { motion } from 'framer-motion'
import { ArrowRight, Mic, BookOpen, Zap, Image, Calendar, Lock, Star } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function Landing() {
  const navigate = useNavigate()

  const features = [
    { icon: Mic, title: 'Lecture Recording', desc: 'Record & auto-organize lectures by course' },
    { icon: BookOpen, title: 'Smart Notes', desc: 'AI generates structured study notes' },
    { icon: Zap, title: 'Quiz Engine', desc: 'Auto-generate practice questions' },
    { icon: Image, title: 'SnapSolve', desc: 'Upload images, get instant answers' },
    { icon: Calendar, title: 'Semester Planner', desc: 'Plan exams & study schedule' },
    { icon: Lock, title: 'Offline Vault', desc: 'Study anywhere, no internet needed' },
  ]

  const pricing = [
    { plan: 'Free', price: '0', lectures: '3 lectures', features: ['Basic recording', 'Simple notes'] },
    {
      plan: 'Plus',
      price: '250',
      period: '/month',
      lectures: 'Unlimited',
      features: ['All features', 'AI summaries', 'Quiz generation', 'Priority support'],
      highlighted: true,
    },
    {
      plan: 'Semester Pass',
      price: '800',
      period: '/semester',
      lectures: 'Unlimited',
      features: ['Everything in Plus', 'Offline download', 'Family sharing', '24/7 support'],
      badge: 'BEST SELLER',
    },
  ]

  const testimonials = [
    { quote: 'I finally understand my lectures', author: 'Sarah, 2nd Year' },
    { quote: 'STUDIA saved my exam prep', author: 'Mike, Engineering' },
    { quote: 'Best study tool I\'ve ever used', author: 'Grace, Medicine' },
  ]

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

      {/* HERO SECTION */}
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

      {/* PROBLEM SECTION */}
      <section className="py-20 px-4 sm:px-6 bg-surface-light">
        <div className="max-w-7xl mx-auto">
          <h2 className="font-sora font-bold text-4xl text-navy text-center mb-12">Your Study Struggles</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { emoji: '😓', title: 'Too many lectures, no time to revise' },
              { emoji: '📝', title: 'Notes are messy and incomplete' },
              { emoji: '😰', title: 'Studying feels overwhelming' },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-white rounded-2xl p-8 border border-gray-200 text-center"
              >
                <p className="text-4xl mb-4">{item.emoji}</p>
                <p className="text-navy font-semibold text-lg">{item.title}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* SOLUTION SECTION */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <h2 className="font-sora font-bold text-4xl text-navy text-center mb-12">The STUDIA Solution</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { num: '1', icon: '🎙️', title: 'Record Lecture', desc: 'Smart recording with auto-tagging' },
              { num: '2', icon: '🧠', title: 'Learn Smart', desc: 'AI generates notes instantly' },
              { num: '3', icon: '🎯', title: 'Excel', desc: 'Study smarter for exams' },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="relative"
              >
                <div className="bg-gradient-to-br from-indigo-premium/10 to-purple-premium/10 rounded-2xl p-8 border border-indigo-premium/20">
                  <div className="w-12 h-12 rounded-lg bg-indigo-premium text-white flex items-center justify-center font-bold mb-4">
                    {item.num}
                  </div>
                  <p className="text-2xl mb-2">{item.icon}</p>
                  <h3 className="font-sora font-bold text-xl text-navy mb-2">{item.title}</h3>
                  <p className="text-gray-600">{item.desc}</p>
                </div>
                {i < 2 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 text-indigo-premium text-2xl">
                    <ArrowRight />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES GRID */}
      <section className="py-20 px-4 sm:px-6 bg-surface-light">
        <div className="max-w-7xl mx-auto">
          <h2 className="font-sora font-bold text-4xl text-navy text-center mb-12">Powerful Features</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, i) => (
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

      {/* HOW IT WORKS */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <h2 className="font-sora font-bold text-4xl text-navy text-center mb-12">How It Works</h2>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              '1. Record Lecture',
              '2. AI Processes Content',
              '3. Get Notes & Quizzes',
              '4. Study Offline Anytime',
            ].map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-gradient-to-br from-indigo-premium/10 to-purple-premium/10 rounded-2xl p-6 border border-indigo-premium/20 text-center"
              >
                <p className="font-sora font-bold text-navy">{step}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="py-20 px-4 sm:px-6 bg-surface-light">
        <div className="max-w-7xl mx-auto">
          <h2 className="font-sora font-bold text-4xl text-navy text-center mb-12">Simple Pricing</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {pricing.map((plan, i) => (
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
                  <div className={`absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-sm font-bold ${plan.highlighted ? 'bg-mint text-navy' : 'bg-warning text-white'}`}>
                    {plan.badge}
                  </div>
                )}
                <h3 className="font-sora font-bold text-2xl mb-2">{plan.plan}</h3>
                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-4xl font-bold">KSh {plan.price}</span>
                  {plan.period && <span>{plan.period}</span>}
                </div>
                <p className={`mb-6 ${plan.highlighted ? 'text-white/90' : 'text-gray-600'}`}>{plan.lectures}</p>
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
          <div className="text-center mt-12">
            <button
              onClick={() => navigate('/pricing')}
              className="text-indigo-premium hover:text-purple-premium font-semibold flex items-center gap-2 mx-auto"
            >
              View Full Pricing Details
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <h2 className="font-sora font-bold text-4xl text-navy text-center mb-12">What Students Say</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-white rounded-2xl p-8 border border-gray-200 text-center"
              >
                <p className="text-yellow-400 mb-4">⭐⭐⭐⭐⭐</p>
                <p className="text-gray-600 mb-4 italic">"{testimonial.quote}"</p>
                <p className="font-sora font-bold text-navy">{testimonial.author}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-20 px-4 sm:px-6 bg-gradient-to-r from-indigo-premium to-purple-premium text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-sora font-bold text-5xl mb-8">Start Studying Smarter Today.</h2>
          <p className="text-xl mb-8 text-white/90">Join thousands of students acing their exams with STUDIA.</p>
          <div className="flex gap-4 justify-center flex-wrap">
            <button
              onClick={() => navigate('/signup')}
              className="bg-white text-indigo-premium px-8 py-4 rounded-xl font-semibold hover:bg-gray-100 transition"
            >
              Get Started Free
            </button>
            <button
              onClick={() => navigate('/login')}
              className="border-2 border-white text-white px-8 py-4 rounded-xl font-semibold hover:bg-white/10 transition"
            >
              Try STUDIA
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
