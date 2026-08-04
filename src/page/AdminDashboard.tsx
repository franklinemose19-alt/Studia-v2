import { useState, useEffect, useRef } from 'react'
import {
  TrendingUp, Users, DollarSign, Clock, RefreshCw,
  CheckCircle, AlertCircle, ArrowLeft, Crown,
  Activity, UserCheck,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { getSupabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/AuthContext'

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
const PLAN_STROKE: Record<string, string> = {
  explorer: '#9CA3AF', achiever: '#60A5FA',
  excellence: '#2EE59D', valedictorian: '#F59E0B', none: '#8B97B5',
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

// ── Circular stat — same WhatsApp-style as Dashboard ─────────────────────

function CircleStat({
  value, label, strokeColor, textColor, percentage = 100,
}: {
  value: string | number
  label: string
  strokeColor: string
  textColor: string
  percentage?: number
}) {
  const r = 22
  const circ = 2 * Math.PI * r
  const offset = circ - (Math.min(100, Math.max(0, percentage)) / 100) * circ
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative w-12 h-12">
        <svg className="w-12 h-12 -rotate-90 absolute inset-0" viewBox="0 0 48 48">
          <circle cx="24" cy="24" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
          <circle
            cx="24" cy="24" r={r} fill="none"
            stroke={strokeColor}
            strokeWidth="3"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`font-sora font-bold text-xs leading-none ${textColor}`}>{value}</span>
        </div>
      </div>
      <span className="text-[9px] text-[#8B97B5] text-center leading-tight max-w-[48px]">{label}</span>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const navigate = useNavigate()
  const { userId } = useAuth()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

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
      if (!res.ok) { setError(data.error || 'Failed to load stats'); return }
      setStats(data)
      setLastUpdated(new Date())
      setError('')
    } catch {
      setError('Connection error. Please refresh.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isAdmin === null) return
    if (!isAdmin) { navigate('/dashboard', { replace: true }); return }
    fetchStats()
    intervalRef.current = setInterval(fetchStats, 30000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [isAdmin, userId])

  if (isAdmin === null || (isAdmin && loading)) {
    return (
      <div className="min-h-screen bg-surface-base flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-warning to-red-500 flex items-center justify-center">
            <Crown size={22} className="text-white" />
          </div>
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-warning" />
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

  // Revenue circle data
  const revenueCircles = [
    { value: formatKsh(s.revenue.total).replace('KSh ', ''), label: 'All-time', strokeColor: '#22C55E', textColor: 'text-green-400', percentage: 100 },
    { value: formatKsh(s.revenue.monthly).replace('KSh ', ''), label: 'This month', strokeColor: '#3B82F6', textColor: 'text-brand-blue', percentage: Math.min(100, (s.revenue.monthly / Math.max(1, s.revenue.total)) * 100) },
    { value: formatKsh(s.revenue.today).replace('KSh ', ''), label: 'Today', strokeColor: '#6D5EF7', textColor: 'text-purple-400', percentage: Math.min(100, (s.revenue.today / Math.max(1, s.revenue.monthly)) * 100) },
    { value: formatKsh(s.revenue.escrow).replace('KSh ', ''), label: 'Escrow', strokeColor: '#F59E0B', textColor: 'text-warning', percentage: Math.min(100, (s.revenue.escrow / Math.max(1, s.revenue.total)) * 100) },
  ]

  // User circle data
  const userCircles = [
    { value: totalUsers, label: 'Total', strokeColor: '#3B82F6', textColor: 'text-brand-blue', percentage: 100 },
    { value: s.users.newToday, label: 'Today', strokeColor: '#22C55E', textColor: 'text-green-400', percentage: Math.min(100, (s.users.newToday / Math.max(1, totalUsers)) * 500) },
    { value: s.users.newThisWeek, label: 'This week', strokeColor: '#6D5EF7', textColor: 'text-purple-400', percentage: Math.min(100, (s.users.newThisWeek / Math.max(1, totalUsers)) * 200) },
    { value: s.users.newThisHour, label: 'Last hour', strokeColor: '#F59E0B', textColor: 'text-warning', percentage: Math.min(100, s.users.newThisHour * 20) },
  ]

  return (
    <div className="min-h-screen bg-surface-base">

      {/* Nav */}
      <nav className="border-b border-white/5 bg-surface-elevated/50 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-sm text-[#8B97B5] hover:text-white transition-colors">
            <ArrowLeft size={16} /> Back
          </button>
          <div className="flex items-center gap-2">
            <Crown size={18} className="text-warning" />
            <span className="font-sora font-bold text-white">Owner Dashboard</span>
          </div>
          <button onClick={fetchStats} className="p-2 rounded-lg hover:bg-white/10 transition-colors" title="Refresh">
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

        {/* ── Revenue ─────────────────────────────────────────────────── */}
        <div className="bg-surface-elevated border border-white/5 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-5">
            <DollarSign size={15} className="text-brand-green" />
            <p className="text-sm font-semibold text-white">Revenue</p>
          </div>
          <div className="flex items-center justify-around gap-2">
            {revenueCircles.map((c, i) => (
              <CircleStat key={i} value={c.value} label={c.label} strokeColor={c.strokeColor} textColor={c.textColor} percentage={c.percentage} />
            ))}
          </div>
          <div className="mt-5 pt-4 border-t border-white/5 grid grid-cols-2 gap-3">
            <div className="bg-surface-base rounded-xl p-3">
              <p className="text-[10px] text-[#8B97B5] mb-1">My confirmed money</p>
              <p className="text-brand-green font-bold text-sm">{formatKsh(s.revenue.total)}</p>
            </div>
            <div className="bg-surface-base rounded-xl p-3">
              <p className="text-[10px] text-[#8B97B5] mb-1">User money in escrow</p>
              <p className="text-warning font-bold text-sm">{formatKsh(s.revenue.escrow)}</p>
            </div>
          </div>
        </div>

        {/* ── Users ───────────────────────────────────────────────────── */}
        <div className="bg-surface-elevated border border-white/5 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-5">
            <Users size={15} className="text-brand-blue" />
            <p className="text-sm font-semibold text-white">Users</p>
          </div>
          <div className="flex items-center justify-around gap-2">
            {userCircles.map((c, i) => (
              <CircleStat key={i} value={c.value} label={c.label} strokeColor={c.strokeColor} textColor={c.textColor} percentage={c.percentage} />
            ))}
          </div>

          {/* Plan breakdown */}
          <div className="mt-5 pt-4 border-t border-white/5 space-y-2.5">
            <p className="text-[10px] text-[#8B97B5] font-semibold uppercase tracking-wide">By Plan</p>
            {Object.entries(s.users.planCounts)
              .sort(([, a], [, b]) => b - a)
              .map(([plan, count]) => {
                const pct = totalUsers > 0 ? Math.round((count / totalUsers) * 100) : 0
                return (
                  <div key={plan} className="flex items-center gap-2">
                    <span className="text-xs w-4">{PLAN_ICONS[plan] || '👤'}</span>
                    <span className={`text-xs capitalize w-20 shrink-0 ${PLAN_COLORS[plan] || 'text-[#8B97B5]'}`}>{plan}</span>
                    <div className="flex-1 bg-surface-base rounded-full h-1.5">
                      <div
                        className="h-1.5 rounded-full"
                        style={{ width: `${pct}%`, backgroundColor: PLAN_STROKE[plan] || '#8B97B5' }}
                      />
                    </div>
                    <span className="text-[10px] text-[#8B97B5] w-10 text-right shrink-0">{count} · {pct}%</span>
                  </div>
                )
              })}
          </div>
        </div>

        {/* ── Pending payments alert ───────────────────────────────────── */}
        {s.payments.pendingCount > 0 && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl px-4 py-3 flex items-center gap-3">
            <Clock size={16} className="text-yellow-400 shrink-0" />
            <div>
              <p className="text-white font-semibold text-sm">
                {s.payments.pendingCount} payment{s.payments.pendingCount !== 1 ? 's' : ''} pending
              </p>
              <p className="text-[#8B97B5] text-xs">STK pushes initiated but not yet confirmed by Safaricom</p>
            </div>
          </div>
        )}

        {/* ── Recent transactions ──────────────────────────────────────── */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle size={15} className="text-brand-green" />
            <p className="text-sm font-semibold text-white">Recent Transactions</p>
          </div>

          {/* Mobile cards */}
          <div className="sm:hidden space-y-2">
            {s.payments.recentPayments.length === 0 ? (
              <div className="bg-surface-elevated border border-white/5 rounded-xl p-8 text-center text-[#8B97B5] text-sm">
                No transactions yet
              </div>
            ) : s.payments.recentPayments.map((p, i) => (
              <div key={i} className="bg-surface-elevated border border-white/5 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-white truncate pr-2 max-w-[140px]">{p.transaction_id}</span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${getStatusColor(p.status)}`}>{p.status}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white font-medium">{p.plan_name}</span>
                  <span className="text-sm text-brand-green font-bold">{formatKsh(p.amount)}</span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-[#8B97B5]">
                  <span>{p.phone_number}</span>
                  <span>{new Date(p.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden sm:block bg-surface-elevated border border-white/5 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 bg-surface-base/50">
                  {['Transaction ID', 'Phone', 'Plan', 'Amount', 'Status', 'Date'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-[#8B97B5]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {s.payments.recentPayments.length === 0 ? (
                  <tr><td colSpan={6} className="px-5 py-8 text-center text-[#8B97B5] text-sm">No transactions yet</td></tr>
                ) : s.payments.recentPayments.map((p, i) => (
                  <tr key={i} className="border-b border-white/5 hover:bg-surface-base/30 transition-colors">
                    <td className="px-5 py-3 font-mono text-xs text-white">{p.transaction_id}</td>
                    <td className="px-5 py-3 text-[#8B97B5] text-xs">{p.phone_number}</td>
                    <td className="px-5 py-3 text-white text-xs">{p.plan_name}</td>
                    <td className="px-5 py-3 text-brand-green font-semibold text-xs">{formatKsh(p.amount)}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${getStatusColor(p.status)}`}>{p.status}</span>
                    </td>
                    <td className="px-5 py-3 text-[#8B97B5] text-xs">{new Date(p.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Money explanation ─────────────────────────────────────────── */}
        <div className="bg-gradient-to-r from-brand-blue/10 to-purple-500/10 border border-brand-blue/20 rounded-xl p-4">
          <p className="text-white font-semibold text-sm mb-2">💡 Money breakdown</p>
          <div className="space-y-1 text-xs text-[#8B97B5]">
            <p><span className="text-brand-green font-medium">All-time</span> = confirmed by Safaricom, yours to keep.</p>
            <p><span className="text-warning font-medium">Escrow</span> = paid but callback not yet confirmed — usually resolves in seconds.</p>
            <p><span className="text-brand-blue font-medium">Last hour signups</span> = live demand indicator.</p>
          </div>
        </div>

      </div>
    </div>
  )
}
