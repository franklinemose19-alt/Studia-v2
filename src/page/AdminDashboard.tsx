import { useState, useEffect, useRef } from 'react'
import {
  DollarSign, Users, Clock, RefreshCw, CheckCircle,
  AlertCircle, ArrowLeft, Crown, Activity, Zap,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { getSupabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/AuthContext'
import { Wrench } from 'lucide-react'
import { toast } from '../lib/toast'
interface AdminStats {
  revenue: { total: number; monthly: number; today: number; escrow: number }
  payments: { pendingCount: number; recentPayments: any[] }
  users: { total: number; planCounts: Record<string, number>; newToday: number; newThisWeek: number; newThisHour: number }
  apiCosts: {
    totalUSD: number; totalKSH: number
    monthlyUSD: number; monthlyKSH: number
    todayUSD: number; todayKSH: number
    totalTokens: number
    featureCosts: Record<string, number>
  }
}

const PLAN_ICONS: Record<string, string> = { explorer: '🌍', achiever: '🎯', excellence: '🚀', valedictorian: '🏆', none: '👤' }
const PLAN_COLORS: Record<string, string> = { explorer: 'text-gray-400', achiever: 'text-light-blue', excellence: 'text-mint', valedictorian: 'text-warning', none: 'text-[#8B97B5]' }
const PLAN_STROKE: Record<string, string> = { explorer: '#9CA3AF', achiever: '#60A5FA', excellence: '#2EE59D', valedictorian: '#F59E0B', none: '#8B97B5' }

function formatKsh(n: number) { return `KSh ${n.toLocaleString()}` }

function getStatusColor(s: string) {
  switch (s) {
    case 'completed': return 'bg-green-500/20 text-green-400'
    case 'processing': return 'bg-blue-500/20 text-blue-400'
    case 'pending': return 'bg-yellow-500/20 text-yellow-400'
    case 'failed': return 'bg-red-500/20 text-red-400'
    default: return 'bg-white/10 text-[#8B97B5]'
  }
}

function CircleStat({ value, label, strokeColor, textColor, percentage = 100 }: {
  value: string | number; label: string; strokeColor: string; textColor: string; percentage?: number
}) {
  const r = 22, circ = 2 * Math.PI * r
  const offset = circ - (Math.min(100, Math.max(0, percentage)) / 100) * circ
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative w-12 h-12">
        <svg className="w-12 h-12 -rotate-90 absolute inset-0" viewBox="0 0 48 48">
          <circle cx="24" cy="24" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
          <circle cx="24" cy="24" r={r} fill="none" stroke={strokeColor} strokeWidth="3" strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`font-sora font-bold text-[11px] leading-none ${textColor}`}>{value}</span>
        </div>
      </div>
      <span className="text-[9px] text-[#8B97B5] text-center leading-tight max-w-[48px]">{label}</span>
    </div>
  )
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

  useEffect(() => {
    if (!userId) return
    getSupabase().then(client =>
      client.from('users').select('is_admin').eq('auth_id', userId).maybeSingle()
        .then(({ data }) => setIsAdmin(!!data?.is_admin))
        .catch(() => setIsAdmin(false))
    )
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
      if (!res.ok) { setError(data.error || 'Failed'); return }
      setStats(data)
      setLastUpdated(new Date())
      setError('')
    } catch { setError('Connection error.') }
    finally { setLoading(false) }
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
        <p className="text-[#8B97B5] text-sm">{error}</p>
        <button onClick={fetchStats} className="bg-brand-blue text-white px-6 py-2.5 rounded-xl text-sm">Retry</button>
      </div>
    )
  }

  const s = stats!
  const totalUsers = s.users.total || 0

  const revenueCircles = [
    { value: formatKsh(s.revenue.total), label: 'All-time', strokeColor: '#22C55E', textColor: 'text-green-400', percentage: 100 },
    { value: formatKsh(s.revenue.monthly), label: 'This month', strokeColor: '#3B82F6', textColor: 'text-brand-blue', percentage: Math.min(100, (s.revenue.monthly / Math.max(1, s.revenue.total)) * 100) },
    { value: formatKsh(s.revenue.today), label: 'Today', strokeColor: '#6D5EF7', textColor: 'text-purple-400', percentage: Math.min(100, (s.revenue.today / Math.max(1, s.revenue.monthly)) * 100) },
    { value: formatKsh(s.revenue.escrow), label: 'Escrow', strokeColor: '#F59E0B', textColor: 'text-warning', percentage: Math.min(100, (s.revenue.escrow / Math.max(1, s.revenue.total)) * 100) },
  ]

  const userCircles = [
    { value: totalUsers, label: 'Total', strokeColor: '#3B82F6', textColor: 'text-brand-blue', percentage: 100 },
    { value: s.users.newToday, label: 'Today', strokeColor: '#22C55E', textColor: 'text-green-400', percentage: Math.min(100, (s.users.newToday / Math.max(1, totalUsers)) * 500) },
    { value: s.users.newThisWeek, label: 'This week', strokeColor: '#6D5EF7', textColor: 'text-purple-400', percentage: Math.min(100, (s.users.newThisWeek / Math.max(1, totalUsers)) * 200) },
    { value: s.users.newThisHour, label: 'Last hour', strokeColor: '#F59E0B', textColor: 'text-warning', percentage: Math.min(100, s.users.newThisHour * 20) },
  ]

  const apiCostCircles = [
    { value: `$${s.apiCosts.totalUSD}`, label: 'Total cost', strokeColor: '#EF4444', textColor: 'text-red-400', percentage: 100 },
    { value: `$${s.apiCosts.monthlyUSD}`, label: 'This month', strokeColor: '#F59E0B', textColor: 'text-warning', percentage: Math.min(100, (s.apiCosts.monthlyUSD / Math.max(0.001, s.apiCosts.totalUSD)) * 100) },
    { value: `$${s.apiCosts.todayUSD}`, label: 'Today', strokeColor: '#6D5EF7', textColor: 'text-purple-400', percentage: Math.min(100, (s.apiCosts.todayUSD / Math.max(0.001, s.apiCosts.monthlyUSD)) * 100) },
    { value: `${(s.apiCosts.totalTokens / 1000).toFixed(0)}k`, label: 'Tokens used', strokeColor: '#3B82F6', textColor: 'text-brand-blue', percentage: Math.min(100, s.apiCosts.totalTokens / 10000) },
  ]

  return (
    <div className="min-h-screen bg-surface-base">
      <nav className="border-b border-white/5 bg-surface-elevated/50 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-sm text-[#8B97B5] hover:text-white transition-colors">
            <ArrowLeft size={16} /> Back
          </button>
          <div className="flex items-center gap-2">
            <Crown size={18} className="text-warning" />
            <span className="font-sora font-bold text-white">Owner Dashboard</span>
          </div>
          <button onClick={fetchStats} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
            <RefreshCw size={17} className="text-[#8B97B5]" />
          </button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {lastUpdated && (
          <p className="text-xs text-[#4A5568]">Last updated: {lastUpdated.toLocaleTimeString()} · Auto-refreshes every 30s</p>
        )}

        {/* Revenue */}
        <div className="bg-surface-elevated border border-white/5 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-5">
            <DollarSign size={15} className="text-brand-green" />
            <p className="text-sm font-semibold text-white">Revenue</p>
          </div>
          <div className="flex items-center justify-around gap-2">
            {revenueCircles.map((c, i) => <CircleStat key={i} {...c} />)}
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

        {/* Users */}
        <div className="bg-surface-elevated border border-white/5 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-5">
            <Users size={15} className="text-brand-blue" />
            <p className="text-sm font-semibold text-white">Users</p>
          </div>
          <div className="flex items-center justify-around gap-2">
            {userCircles.map((c, i) => <CircleStat key={i} {...c} />)}
          </div>
          <div className="mt-5 pt-4 border-t border-white/5 space-y-2.5">
            <p className="text-[10px] text-[#8B97B5] font-semibold uppercase tracking-wide">By Plan</p>
            {Object.entries(s.users.planCounts).sort(([, a], [, b]) => b - a).map(([plan, count]) => {
              const pct = totalUsers > 0 ? Math.round((count / totalUsers) * 100) : 0
              return (
                <div key={plan} className="flex items-center gap-2">
                  <span className="text-xs w-4">{PLAN_ICONS[plan] || '👤'}</span>
                  <span className={`text-xs capitalize w-20 shrink-0 ${PLAN_COLORS[plan] || 'text-[#8B97B5]'}`}>{plan}</span>
                  <div className="flex-1 bg-surface-base rounded-full h-1.5">
                    <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, backgroundColor: PLAN_STROKE[plan] || '#8B97B5' }} />
                  </div>
                  <span className="text-[10px] text-[#8B97B5] w-12 text-right shrink-0">{count} · {pct}%</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* API Costs */}
        <div className="bg-surface-elevated border border-white/5 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-5">
            <Zap size={15} className="text-red-400" />
            <p className="text-sm font-semibold text-white">API Costs (OpenAI)</p>
          </div>
          <div className="flex items-center justify-around gap-2 mb-5">
            {apiCostCircles.map((c, i) => <CircleStat key={i} {...c} />)}
          </div>

          {/* KSh equivalents */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[
              { label: 'Total in KSh', value: formatKsh(s.apiCosts.totalKSH) },
              { label: 'This month', value: formatKsh(s.apiCosts.monthlyKSH) },
              { label: 'Today', value: formatKsh(s.apiCosts.todayKSH) },
            ].map((item, i) => (
              <div key={i} className="bg-surface-base rounded-xl p-3 text-center">
                <p className="text-[10px] text-[#8B97B5] mb-1">{item.label}</p>
                <p className="text-red-400 font-bold text-xs">{item.value}</p>
              </div>
            ))}
          </div>

          {/* Feature breakdown */}
          {Object.keys(s.apiCosts.featureCosts).length > 0 && (
            <div className="border-t border-white/5 pt-4 space-y-2">
              <p className="text-[10px] text-[#8B97B5] font-semibold uppercase tracking-wide">Cost by Feature</p>
              {Object.entries(s.apiCosts.featureCosts).slice(0, 8).map(([feature, cost]) => {
                const pct = s.apiCosts.totalUSD > 0 ? Math.round((cost / s.apiCosts.totalUSD) * 100) : 0
                return (
                  <div key={feature} className="flex items-center gap-2">
                    <span className="text-xs text-[#8B97B5] w-32 shrink-0 truncate">{feature.replace(/_/g, ' ')}</span>
                    <div className="flex-1 bg-surface-base rounded-full h-1.5">
                      <div className="h-1.5 rounded-full bg-red-400" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-[10px] text-[#8B97B5] w-16 text-right shrink-0">${cost} · {pct}%</span>
                  </div>
                )
              })}
            </div>
          )}

          <div className="mt-4 bg-red-500/10 border border-red-500/20 rounded-xl p-3">
            <p className="text-xs text-red-400 font-medium">
              💡 Profit check: Revenue today {formatKsh(s.revenue.today)} vs AI cost today {formatKsh(s.apiCosts.todayKSH)} = net {formatKsh(s.revenue.today - s.apiCosts.todayKSH)}
            </p>
          </div>
        </div>

        {/* Pending payments */}
        {s.payments.pendingCount > 0 && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl px-4 py-3 flex items-center gap-3">
            <Clock size={16} className="text-yellow-400 shrink-0" />
            <div>
              <p className="text-white font-semibold text-sm">{s.payments.pendingCount} payment{s.payments.pendingCount !== 1 ? 's' : ''} pending</p>
              <p className="text-[#8B97B5] text-xs">STK pushes awaiting Safaricom confirmation</p>
            </div>
          </div>
        )}

        {/* Recent transactions */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle size={15} className="text-brand-green" />
            <p className="text-sm font-semibold text-white">Recent Transactions</p>
          </div>

          <div className="sm:hidden space-y-2">
            {s.payments.recentPayments.length === 0 ? (
              <div className="bg-surface-elevated border border-white/5 rounded-xl p-8 text-center text-[#8B97B5] text-sm">No transactions yet</div>
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
      </div>
    </div>
  )
}
