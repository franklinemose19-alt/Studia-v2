import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  TrendingUp, Users, DollarSign, Clock, RefreshCw,
  CheckCircle, AlertCircle, ArrowLeft, Crown, Zap,
  Sparkles, UserCheck, Activity,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { getSupabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/AuthContext'

interface AdminStats {
  revenue: { total: number; monthly: number; today: number; escrow: number }
  payments: { pendingCount: number; recentPayments: any[] }
  users: { total: number; planCounts: Record<string, number>; newToday: number; newThisWeek: number; newThisHour: number }
}

const PLAN_ICONS: Record<string, string> = {
  free: '🆓', lite: '⚡', pro: '🎨', semester: '🏆', none: '👤'
}
const PLAN_COLORS: Record<string, string> = {
  free: 'text-gray-400', lite: 'text-light-blue', pro: 'text-mint', semester: 'text-warning', none: 'text-[#8B97B5]'
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
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchStats = async () => {
    if (!userId) return
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminUserId: userId }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed to load stats'); return }
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
    fetchStats()
    intervalRef.current = setInterval(fetchStats, 30000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [userId])

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-base flex flex-col items-center justify-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-blue" />
        <p className="text-[#8B97B5] text-sm">Loading your dashboard...</p>
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
          <button onClick={fetchStats} className="p-2 rounded-lg hover:bg-white/10 transition">
            <RefreshCw size={17} className="text-[#8B97B5]" />
          </button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {lastUpdated && (
          <p className="text-xs text-[#4A5568]">
            Last updated: {lastUpdated.toLocaleTimeString()} · Auto-refreshes every 30s
          </p>
        )}

        {/* Revenue section */}
        <div>
          <h2 className="font-sora font-bold text-white text-lg mb-4 flex items-center gap-2">
            <DollarSign size={18} className="text-brand-green" /> Revenue
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'All-time Revenue', value: formatKsh(s.revenue.total), icon: TrendingUp, color: 'from-brand-green', sublabel: 'My money' },
              { label: 'This Month', value: formatKsh(s.revenue.monthly), icon: Activity, color: 'from-brand-blue', sublabel: 'Month earnings' },
              { label: 'Today', value: formatKsh(s.revenue.today), icon: Zap, color: 'from-purple-premium', sublabel: "Today's earnings" },
              { label: 'In Escrow', value: formatKsh(s.revenue.escrow), icon: Clock, color: 'from-warning', sublabel: 'User money held' },
            ].map((stat, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                className={`bg-gradient-to-br ${stat.color} to-transparent rounded-xl p-4 border border-white/10`}>
                <stat.icon size={18} className="text-white/60 mb-2" />
                <p className="font-sora font-bold text-2xl text-white mb-0.5">{stat.value}</p>
                <p className="text-xs text-white/70 font-medium">{stat.label}</p>
                <p className="text-[10px] text-white/40 mt-0.5">{stat.sublabel}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* User stats */}
        <div>
          <h2 className="font-sora font-bold text-white text-lg mb-4 flex items-center gap-2">
            <Users size={18} className="text-brand-blue" /> Users
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            {[
              { label: 'Total Users', value: s.users.total, icon: Users },
              { label: 'New Today', value: s.users.newToday, icon: UserCheck },
              { label: 'New This Week', value: s.users.newThisWeek, icon: TrendingUp },
              { label: 'Signups Last Hour', value: s.users.newThisHour, icon: Clock, note: 'Retry queue proxy' },
            ].map((stat, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                className="bg-surface-elevated border border-white/5 rounded-xl p-4">
                <stat.icon size={16} className="text-[#8B97B5] mb-2" />
                <p className="font-sora font-bold text-2xl text-white mb-0.5">{stat.value}</p>
                <p className="text-xs text-[#8B97B5]">{stat.label}</p>
                {stat.note && <p className="text-[10px] text-[#4A5568] mt-0.5">{stat.note}</p>}
              </motion.div>
            ))}
          </div>

          {/* Plan breakdown */}
          <div className="bg-surface-elevated border border-white/5 rounded-xl p-5">
            <p className="text-sm font-semibold text-white mb-4">Users by Plan</p>
            <div className="space-y-3">
              {Object.entries(s.users.planCounts).map(([plan, count]) => {
                const pct = s.users.total > 0 ? Math.round((count / s.users.total) * 100) : 0
                return (
                  <div key={plan}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs font-medium capitalize flex items-center gap-1.5 ${PLAN_COLORS[plan] || 'text-[#8B97B5]'}`}>
                        {PLAN_ICONS[plan] || '👤'} {plan}
                      </span>
                      <span className="text-xs text-[#8B97B5]">{count} · {pct}%</span>
                    </div>
                    <div className="w-full bg-surface-base rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full transition-all duration-700 ${
                          plan === 'semester' ? 'bg-warning'
                          : plan === 'pro' ? 'bg-mint'
                          : plan === 'lite' ? 'bg-light-blue'
                          : 'bg-[#8B97B5]'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Pending payments / queue */}
        {s.payments.pendingCount > 0 && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-5 flex items-start gap-4">
            <Clock className="text-yellow-400 shrink-0 mt-0.5" size={20} />
            <div>
              <p className="text-white font-semibold">{s.payments.pendingCount} payment{s.payments.pendingCount !== 1 ? 's' : ''} pending / in escrow</p>
              <p className="text-sm text-[#8B97B5] mt-0.5">These are M-Pesa STK pushes that were initiated but not yet confirmed by Safaricom.</p>
            </div>
          </div>
        )}

        {/* Recent transactions */}
        <div>
          <h2 className="font-sora font-bold text-white text-lg mb-4 flex items-center gap-2">
            <CheckCircle size={18} className="text-brand-green" /> Recent Transactions
          </h2>

          {/* Mobile */}
          <div className="sm:hidden space-y-2">
            {s.payments.recentPayments.map((p, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                className="bg-surface-elevated border border-white/5 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-white truncate pr-2 max-w-[140px]">{p.transaction_id}</span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${getStatusColor(p.status)}`}>
                    {p.status}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white font-medium">{p.plan_name}</span>
                  <span className="text-sm text-brand-green font-bold">{formatKsh(p.amount)}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-[#8B97B5]">
                  <span>{p.phone_number}</span>
                  <span>{new Date(p.created_at).toLocaleDateString()}</span>
                </div>
              </motion.div>
            ))}
            {s.payments.recentPayments.length === 0 && (
              <div className="bg-surface-elevated border border-white/5 rounded-xl p-8 text-center text-[#8B97B5] text-sm">
                No transactions yet
              </div>
            )}
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
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-[#8B97B5]">No transactions yet</td>
                  </tr>
                ) : s.payments.recentPayments.map((p, i) => (
                  <motion.tr key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                    className="border-b border-white/5 hover:bg-surface-base/40 transition">
                    <td className="px-5 py-3 font-mono text-xs text-white">{p.transaction_id}</td>
                    <td className="px-5 py-3 text-[#8B97B5]">{p.phone_number}</td>
                    <td className="px-5 py-3 text-white">{p.plan_name}</td>
                    <td className="px-5 py-3 text-brand-green font-semibold">{formatKsh(p.amount)}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${getStatusColor(p.status)}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-[#8B97B5] text-xs">{new Date(p.created_at).toLocaleDateString()}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* What escrow means */}
        <div className="bg-gradient-to-r from-brand-blue/10 to-purple-500/10 border border-brand-blue/20 rounded-xl p-5 text-sm text-[#8B97B5]">
          <p className="text-white font-semibold mb-2">💡 My Money vs User Money</p>
          <p><span className="text-brand-green">My money</span> = KSh that has been fully confirmed by Safaricom and is yours (completed payments).</p>
          <p className="mt-1"><span className="text-warning">User money / Escrow</span> = KSh users paid that's still in a processing state — M-Pesa confirmed but our callback hasn't fired yet, or still pending.</p>
          <p className="mt-1"><span className="text-brand-blue">Signups last hour</span> = acts as a proxy for your signup queue — how many new users are trying to join right now.</p>
        </div>

      </div>
    </div>
  )
}
