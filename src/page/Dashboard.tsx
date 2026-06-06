import { motion } from 'framer-motion'
import { LogOut, Mic, BookOpen, BarChart3, Settings } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function Dashboard() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-surface-base">
      <nav className="border-b border-white/5 bg-surface-elevated/50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <span className="font-sora font-bold text-xl text-white">STUDIA</span>
            <sup className="text-brand-blue text-xs font-mono">β</sup>
          </div>
          <button onClick={() => navigate('/')} className="flex items-center gap-2 text-sm text-[#8B97B5] hover:text-white transition-colors">
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="space-y-8">
          <div>
            <h1 className="font-sora font-bold text-4xl text-white mb-2">Welcome to STUDIA</h1>
            <p className="text-[#8B97B5]">You're logged in! The full app is coming soon.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: Mic, title: 'Record Lecture', desc: 'Start a new recording' },
              { icon: BookOpen, title: 'My Notes', desc: 'View your documents' },
              { icon: BarChart3, title: 'Progress', desc: 'Check your stats' },
              { icon: Settings, title: 'Settings', desc: 'Update your profile' },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                whileHover={{ y: -4 }}
                className="bg-surface-elevated border border-white/5 rounded-2xl p-6 cursor-pointer transition-all hover:border-brand-blue/30"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-brand-blue/10 border border-brand-blue/20 flex items-center justify-center text-brand-blue">
                    <item.icon size={20} />
                  </div>
                </div>
                <p className="font-sora font-semibold text-white text-sm">{item.title}</p>
                <p className="text-xs text-[#8B97B5] mt-1">{item.desc}</p>
              </motion.div>
            ))}
          </div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }} className="bg-gradient-to-r from-brand-blue/10 to-brand-blue/5 border border-brand-blue/20 rounded-2xl p-8">
            <h2 className="font-sora font-bold text-2xl text-white mb-3">Coming Next</h2>
            <p className="text-[#8B97B5] mb-6">The full STUDIA dashboard, lecture recording, AI processing, quizzes, and exam prep tools are being built. Check back soon!</p>
            <button className="bg-brand-blue text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-brand-blue/90 transition-all">View Roadmap</button>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}
