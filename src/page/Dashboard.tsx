import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  LogOut, Mic, BookOpen, BarChart3, Calendar, Zap,
  ChevronRight, Search, TrendingUp, Lock, CreditCard,
  Sparkles, AlertTriangle, Crown,
} from 'lucide-react'
import { signOut, getSupabase } from '../lib/supabaseClient'
import { usePWAInstall } from '../hooks/usePWAInstall'
import {
  loadAccess, explorerLecturesRemaining, paidLecturesRemaining,
  getPlanLabel, getPlanColor, type AccessInfo, emptyAccess,
} from '../lib/access'
import { useAuth } from '../lib/AuthContext'
import { toast } from '../lib/toast'
import { DashboardSkeleton } from '../components/SkeletonLoader'
import UpgradeModal from '../components/UpgradeModal'
import NotificationBell from '../components/NotificationBell'
import OnboardingModal from '../components/OnboardingModal'

function CircleStat({ value, label, strokeColor, textColor, percentage = 100 }: {
  value: string | number; label: string; strokeColor: string; textColor: string; percentage?: number
}) {
  const r = 24, circ = 2 * Math.PI * r
  const offset = circ - (Math.min(100, Math.max(0, percentage)) / 100) * circ
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative w-14 h-14">
        <svg className="w-14 h-14 -rotate-90 absolute inset-0" viewBox="0 0 56 56">
          <circle cx="28" cy="28" r={r} fill="none" stroke="rgba(0,0,0,0.07)" strokeWidth="3.5" />
          <circle cx="28" cy="28" r={r} fill="none" stroke={strokeColor} strokeWidth="3.5" strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-700" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`font-sora font-bold text-sm leading-none ${textColor}`}>{value}</span>
        </div>
      </div>
      <span className="text-[10px] text-gray-500 text-center leading-tight max-w-[56px]">{label}</span>
    </div>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { userId, user } = useAuth()
  const { installPrompt, isInstalled, isInstalling, install } = usePWAInstall()

  const [stats, setStats] = useState({ lectures: 0, quizzes: 0, avgScore: 0, streak: 0 })
  const [access, setAccess] = useState<AccessInfo>(emptyAccess)
  const [isAdmin, setIsAdmin] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [upgradeReason, setUpgradeReason] = useState<'explorer_locked' | 'no_lectures_left' | 'needs_premium'>('explorer_locked')
  const [showOnboarding, setShowOnboarding] = useState(false)

  const rawName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || ''
  const firstName = rawName.split(' ')[0] || 'there'

  useEffect(() => {
    const init = async () => {
      let lectures = 0, quizResults: any[] = []
      try { lectures = JSON.parse(localStorage.getItem('recordingsMetadata') || '[]').length } catch {}
      try {
        quizResults = JSON.parse(localStorage.getItem('quizResults') || '[]')
        const avg = quizResults.length > 0
          ? Math.round(quizResults.reduce((s, q) => s + (q.total > 0 ? (q.score / q.total) * 100 : 0), 0) / quizResults.length) : 0
        const activeDates = new Set<string>()
        try {
          JSON.parse(localStorage.getItem('recordingsMetadata') || '[]').forEach((r: any) => {
            const d = new Date(r.timestamp || r.date)
            if (!isNaN(d.getTime())) activeDates.add(d.toISOString().slice(0, 10))
          })
        } catch {}
        quizResults.forEach((q: any) => { const d = new Date(q.date); if (!isNaN(d.getTime())) activeDates.add(d.toISOString().slice(0, 10)) })
        let streak = 0
        const cursor = new Date()
        if (!activeDates.has(cursor.toISOString().slice(0, 10))) cursor.setDate(cursor.getDate() - 1)
        while (activeDates.has(cursor.toISOString().slice(0, 10))) { streak++; cursor.setDate(cursor.getDate() - 1) }
        setStats({ lectures, quizzes: quizResults.length, avgScore: avg, streak })
      } catch {}

      const a = await loadAccess(userId)
      setAccess(a)

      if (a.planLocked) { setUpgradeReason('explorer_locked'); setShowUpgradeModal(true) }

      if (userId) {
        try {
          const client = await getSupabase()
          const { data } = await client.from('users').select('is_admin').eq('auth_id', userId).maybeSingle()
          setIsAdmin(!!data?.is_admin)
        } catch {}
      }

      // Show onboarding for new users
      if (!localStorage.getItem('studia_onboarded')) {
        setTimeout(() => setShowOnboarding(true), 800)
      }

      setPageLoading(false)
    }
    init()
  }, [userId])

  const handleSignOut = async () => {
    try { await signOut(); toast.info('Signed out') } catch { toast.error('Sign out failed') }
    navigate('/')
  }

  const plan = access.currentPlan || 'explorer'
  const isExplorer = plan === 'explorer'
  const isAchiever = plan === 'achiever'
  const isPaidPlan = ['excellence', 'valedictorian'].includes(plan)
  const paidLeft = paidLecturesRemaining(access)
  const explorerLeft = explorerLecturesRemaining(access)
  const isLocked = access.planLocked

  const usageBar = (() => {
    if (isExplorer) {
      const used = access.freeCreditsUsed || 0
      return { used, total: 5, pct: Math.round((used / 5) * 100), color: used >= 5 ? 'bg-red-500' : used >= 4 ? 'bg-yellow-400' : 'bg-mint' }
    }
    if (isPaidPlan) {
      const used = access.lecturesUsed || 0, total = access.lectureAllowance || 0
      const pct = total > 0 ? Math.round((used / total) * 100) : 0
      return { used, total, pct, color: pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-yellow-400' : 'bg-mint' }
    }
    return null
  })()

  const circleStats = [
    { value: stats.lectures, label: 'Lectures', strokeColor: '#4F46E5', textColor: 'text-indigo-600', percentage: Math.min(100, stats.lectures * 10) },
    { value: stats.quizzes, label: 'Quizzes', strokeColor: '#6D5EF7', textColor: 'text-purple-600', percentage: Math.min(100, stats.quizzes * 10) },
    { value: `${stats.avgScore}%`, label: 'Avg Score', strokeColor: '#2EE59D', textColor: 'text-green-600', percentage: stats.avgScore },
    { value: `${stats.streak}d`, label: 'Streak', strokeColor: '#F59E0B', textColor: 'text-amber-600', percentage: Math.min(100, stats.streak * 14) },
  ]

  const cards = [
    { icon: Mic, title: 'Record Lecture', desc: 'Smart AI recording', path: '/recording', color: 'from-indigo-premium' },
    { icon: BookOpen, title: 'My Notes', desc: 'Notes & summaries', path: '/notes', color: 'from-purple-premium' },
    { icon: BarChart3, title: 'Test Yourself', desc: 'AI practice tests', path: '/quiz', color: 'from-mint' },
    { icon: Sparkles, title: 'SAGE AI Tutor', desc: 'Your personal AI tutor', path: '/sage', color: 'from-indigo-premium' },
    { icon: Calendar, title: 'Exam Countdown', desc: 'Track your exams', path: '/exam-countdown', color: 'from-warning' },
    { icon: TrendingUp, title: 'Adaptive Learning', desc: 'Weak topic analysis', path: '/adaptive-learning', color: 'from-mint' },
    { icon: Lock, title: 'Offline Vault', desc: 'Study anywhere', path: '/offline-vault', color: 'from-light-blue' },
    { icon: BookOpen, title: 'Unit Management', desc: 'Define syllabi', path: '/units', color: 'from-warning' },
    { icon: CreditCard, title: 'Payments', desc: 'History & billing', path: '/payments', color: 'from-mint' },
    { icon: Calendar, title: 'Study Planner', desc: 'Weekly schedule', path: '/study-planner', color: 'from-light-blue' },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-surface-light to-white">

      {showOnboarding && (
        <OnboardingModal firstName={firstName} onComplete={() => setShowOnboarding(false)} />
      )}

      <UpgradeModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} reason={upgradeReason} currentPlan={plan} />

      {/* Nav */}
      <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-premium to-purple-premium flex items-center justify-center shrink-0">
              <span className="text-white font-bold">S</span>
            </div>
            <span className="font-sora font-bold text-navy text-base sm:text-lg hidden sm:inline">STUDIA AI</span>
            {!isInstalled && installPrompt && (
              <button onClick={install} disabled={isInstalling}
                className="flex items-center gap-1.5 bg-gradient-to-r from-mint to-light-blue text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:opacity-90 transition disabled:opacity-50 ml-1">
                {isInstalling ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : '📲'}
                <span className="hidden sm:inline">{isInstalling ? 'Installing...' : 'Install App'}</span>
              </button>
            )}
            {isAdmin && (
              <button onClick={() => navigate('/admin')}
                className="flex items-center gap-1.5 bg-warning/10 border border-warning/30 text-warning px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-warning/20 transition ml-1">
                <Crown size={13} /><span className="hidden sm:inline">Owner</span>
              </button>
            )}
          </div>
          <div className="flex items-center gap-1 sm:gap-3">
            <div className="hidden md:flex items-center gap-2 bg-gray-100 rounded-lg px-4 py-2 w-48 lg:w-56">
              <Search size={16} className="text-gray-400 shrink-0" />
              <input type="text" placeholder="Search..." className="bg-transparent text-navy outline-none w-full text-sm" />
            </div>
            <NotificationBell userId={userId} />
            <button onClick={handleSignOut} className="flex items-center gap-1.5 text-navy hover:text-indigo-premium transition pl-2 sm:pl-3 border-l border-gray-200 ml-1">
              <LogOut size={18} />
              <span className="text-sm font-medium hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {pageLoading ? <DashboardSkeleton /> : (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 sm:space-y-10">

            <div>
              <h1 className="font-sora font-bold text-4xl sm:text-5xl text-navy mb-2">Welcome back, {firstName}.</h1>
              <p className="text-gray-500 text-sm sm:text-base">
                {stats.streak > 0
                  ? <>On a <span className="font-bold text-indigo-premium">{stats.streak}-day streak</span> — keep going!</>
                  : 'Record a lecture or take a quiz to start your streak.'}
              </p>
            </div>

            {/* Circular stats */}
            <div className="bg-white rounded-2xl border border-gray-200 px-6 py-5">
              <div className="flex items-center justify-around gap-2">
                {circleStats.map((s, i) => <CircleStat key={i} {...s} />)}
              </div>
            </div>

            {/* Plan card */}
            <div
              className={`rounded-2xl p-5 sm:p-6 border-2 cursor-pointer transition-colors ${
                isLocked ? 'bg-red-50 border-red-300'
                : plan === 'valedictorian' ? 'bg-gradient-to-r from-warning/10 to-red-500/10 border-warning/40'
                : plan === 'excellence' ? 'bg-gradient-to-r from-mint/10 to-light-blue/10 border-mint/30'
                : plan === 'achiever' ? 'bg-blue-50/50 border-light-blue/30'
                : 'bg-gray-50 border-gray-200'
              }`}
              onClick={() => {
                if (isLocked) { setUpgradeReason('explorer_locked'); setShowUpgradeModal(true) }
                else if (isPaidPlan && paidLeft === 0) { setUpgradeReason('no_lectures_left'); setShowUpgradeModal(true) }
              }}
            >
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`font-sora font-bold text-lg ${getPlanColor(plan)}`}>{getPlanLabel(plan)}</span>
                    {access.subscriptionStatus === 'active' && isPaidPlan && <span className="text-[10px] bg-mint/20 text-mint px-2 py-0.5 rounded-full font-semibold">ACTIVE</span>}
                    {isLocked && <span className="text-[10px] bg-red-500/20 text-red-600 px-2 py-0.5 rounded-full font-semibold">LOCKED</span>}
                  </div>
                  {isLocked ? (
                    <div className="flex items-start gap-2">
                      <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
                      <p className="text-sm text-red-700">All 5 free lectures used. Tap to unlock AI features.</p>
                    </div>
                  ) : isExplorer ? (
                    <div className="space-y-2">
                      <p className="text-sm text-gray-600"><span className="font-bold text-navy">{explorerLeft}</span> of 5 free lectures remaining · lifetime, no reset</p>
                      {usageBar && <div className="w-full bg-gray-200 rounded-full h-2"><div className={`${usageBar.color} h-2 rounded-full transition-all`} style={{ width: `${usageBar.pct}%` }} /></div>}
                    </div>
                  ) : isAchiever ? (
                    <p className="text-sm text-gray-600">Pay KSh 49–79 per lecture · Bonus credits: <span className="font-bold text-navy">{access.liteBonusCredits || 0}</span></p>
                  ) : isPaidPlan && usageBar ? (
                    <div className="space-y-2">
                      <p className="text-sm text-gray-600"><span className="font-bold text-navy">{usageBar.total - usageBar.used}</span> of {usageBar.total} lectures remaining{access.periodEnd && <span className="text-gray-400 ml-1">· resets {new Date(access.periodEnd).toLocaleDateString()}</span>}</p>
                      <div className="w-full bg-white/50 rounded-full h-2"><div className={`${usageBar.color} h-2 rounded-full transition-all`} style={{ width: `${usageBar.pct}%` }} /></div>
                    </div>
                  ) : null}
                </div>
                {(isLocked || (isPaidPlan && paidLeft <= 3)) && (
                  <button onClick={e => { e.stopPropagation(); setUpgradeReason(isLocked ? 'explorer_locked' : 'no_lectures_left'); setShowUpgradeModal(true) }}
                    className="bg-indigo-premium text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-purple-premium transition whitespace-nowrap shrink-0">
                    {isLocked ? 'Unlock Now' : 'Get More'}
                  </button>
                )}
              </div>
            </div>

            {/* Refer and Earn */}
            <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-2 border-purple-500/20 rounded-2xl p-5 sm:p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-2xl shrink-0">🎁</div>
                <div className="flex-1 min-w-0">
                  <p className="font-sora font-bold text-navy text-base mb-0.5">Refer and Earn — Free AI Credits</p>
                  <p className="text-gray-600 text-sm">Invite classmates and earn up to <span className="font-semibold text-purple-600">150+ bonus credits</span>.</p>
                </div>
                <button onClick={() => navigate('/payments?tab=invite')}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:opacity-90 transition whitespace-nowrap shrink-0">
                  Invite Friends →
                </button>
              </div>
            </div>

            {/* Quick Actions */}
            <div>
              <h2 className="font-sora font-bold text-xl sm:text-2xl text-navy mb-4 sm:mb-6">Quick Actions</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
                {cards.map((card, i) => (
                  <motion.button key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                    onClick={() => {
                      if (isLocked && card.path !== '/payments') { setUpgradeReason('explorer_locked'); setShowUpgradeModal(true); return }
                      navigate(card.path)
                    }}
                    className="group text-left">
                    <div className={`bg-gradient-to-br ${card.color} to-transparent rounded-2xl p-4 sm:p-5 border border-gray-200 hover:border-indigo-premium/50 hover:shadow-lg transition h-full ${isLocked && card.path !== '/payments' ? 'opacity-60' : ''}`}>
                      <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center text-white mb-3 group-hover:scale-110 transition">
                        <card.icon size={20} />
                      </div>
                      <h3 className="font-sora font-bold text-navy text-xs sm:text-sm mb-0.5 break-words">{card.title}</h3>
                      <p className="text-xs text-gray-600 hidden sm:block">{card.desc}</p>
                      <div className="hidden sm:flex items-center gap-1 text-indigo-premium text-xs font-medium opacity-0 group-hover:opacity-100 transition mt-2">
                        Open <ChevronRight size={12} />
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>

            <div className="bg-gradient-to-r from-indigo-premium to-purple-premium rounded-3xl p-6 sm:p-8 text-white overflow-hidden relative">
              <div className="absolute -right-20 -top-20 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
              <div className="relative z-10">
                <h2 className="font-sora font-bold text-2xl sm:text-3xl mb-3">Pro Tip</h2>
                <p className="text-white/90 mb-6 max-w-2xl text-sm sm:text-base">Record your lectures, let SAGE generate Smart Ink notes, then use SAGE AI Tutor to quiz yourself before exams.</p>
                <button onClick={() => navigate('/pricing')} className="bg-white text-indigo-premium px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition text-sm sm:text-base">
                  See Plans — from KSh 49
                </button>
              </div>
            </div>

          </motion.div>
        )}
      </div>
    </div>
  )
}
