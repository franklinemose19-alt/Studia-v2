import { motion } from 'framer-motion'
import { LogOut, Mic, BookOpen, BarChart3, Settings, Zap, Award, Clock } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { LogOut, Mic, BookOpen, BarChart3, Calendar, Zap, Award, Clock } from 'lucide-react'

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
    { icon: Mic, title: 'Record Lecture', desc: 'Start a new recording', path: '/recording' },
    { icon: BookOpen, title: 'My Notes', desc: 'Save & organize notes', path: '/notes' },
    { icon: BarChart3, title: 'Quiz Practice', desc: 'Test your knowledge', path: '/quiz' },
    { icon: Calendar, title: 'Exam Countdown', desc: 'Track your exams', path: '/exam-countdown' },
  ]

  const statCards = [
    { icon: Mic, label: 'Lectures Recorded', value: stats.lectures, bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
    { icon: Award, label: 'Quizzes Completed', value: stats.quizzes, bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
    { icon: Zap, label: 'Average Score', value: `${stats.avgScore}%`, bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/20' },
    { icon: Clock, label: 'Study Streak', value: `${stats.streak} days`, bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
  ]

  return (
    <div className="min-h-screen bg-surface-base">
      <nav className="border-b border-white/5 bg-surface-elevated/50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <span className="font-sora font-bold text-xl text-white">STUDIA</span>
            <sup className="text-brand-blue text-xs">β</sup>
          </div>
          <button onClick={() => navigate('/')} className="flex items-center gap-2 text-sm text-[#8B97B5] hover:text-white">
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
          <div>
            <h1 className="font-sora font-bold text-4xl text-white mb-2">Welcome back!</h1>
            <p className="text-[#8B97B5]">You're on a {stats.streak}-day study streak. Keep it up! 🔥</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`${stat.bg} border ${stat.border} rounded-2xl p-6`}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stat.text} mb-3`}>
                  <stat.icon size={20} />
                </div>
                <p className="text-3xl font-bold text-white mb-1">{stat.value}</p>
                <p className="text-xs text-[#8B97B5]">{stat.label}</p>
              </motion.div>
            ))}
          </div>

          <div>
            <h2 className="font-sora font-bold text-2xl text-white mb-4">Quick Actions</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {cards.map((card, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  whileHover={{ y: -4 }}
                  onClick={() => card.path !== '#' && navigate(card.path)}
                  className="bg-surface-elevated border border-white/5 rounded-2xl p-6 cursor-pointer hover:border-brand-blue/30 transition-all h-full"
                >
                  <div className="w-10 h-10 rounded-lg bg-brand-blue/10 border border-brand-blue/20 flex items-center justify-center text-brand-blue mb-3">
                    <card.icon size={20} />
                  </div>
                  <p className="font-sora font-semibold text-white text-sm">{card.title}</p>
                  <p className="text-xs text-[#8B97B5] mt-1">{card.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-gradient-to-r from-brand-blue/10 to-brand-blue/5 border border-brand-blue/20 rounded-2xl p-8">
            <h2 className="font-sora font-bold text-2xl text-white mb-3">Pro Tip</h2>
            <p className="text-[#8B97B5] mb-4">Record your lectures, generate summaries, and take quizzes to ace your exams! The more you use STUDIA, the smarter you'll study.</p>
            <button className="bg-brand-blue text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-brand-blue/90">Learn More</button>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}
