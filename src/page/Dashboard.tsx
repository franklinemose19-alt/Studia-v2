import { LogOut, Mic, BookOpen, BarChart3, Calendar, Settings, Zap, Award, Clock, ChevronRight, Search, Bell, User, TrendingUp } from 'lucide-react'
import { motion } from 'framer-motion'
import { LogOut, Mic, BookOpen, BarChart3, Calendar, Settings, Zap, Award, Clock, ChevronRight, Search, Bell, User } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'

export default function Dashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState({
    lectures: 0,
    quizzes: 0,
    avgScore: 0,
    streak: 0,
  })

  useEffect(() => {
    const lectureCount = parseInt(localStorage.getItem('lectureCount') || '0')
    const quizCount = parseInt(localStorage.getItem('quizCount') || '0')
    const avgScore = parseInt(localStorage.getItem('avgScore') || '0')
    
    setStats({
      lectures: lectureCount,
      quizzes: quizCount,
      avgScore: avgScore,
      streak: Math.max(1, lectureCount),
    })
  }, [])

  const cards = [
    { icon: Mic, title: 'Record Lecture', desc: 'Smart recording with auto-tagging', path: '/recording', color: 'from-indigo-premium' },
    { icon: BookOpen, title: 'My Notes', desc: 'Save & organize notes', path: '/notes', color: 'from-purple-premium' },
    { icon: BarChart3, title: 'Quiz Practice', desc: 'Test your knowledge', path: '/quiz', color: 'from-mint' },
    { icon: Calendar, title: 'Exam Countdown', desc: 'Track your exams', path: '/exam-countdown', color: 'from-warning' },
    { icon: TrendingUp, title: 'Adaptive Learning', desc: 'See your weak topics', path: '/adaptive-learning', color: 'from-mint' },
    { icon: Calendar, title: 'Study Planner', desc: 'Plan your weekly schedule', path: '/study-planner', color: 'from-light-blue' },
  ]

  const statCards = [
    { icon: Mic, label: 'Lectures', value: stats.lectures, color: 'indigo' },
    { icon: Award, label: 'Quizzes', value: stats.quizzes, color: 'purple' },
    { icon: Zap, label: 'Avg Score', value: `${stats.avgScore}%`, color: 'mint' },
    { icon: Clock, label: 'Streak', value: `${stats.streak}d`, color: 'indigo' },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-surface-light to-white">
      {/* TOP BAR */}
      <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-premium to-purple-premium flex items-center justify-center">
              <span className="text-white font-bold">S</span>
            </div>
            <span className="font-sora font-bold text-navy text-lg">STUDIA</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 bg-gray-100 rounded-lg px-4 py-2 w-64">
              <Search size={18} className="text-gray-400" />
              <input
                type="text"
                placeholder="Search lectures..."
                className="bg-transparent text-navy outline-none w-full text-sm"
              />
            </div>

            <button className="p-2 hover:bg-gray-100 rounded-lg transition">
              <Bell size={20} className="text-navy" />
            </button>

            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-navy hover:text-indigo-premium transition ml-4 pl-4 border-l border-gray-200"
            >
              <LogOut size={18} />
              <span className="text-sm font-medium">Sign out</span>
            </button>
          </div>
        </div>
      </nav>

      {/* MAIN CONTENT */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-12">
          {/* HEADER */}
          <div>
            <h1 className="font-sora font-bold text-5xl text-navy mb-2">Welcome back! 👋</h1>
            <p className="text-gray-600">
              You're on a <span className="font-bold text-indigo-premium">{stats.streak}-day streak</span> 🔥 Keep it up!
            </p>
          </div>

          {/* STATS GRID */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {statCards.map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-white rounded-2xl p-6 border border-gray-200 hover:border-indigo-premium/50 hover:shadow-lg transition group"
              >
                <div className={`w-12 h-12 rounded-lg bg-${stat.color}/10 flex items-center justify-center text-${stat.color} mb-4 group-hover:scale-110 transition`}>
                  <stat.icon size={24} />
                </div>
                <p className="text-3xl font-bold text-navy mb-1">{stat.value}</p>
                <p className="text-sm text-gray-600">{stat.label}</p>
              </motion.div>
            ))}
          </div>

          {/* QUICK ACTIONS */}
          <div>
            <h2 className="font-sora font-bold text-2xl text-navy mb-6">Quick Actions</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-6 gap-4">
              {cards.map((card, i) => (
                <motion.button
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => card.path !== '#' && navigate(card.path)}
                  className="group text-left"
                >
                  <div className={`bg-gradient-to-br ${card.color} to-transparent rounded-2xl p-6 border border-gray-200 hover:border-indigo-premium/50 hover:shadow-lg transition h-full`}>
                    <div className="w-12 h-12 rounded-lg bg-white/20 flex items-center justify-center text-white mb-4 group-hover:scale-110 transition">
                      <card.icon size={24} />
                    </div>
                    <h3 className="font-sora font-bold text-navy mb-1">{card.title}</h3>
                    <p className="text-sm text-gray-600 mb-3">{card.desc}</p>
                    <div className="flex items-center gap-2 text-indigo-premium text-sm font-medium opacity-0 group-hover:opacity-100 transition">
                      Launch <ChevronRight size={16} />
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          </div>

          {/* MOTIVATIONAL CARD */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gradient-to-r from-indigo-premium to-purple-premium rounded-3xl p-8 text-white overflow-hidden relative"
          >
            <div className="absolute -right-20 -top-20 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
            <div className="relative z-10">
              <h2 className="font-sora font-bold text-3xl mb-3">Pro Tip 💡</h2>
              <p className="text-white/90 mb-6 max-w-2xl">
                The most successful students record their lectures, summarize key concepts, and take quizzes regularly. STUDIA automates all of this for you.
              </p>
              <button className="bg-white text-indigo-premium px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition">
                Learn More
              </button>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}
