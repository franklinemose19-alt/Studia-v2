import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  TrendingUp, Users, DollarSign, Clock, RefreshCw,
  CheckCircle, AlertCircle, ArrowLeft, Crown, Zap,
  Activity, UserCheck,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { getSupabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/AuthContext'
import { AdminSkeleton, TableRowSkeleton } from '../components/SkeletonLoader'

interface AdminStats {
  revenue: { total: number; monthly: number; today: number; escrow: number }
  payments: { pendingCount: number; recentPayments: any[] }
  users: {
    total: number
    planCounts: Record<string, number>
    newToday: number
    newThisWeek: number
    newThisHour: number
  }
}

const PLAN_ICONS: Record<string, string> = {
  explorer: '🌍', achiever: '🎯', excellence: '🚀', valedictorian: '🏆', none: '👤',
}
const PLAN_COLORS: Record<string, string> = {
  explorer: 'text-gray-400', achiever: 'text-light-blue',
  excellence: 'text-mint', valedictorian: 'text-warning', none: 'text-[#8B97B5]',
}
const PLAN_BAR_COLORS: Record<string, string> = {
  explorer: 'bg-gray-400', achiever: 'bg-light-blue',
  excellence: 'bg-mint', valedictorian: 'bg-warning', none: 'bg-[#8B97B5]',
}

function formatKsh(amount: number) {
  return `KSh ${amount.toLocaleString()}`
}

function getStatusColor(status: string) {
  switch (status) {
    case 'completed': return 'bg-green-500/20 text-green-400'
    case 'processing': return 'bg-blue-500/20 text-blue-400'
    case 'pending': return 'bg-yellow-500/20 text-yellow-400'
    case 'failed': return 'bg-red-500/20 text-red-400'
    default: return 'bg-white/10 text-[#8B97B5]'
  }
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const { userId } = useAuth()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Admin check
  useEffect(() => {
    if (!userId) return
    const check = async () => {
      try {
        const client = await getSupabase()
        const { data } = await client
          .from('users')
          .select('is_admin')
          .eq('auth_id', userId)
          .maybeSingle()
        setIsAdmin(!!data?.is_admin)
      } catch {
        setIsAdmin(false)
      }
    }
    check()
  }, [userId])

  const fetchStats = async () => {
    if (!userId) return
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminUserId: userId }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to load stats')
        return
      }
      setStats(data)
      setLastUpdated(new Date())
      setError('')
    } catch (err) {
      setError('Connection error. Please refresh.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isAdmin === null) return
    if (!isAdmin) {
      navigate('/dashboard', { replace: true })
      return
    }
    fetchStats()
    intervalRef.current = setInterval(fetchStats, 30000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [isAdmin, userId])

  if (isAdmin === null || (isAdmin && loading)) {
    return (
      <div className="min-h-screen bg-surface-base">
        <nav className="border-b border-white/5 bg-surface-elevated/50 backdrop-blur-md h-16" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <AdminSkeleton />
        </div>
      </div>
    )
  }

  if (error && !stats) {
    return (
      <div className="min-h-screen bg-surface-base flex flex-col items-center justify-center gap-4 px-4">
        <AlertCircle className="text-red-400" size={40} />
        <p className="text-white font-semibold">Could not load dashboard</p>
        <p className="text-[#8B97B5] text-sm text-center">{error}</p>
        <button onClick={fetchStats} className="bg-brand-blue text-white px-6 py-2.5 rounded-xl text-sm font-medium">
          Retry
        </button>
      </div>
    )
  }

  const s = stats!
  const totalUsers = s.users.total || 0

  return (
    <div className="min-h-screen bg-surface-base">
      <nav className="border-b border-white/5 bg-surface-elevated/50 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-sm text-[#8B97B5] hover:text-white">
            <ArrowLeft size={16} /> Back
          </button>
          <div className="flex items-center gap-2">
            <Crown size={18} className="text-warning" />
            <span className="font-sora font-bold text-white">Owner Dashboard</span>
          </div>
          <button onClick={fetchStats} className="p-2 rounded-lg hover:bg-white/10 transition" title="Refresh">
            <RefreshCw size={17} className="text-[#8B97B5]" />
          </button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-10">

        {lastUpdated && (
          <p className="text-xs text-[#4A5568]">
            Last updated: {lastUpdated.toLocaleTimeString()} · Auto-refreshes every 30s
          </p>
        )}

        {/* Revenue */}
        <div>
          <h2 className="font-sora font-bold text-white text-base mb-4 flex items-center gap-2">
            <DollarSign size={16} className="text-brand-green" /> Revenue
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'All-time Revenue', sublabel: 'My money — confirmed', value: formatKsh(s.revenue.total), icon: TrendingUp, color: 'from-brand-green' },
              { label: 'This Month', sublabel: 'Month to date', value: formatKsh(s.revenue.monthly), icon: Activity, color: 'from-brand-blue' },
              { label: 'Today', sublabel: "Today's earnings", value: formatKsh(s.revenue.today), icon: Zap, color: 'from-purple-premium' },
              { label: 'In Escrow', sublabel: 'User money held', value: formatKsh(s.revenue.escrow), icon: Clock, color: 'from-warning' },
            ].map((stat, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                className={`bg-gradient-to-br ${stat.color} to-transparent rounded-xl p-4 border border-white/10`}>
                <stat.icon size={16} className="text-white/60 mb-2" />
                <p className="font-sora font-bold text-xl sm:text-2xl text-white mb-0.5">{stat.value}</p>
                <p className="text-xs text-white/70 font-medium">{stat.label}</p>
                <p className="text-[10px] text-white/40 mt-0.5">{stat.sublabel}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Users */}
        <div>
          <h2 className="font-sora font-bold text-white text-base mb-4 flex items-center gap-2">
            <Users size={16} className="text-brand-blue" /> Users
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            {[
              { label: 'Total Users', value: totalUsers, icon: Users, note: 'All time' },
              { label: 'New Today', value: s.users.newToday, icon: UserCheck, note: 'Last 24h' },
              { label: 'New This Week', value: s.users.newThisWeek, icon: TrendingUp, note: 'Last 7 days' },
              { label: 'Signups Last Hour', value: s.users.newThisHour, icon: Clock, note: 'Demand indicator' },
            ].map((stat, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                className="bg-surface-elevated border border-white/5 rounded-xl p-4">
                <stat.icon size={16} className="text-[#8B97B5] mb-2" />
                <p className="font-sora font-bold text-2xl text-white mb-0.5">{stat.value}</p>
                <p className="text-xs text-[#8B97B5]">{stat.label}</p>
                <p className="text-[10px] text-[#4A5568] mt-0.5">{stat.note}</p>
              </motion.div>
            ))}
          </div>

          {/* Plan breakdown */}
          <div className="bg-surface-elevated border border-white/5 rounded-xl p-5">
            <p className="text-sm font-semibold text-white mb-4">Users by Plan</p>
            <div className="space-y-3">
              {Object.entries(s.users.planCounts)
                .sort(([, a], [, b]) => b - a)
                .map(([plan, count]) => {
                  const pct = totalUsers > 0 ? Math.round((count / totalUsers) * 100) : 0
                  return (
                    <div key={plan}>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs font-semibold flex items-center gap-1.5 ${PLAN_COLORS[plan] || 'text-[#8B97B5]'}`}>
                          {PLAN_ICONS[plan] || '👤'} <span className="capitalize">{plan}</span>
                        </span>
                        <span className="text-xs text-[#8B97B5]">{count} · {pct}%</span>
                      </div>
                      <div className="w-full bg-surface-base rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full transition-all duration-700 ${PLAN_BAR_COLORS[plan] || 'bg-[#8B97B5]'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>
        </div>

        {/* Pending payments alert */}
        {s.payments.pendingCount > 0 && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-5 flex items-start gap-4">
            <Clock className="text-yellow-400 shrink-0 mt-0.5" size={20} />
            <div>
              <p className="text-white font-semibold text-sm">
                {s.payments.pendingCount} payment{s.payments.pendingCount !== 1 ? 's' : ''} pending / in escrow
              </p>
              <p className="text-[#8B97B5] text-xs mt-0.5">
                STK pushes initiated but not yet confirmed by Safaricom.
              </p>
            </div>
          </div>
        )}

        {/* Recent transactions */}
        <div>
          <h2 className="font-sora font-bold text-white text-base mb-4 flex items-center gap-2">
            <CheckCircle size={16} className="text-brand-green" /> Recent Transactions
          </h2>

          {/* Mobile */}
          <div className="sm:hidden space-y-2">
            {s.payments.recentPayments.length === 0 ? (
              <div className="bg-surface-elevated border border-white/5 rounded-xl p-8 text-center text-[#8B97B5] text-sm">
                No transactions yet
              </div>
            ) : s.payments.recentPayments.map((p, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                className="bg-surface-elevated border border-white/5 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-white truncate pr-2 max-w-[140px]">{p.transaction_id}</span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${getStatusColor(p.status)}`}>
                    {p.status}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white font-medium">{p.plan_name}</span>
                  <span className="text-sm text-brand-green font-bold">{formatKsh(p.amount)}</span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-[#8B97B5]">
                  <span>{p.phone_number}</span>
                  <span>{new Date(p.created_at).toLocaleDateString()}</span>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Desktop */}
          <div className="hidden sm:block bg-surface-elevated border border-white/5 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 bg-surface-base/50">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-[#8B97B5]">Transaction ID</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-[#8B97B5]">Phone</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-[#8B97B5]">Plan</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-[#8B97B5]">Amount</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-[#8B97B5]">Status</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-[#8B97B5]">Date</th>
                </tr>
              </thead>
              <tbody>
                {s.payments.recentPayments.length === 0 ? (
                  <tr><td colSpan={6} className="px-5 py-8 text-center text-[#8B97B5] text-sm">No transactions yet</td></tr>
                ) : (
                  s.payments.recentPayments.map((p, i) => (
                    <motion.tr key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                      className="border-b border-white/5 hover:bg-surface-base/40 transition">
                      <td className="px-5 py-3 font-mono text-xs text-white">{p.transaction_id}</td>
                      <td className="px-5 py-3 text-[#8B97B5] text-xs">{p.phone_number}</td>
                      <td className="px-5 py-3 text-white text-xs">{p.plan_name}</td>
                      <td className="px-5 py-3 text-brand-green font-semibold text-xs">{formatKsh(p.amount)}</td>
                      <td className="px-5 py-3">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${getStatusColor(p.status)}`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-[#8B97B5] text-xs">{new Date(p.created_at).toLocaleDateString()}</td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Money explanation */}
        <div className="bg-gradient-to-r from-brand-blue/10 to-purple-500/10 border border-brand-blue/20 rounded-xl p-5 text-sm text-[#8B97B5]">
          <p className="text-white font-semibold mb-2 text-sm">💡 My Money vs User Money</p>
          <p className="text-xs"><span className="text-brand-green font-medium">My money</span> = fully confirmed by Safaricom, yours to keep.</p>
          <p className="text-xs mt-1"><span className="text-warning font-medium">Escrow</span> = user paid but Safaricom callback hasn't confirmed yet — usually resolves in seconds.</p>
          <p className="text-xs mt-1"><span className="text-brand-blue font-medium">Signups last hour</span> = live demand indicator. High = marketing is working.</p>
        </div>

      </div>
    </div>
  )
}
