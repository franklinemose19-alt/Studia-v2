import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  LogOut, Mic, BookOpen, BarChart3, Calendar, Zap, Award, Clock,
  ChevronRight, Search, Bell, TrendingUp, Lock, CreditCard,
  Sparkles, FileText, X, AlertTriangle,
} from 'lucide-react'
import { signOut } from '../lib/supabaseClient'
import { usePWAInstall } from '../hooks/usePWAInstall'
import { loadAccess, explorerLecturesRemaining, paidLecturesRemaining, getPlanLabel, getPlanColor, type AccessInfo, emptyAccess } from '../lib/access'
import { useAuth } from '../lib/AuthContext'

const REFERRAL_SNOOZE_KEY = 'referralReminderSnoozedUntil'

export default function Dashboard() {
  const navigate = useNavigate()
  const { userId } = useAuth()
  const { installPrompt, isInstalled, isInstalling, install } = usePWAInstall()

  const [stats, setStats] = useState({ lectures: 0, quizzes: 0, avgScore: 0, streak: 0 })
  const [showReferralReminder, setShowReferralReminder] = useState(false)
  const [access, setAccess] = useState<AccessInfo>(emptyAccess)

  useEffect(() => {
    // Load stats
    let lectures = 0
    let quizResults: any[] = []
    try { lectures = JSON.parse(localStorage.getItem('recordingsMetadata') || '[]').length } catch {}
    try {
      quizResults = JSON.parse(localStorage.getItem('quizResults') || '[]')
      const avg = quizResults.length > 0
        ? Math.round(quizResults.reduce((s, q) => s + (q.total > 0 ? (q.score / q.total) * 100 : 0), 0) / quizResults.length)
        : 0
      const activeDates = new Set<string>()
      try {
        JSON.parse(localStorage.getItem('recordingsMetadata') || '[]')
          .forEach((r: any) => { const d = new Date(r.timestamp || r.date); if (!isNaN(d.getTime())) activeDates.add(d.toISOString().slice(0, 10)) })
      } catch {}
      quizResults.forEach((q: any) => { const d = new Date(q.date); if (!isNaN(d.getTime())) activeDates.add(d.toISOString().slice(0, 10)) })
      let streak = 0
      const cursor = new Date()
      if (!activeDates.has(cursor.toISOString().slice(0, 10))) cursor.setDate(cursor.getDate() - 1)
      while (activeDates.has(cursor.toISOString().slice(0, 10))) { streak++; cursor.setDate(cursor.getDate() - 1) }
      setStats({ lectures, quizzes: quizResults.length, avgScore: avg, streak })
    } catch {}

    const snoozedUntil = parseInt(localStorage.getItem(REFERRAL_SNOOZE_KEY) || '0', 10)
    if (Date.now() > snoozedUntil) setShowReferralReminder(true)

    // Load access info
    loadAccess(userId).then(setAccess)
  }, [userId])

  const dismissReferralReminder = () => {
    localStorage.setItem(REFERRAL_SNOOZE_KEY, String(Date.now() + 7 * 24 * 60 * 60 * 1000))
    setShowReferralReminder(false)
  }

  const handleSignOut = async () => {
    try { await signOut() } catch {}
    navigate('/')
  }

  // Lecture usage display
  const plan = access.currentPlan || 'explorer'
  const isExplorer = plan === 'explorer'
  const isAchiever = plan === 'achiever'
  const isPaidPlan = ['excellence', 'valedictorian'].includes(plan)
  const explorerLeft = explorerLecturesRemaining(access)
  const paidLeft = paidLecturesRemaining(access)
  const isLocked = access.planLocked

  const lectureUsageBar = () => {
    if (isExplorer) {
      const used = access.freeCreditsUsed || 0
      const pct = Math.round((used / 3) * 100)
      return { used, total: 3, pct, label: 'lifetime lectures used', color: used >= 3 ? 'bg-red-500' : used >= 2 ? 'bg-yellow-400' : 'bg-mint' }
    }
    if (isPaidPlan) {
      const used = access.lecturesUsed || 0
      const total = access.lectureAllowance || 0
      const pct = total > 0 ? Math.round((used / total) * 100) : 0
      return { used, total, pct, label: 'lectures used this period', color: pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-yellow-400' : 'bg-mint' }
    }
    return null
  }

  const usageBar = lectureUsageBar()

  const cards = [
    { icon: Mic, title: 'Record Lecture', desc: 'Smart AI recording', path: '/recording', color: 'from-indigo-premium' },
    { icon: BookOpen, title: 'My Notes', desc: 'Notes & summaries', path: '/notes', color: 'from-purple-premium' },
    { icon: BarChart3, title: 'Test Yourself', desc: 'AI practice tests', path: '/quiz', color: 'from-mint' },
    { icon: Sparkles, title: 'AI Tools', desc: 'SnapSolve & more', path: '/ai-tools', color: 'from-indigo-premium' },
    { icon: Calendar, title: 'Exam Countdown', desc: 'Track your exams', path: '/exam-countdown', color: 'from-warning' },
    { icon: TrendingUp, title: 'Adaptive Learning', desc: 'Weak topic analysis', path: '/adaptive-learning', color: 'from-mint' },
    { icon: Lock, title: 'Offline Vault', desc: 'Study anywhere', path: '/offline-vault', color: 'from-light-blue' },
    { icon: BookOpen, title: 'Unit Management', desc: 'Define syllabi', path: '/units', color: 'from-warning' },
    { icon: CreditCard, title: 'Payments', desc: 'History & refer friends', path: '/payments', color: 'from-mint' },
    { icon: Calendar, title: 'Study Planner', desc: 'Weekly schedule', path: '/study-planner', color: 'from-light-blue' },
    { icon: FileText, title: 'Study Chat', desc: 'Ask STUDIA AI', path: '/ai-tools', color: 'from-purple-premium' },
  ]

  const statCards = [
    { icon: Mic, label: 'Lectures', value: stats.lectures, color: 'indigo' },
    { icon: Award, label: 'Quizzes', value: stats.quizzes, color: 'purple' },
    { icon: Zap, label: 'Avg Score', value: `${stats.avgScore}%`, color: 'mint' },
    { icon: Clock, label: 'Streak', value: `${stats.streak}d`, color: 'indigo' },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-surface-light to-white">
      <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-premium to-purple-premium flex items-center justify-center shrink-0">
              <span className="text-white font-bold">S</span>
            </div>
            <span className="font-sora font-bold text-navy text-base sm:text-lg hidden xs:inline">STUDIA</span>

            {/* Install button */}
            {!isInstalled && installPrompt && (
              <button onClick={install} disabled={isInstalling}
                className="flex items-center gap-1.5 bg-gradient-to-r from-mint to-light-blue text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:opacity-90 transition disabled:opacity-50 ml-1">
                {isInstalling ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : '📲'}
                <span className="hidden sm:inline">{isInstalling ? 'Installing...' : 'Install App'}</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <div className="hidden md:flex items-center gap-2 bg-gray-100 rounded-lg px-4 py-2 w-48 lg:w-64">
              <Search size={18} className="text-gray-400 shrink-0" />
              <input type="text" placeholder="Search lectures..." className="bg-transparent text-navy outline-none w-full text-sm" />
            </div>
            <button className="p-2 hover:bg-gray-100 rounded-lg transition">
              <Bell size={20} className="text-navy" />
            </button>
            <button onClick={handleSignOut} className="flex items-center gap-1.5 text-navy hover:text-indigo-premium transition pl-2 sm:pl-4 border-l border-gray-200">
              <LogOut size={18} />
              <span className="text-sm font-medium hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 sm:space-y-10">

          {/* Welcome */}
          <div>
            <h1 className="font-sora font-bold text-4xl sm:text-5xl text-navy mb-2">Welcome back! 👋</h1>
            <p className="text-gray-600">
              {stats.streak > 0 ? (
                <>You're on a <span className="font-bold text-indigo-premium">{stats.streak}-day streak</span> 🔥 Keep it up!</>
              ) : (
                'Record a lecture or take a quiz today to start your streak!'
              )}
            </p>
          </div>

          {/* Plan + lecture usage card */}
          <div className={`rounded-2xl p-5 sm:p-6 border-2 ${
            isLocked ? 'bg-red-50 border-red-200'
            : plan === 'valedictorian' ? 'bg-gradient-to-r from-warning/10 to-red-500/10 border-warning/40'
            : plan === 'excellence' ? 'bg-gradient-to-r from-mint/10 to-light-blue/10 border-mint/30'
            : plan === 'achiever' ? 'bg-blue-50/50 border-light-blue/30'
            : 'bg-gray-50 border-gray-200'
          }`}>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className={`font-sora font-bold text-lg ${getPlanColor(plan)}`}>
                    {getPlanLabel(plan)}
                  </span>
                  {access.subscriptionStatus === 'active' && isPaidPlan && (
                    <span className="text-[10px] bg-mint/20 text-mint px-2 py-0.5 rounded-full font-semibold">ACTIVE</span>
                  )}
                  {isLocked && (
                    <span className="text-[10px] bg-red-500/20 text-red-600 px-2 py-0.5 rounded-full font-semibold">LOCKED</span>
                  )}
                </div>

                {isLocked ? (
                  <div className="flex items-start gap-2">
                    <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700">Your 3 free lectures have been used. All AI features are locked. Upgrade to continue.</p>
                  </div>
                ) : isExplorer ? (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">
                      <span className="font-bold text-navy">{explorerLeft}</span> of 3 free lectures remaining (lifetime — no reset)
                    </p>
                    {usageBar && (
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className={`${usageBar.color} h-2 rounded-full transition-all`} style={{ width: `${usageBar.pct}%` }} />
                      </div>
                    )}
                  </div>
                ) : isAchiever ? (
                  <p className="text-sm text-gray-600">Pay KSh 29–49 per lecture. Bonus AI credits: <span className="font-bold text-navy">{access.liteBonusCredits || 0}</span></p>
                ) : isPaidPlan && usageBar ? (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">
                      <span className="font-bold text-navy">{usageBar.total - usageBar.used}</span> of {usageBar.total} lectures remaining
                      {access.periodEnd && <span className="text-gray-400 ml-1">· resets {new Date(access.periodEnd).toLocaleDateString()}</span>}
                    </p>
                    <div className="w-full bg-white/50 rounded-full h-2">
                      <div className={`${usageBar.color} h-2 rounded-full transition-all`} style={{ width: `${usageBar.pct}%` }} />
                    </div>
                  </div>
                ) : null}
              </div>

              {(isLocked || isExplorer || (isPaidPlan && paidLeft <= 3)) && (
                <button
                  onClick={() => navigate('/pricing')}
                  className="bg-indigo-premium text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-purple-premium transition whitespace-nowrap shrink-0"
                >
                  {isLocked ? '🔓 Unlock Now' : isPaidPlan ? '➕ Get More' : '⬆️ Upgrade'}
                </button>
              )}
            </div>
          </div>

          {/* Locked overlay */}
          {isLocked && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
              className="bg-red-500 rounded-2xl p-6 text-white text-center">
              <p className="text-2xl mb-2">🔒</p>
              <p className="font-sora font-bold text-xl mb-2">AI Features Locked</p>
              <p className="text-white/90 text-sm mb-4">You've used all 3 Explorer lectures. To keep studying smarter, choose a plan.</p>
              <button onClick={() => navigate('/pricing')} className="bg-white text-red-500 font-bold px-6 py-2.5 rounded-xl hover:bg-gray-100 transition">
                View Plans — from KSh 29
              </button>
            </motion.div>
          )}

          {/* Referral banner */}
          <AnimatePresence>
            {showReferralReminder && !isLocked && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl p-5 sm:p-6 text-white relative overflow-hidden">
                <button onClick={dismissReferralReminder} className="absolute top-3 right-3 text-white/70 hover:text-white">
                  <X size={18} />
                </button>
                <div className="flex items-center gap-4 pr-8 flex-wrap">
                  <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-2xl shrink-0">🎁</div>
                  <div className="flex-1 min-w-[180px]">
                    <p className="font-sora font-bold text-base sm:text-lg">Earn bonus AI credits — invite your friends!</p>
                    <p className="text-white/80 text-sm">Get up to 150+ bonus credits by referring classmates to STUDIA.</p>
                  </div>
                  <button onClick={() => { dismissReferralReminder(); navigate('/payments?tab=invite') }}
                    className="bg-white text-purple-600 px-5 py-2.5 rounded-xl font-semibold text-sm whitespace-nowrap hover:bg-gray-100 transition shrink-0">
                    Invite Now
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {statCards.map((stat, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="bg-white rounded-2xl p-4 sm:p-6 border border-gray-200 hover:border-indigo-premium/50 hover:shadow-lg transition group">
                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-${stat.color}/10 flex items-center justify-center text-${stat.color} mb-3 sm:mb-4 group-hover:scale-110 transition`}>
                  <stat.icon size={22} />
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-navy mb-1">{stat.value}</p>
                <p className="text-xs sm:text-sm text-gray-600">{stat.label}</p>
              </motion.div>
            ))}
          </div>

          {/* Quick Actions */}
          <div>
            <h2 className="font-sora font-bold text-xl sm:text-2xl text-navy mb-4 sm:mb-6">Quick Actions</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
              {cards.map((card, i) => (
                <motion.button key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                  onClick={() => navigate(card.path)} className="group text-left">
                  <div className={`bg-gradient-to-br ${card.color} to-transparent rounded-2xl p-4 sm:p-6 border border-gray-200 hover:border-indigo-premium/50 hover:shadow-lg transition h-full ${isLocked && card.path !== '/pricing' && card.path !== '/payments' ? 'opacity-50' : ''}`}>
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-white/20 flex items-center justify-center text-white mb-3 sm:mb-4 group-hover:scale-110 transition">
                      <card.icon size={20} />
                    </div>
                    <h3 className="font-sora font-bold text-navy text-xs sm:text-sm mb-0.5 break-words">{card.title}</h3>
                    <p className="text-xs text-gray-600 hidden sm:block">{card.desc}</p>
                  </div>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Pro tip */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="bg-gradient-to-r from-indigo-premium to-purple-premium rounded-3xl p-6 sm:p-8 text-white overflow-hidden relative">
            <div className="absolute -right-20 -top-20 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
            <div className="relative z-10">
              <h2 className="font-sora font-bold text-2xl sm:text-3xl mb-3">Pro Tip 💡</h2>
              <p className="text-white/90 mb-6 max-w-2xl text-sm sm:text-base">
                Record your lectures, summarize key concepts, and take quizzes regularly. STUDIA automates all of this — just press record.
              </p>
              <button onClick={() => navigate('/pricing')} className="bg-white text-indigo-premium px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition text-sm sm:text-base">
                See Plans — from KSh 29
              </button>
            </div>
          </motion.div>

        </motion.div>
      </div>
    </div>
  )
}
