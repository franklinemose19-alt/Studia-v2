import { useState, useEffect, useRef } from 'react'
import {
  DollarSign, Users, Clock, RefreshCw, CheckCircle,
  AlertCircle, ArrowLeft, Crown, Zap, Wrench, Server,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { getSupabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/AuthContext'
import { toast } from '../lib/toast'

interface AIProviderInfo {
  enabled: boolean
  configured: boolean
  status: string
  consecutiveFailures: number
  avgLatencyMs: number
  monthlyBudgetUsd: number
  safetyThresholdPct: number
  monthSpendUsd: number
}

interface AIFailover {
  id: number
  feature: string
  primary_provider: string
  fallback_provider: string
  reason: string
  succeeded: boolean
  created_at: string
}

interface AdminStats {
  maintenanceMode: boolean
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
  aiInfrastructure: {
    providers: { openai: AIProviderInfo; azure: AIProviderInfo }
    recentFailovers: AIFailover[]
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

function providerStatusColor(status: string) {
  switch (status) {
    case 'healthy': return 'text-green-400 bg-green-500/15'
    case 'degraded': return 'text-yellow-400 bg-yellow-500/15'
    case 'unavailable': return 'text-red-400 bg-red-500/15'
    case 'rate_limited': return 'text-orange-400 bg-orange-500/15'
    case 'budget_limited': return 'text-purple-400 bg-purple-500/15'
    default: return 'text-[#8B97B5] bg-white/10'
  }
}

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

// Value now sits BELOW the ring as normal wrapping text, not centered inside
// it — a long "KSh 10,000,000" has nowhere safe to overflow to when it's
// absolutely positioned inside a 44px circle. This was the actual overflow bug.
function CircleStat({ value, label, strokeColor, textColor, percentage = 100 }: {
  value: string | number; label: string; strokeColor: string; textColor: string; percentage?: number
}) {
  const r = 22, circ = 2 * Math.PI * r
  const offset = circ - (Math.min(100, Math.max(0, percentage)) / 100) * circ
  return (
    <div className="flex flex-col items-center gap-1 min-w-0 w-full">
      <div className="relative w-11 h-11 sm:w-12 sm:h-12 shrink-0">
        <svg className="w-11 h-11 sm:w-12 sm:h-12 -rotate-90 absolute inset-0" viewBox="0 0 48 48">
          <circle cx="24" cy="24" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
          <circle cx="24" cy="24" r={r} fill="none" stroke={strokeColor} strokeWidth="3" strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" />
        </svg>
      </div>
      <p className={`font-sora font-bold text-[10px] sm:text-[11px] leading-tight text-center break-words w-full px-0.5 ${textColor}`}>{value}</p>
      <span className="text-[8px] sm:text-[9px] text-[#8B97B5] text-center leading-tight w-full break-words">{label}</span>
    </div>
  )
}

function ProviderCard({
  name, label, info, onToggle, onBudgetSave,
}: {
  name: 'openai' | 'azure'
  label: string
  info: AIProviderInfo
  onToggle: (enabled: boolean) => void
  onBudgetSave: (budget: number, threshold: number) => void
}) {
  const [budgetInput, setBudgetInput] = useState(String(info.monthlyBudgetUsd))
  const [thresholdInput, setThresholdInput] = useState(String(info.safetyThresholdPct))
  const budgetPct = info.monthlyBudgetUsd > 0 ? Math.min(100, Math.round((info.monthSpendUsd / info.monthlyBudgetUsd) * 100)) : 0

  return (
    <div className="bg-surface-base border border-white/5 rounded-xl p-3 sm:p-4 space-y-3 min-w-0 w-full">
      <div className="flex items-center justify-between gap-2 min-w-0">
        <div className="flex items-center gap-2 min-w-0 flex-wrap">
          <p className="text-sm font-semibold text-white truncate">{label}</p>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${providerStatusColor(info.status)}`}>{info.status}</span>
          {!info.configured && <span className="text-[10px] text-[#8B97B5] bg-white/5 px-2 py-0.5 rounded-full shrink-0">not set up</span>}
        </div>
        <button
          onClick={() => onToggle(!info.enabled)}
          disabled={!info.configured && name === 'azure'}
          className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${info.enabled ? 'bg-brand-blue' : 'bg-white/10'} disabled:opacity-30`}
        >
          <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${info.enabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 text-[11px]">
        <div className="bg-surface-elevated rounded-lg p-2 min-w-0">
          <p className="text-[#8B97B5]">Avg latency</p>
          <p className="text-white font-semibold truncate">{info.avgLatencyMs}ms</p>
        </div>
        <div className="bg-surface-elevated rounded-lg p-2 min-w-0">
          <p className="text-[#8B97B5]">Fails in a row</p>
          <p className="text-white font-semibold truncate">{info.consecutiveFailures}</p>
        </div>
      </div>

      <div className="min-w-0">
        <div className="flex items-center justify-between text-[11px] mb-1 gap-2 min-w-0">
          <span className="text-[#8B97B5] shrink-0">Month spend</span>
          <span className="text-white truncate">${info.monthSpendUsd} / ${info.monthlyBudgetUsd}</span>
        </div>
        <div className="w-full bg-surface-elevated rounded-full h-1.5 min-w-0">
          <div className={`h-1.5 rounded-full ${budgetPct >= 90 ? 'bg-red-400' : budgetPct >= 70 ? 'bg-yellow-400' : 'bg-green-400'}`} style={{ width: `${budgetPct}%` }} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="min-w-0">
          <label className="text-[9px] text-[#8B97B5] block mb-0.5">Budget $/mo</label>
          <input type="number" value={budgetInput} onChange={e => setBudgetInput(e.target.value)}
            className="w-full min-w-0 bg-surface-elevated border border-white/10 rounded-lg px-2 py-1.5 text-white text-xs outline-none" />
        </div>
        <div className="min-w-0">
          <label className="text-[9px] text-[#8B97B5] block mb-0.5">Threshold %</label>
          <input type="number" value={thresholdInput} onChange={e => setThresholdInput(e.target.value)}
            className="w-full min-w-0 bg-surface-elevated border border-white/10 rounded-lg px-2 py-1.5 text-white text-xs outline-none" />
        </div>
      </div>
      <button onClick={() => onBudgetSave(parseFloat(budgetInput) || 0, parseInt(thresholdInput) || 90)}
        className="w-full bg-brand-blue text-white text-xs font-semibold py-2 rounded-lg hover:bg-brand-blue/90 transition">
        Save
      </button>
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
      const res = await fetch('/api/admin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ adminUserId: userId }) })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed'); return }
      setStats(data)
      setLastUpdated(new Date())
      setError('')
    } catch { setError('Connection error.') }
    finally { setLoading(false) }
  }

  const toggleMaintenance = async () => {
    if (!userId || !stats) return
    try {
      const res = await fetch('/api/admin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ adminUserId: userId, action: 'toggle_maintenance', enabled: !stats.maintenanceMode }) })
      const data = await res.json()
      if (res.ok) {
        setStats(prev => prev ? { ...prev, maintenanceMode: data.maintenanceMode } : prev)
        toast.success(data.maintenanceMode ? '🔧 Maintenance mode ON' : '✅ Maintenance mode OFF — app is live')
      } else toast.error(data.error || 'Failed to toggle maintenance mode')
    } catch { toast.error('Connection error') }
  }

  const toggleAIProvider = async (provider: 'openai' | 'azure', enabled: boolean) => {
    if (!userId) return
    try {
      const res = await fetch('/api/admin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ adminUserId: userId, action: 'toggle_ai_provider', provider, enabled }) })
      if (res.ok) { toast.success(`${provider === 'azure' ? 'Azure' : 'OpenAI'} ${enabled ? 'enabled' : 'disabled'}`); fetchStats() }
      else toast.error('Failed to update provider')
    } catch { toast.error('Connection error') }
  }

  const saveAIBudget = async (provider: 'openai' | 'azure', monthlyBudgetUsd: number, safetyThresholdPct: number) => {
    if (!userId) return
    try {
      const res = await fetch('/api/admin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ adminUserId: userId, action: 'update_ai_budget', provider, monthlyBudgetUsd, safetyThresholdPct }) })
      if (res.ok) { toast.success('Budget updated'); fetchStats() }
      else toast.error('Failed to update budget')
    } catch { toast.error('Connection error') }
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
      <div className="min-h-screen w-full bg-surface-base flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-warning to-red-500 flex items-center justify-center"><Crown size={22} className="text-white" /></div>
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-warning" />
        </div>
      </div>
    )
  }

  if (error && !stats) {
    return (
      <div className="min-h-screen w-full bg-surface-base flex flex-col items-center justify-center gap-4 px-4">
        <AlertCircle className="text-red-400" size={40} />
        <p className="text-white font-semibold">Could not load dashboard</p>
        <p className="text-[#8B97B5] text-sm text-center">{error}</p>
        <button onClick={fetchStats} className="bg-brand-blue text-white px-6 py-2.5 rounded-xl text-sm font-medium">Retry</button>
      </div>
    )
  }

  const s = stats!
  const totalUsers = s.users.total || 0

  const revenueCircles = [
    { value: formatKsh(s.revenue.total), label: 'All-time', strokeColor: '#22C55E', textColor: 'text-green-400', percentage: 100 },
    { value: formatKsh(s.revenue.monthly), label: 'This month', strokeColor: '#3B82F6', textColor: 'text-brand-blue', percentage: Math.min(100, (s.revenue.monthly / Math.max(1, s.revenue.total)) * 100) },
    { value: formatKsh(s.revenue.today), label: 'Today', strokeColor: '#6D5EF7', textColor: 'text-purple-400', percentage: Math.min(100, (s.revenue.today / Math.max(1, s.revenue.monthly)) * 100) },
    { value: formatKsh(s.revenue.escrow), label: 'Unconfirmed', strokeColor: '#F59E0B', textColor: 'text-warning', percentage: Math.min(100, (s.revenue.escrow / Math.max(1, s.revenue.total)) * 100) },
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
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-surface-base box-border">
      <nav className="border-b border-white/5 bg-surface-elevated/50 backdrop-blur-md sticky top-0 z-10 w-full">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2 min-w-0">
          <button onClick={() => navigate('/dashboard')} className="flex items-center gap-1.5 text-sm text-[#8B97B5] hover:text-white transition-colors shrink-0">
            <ArrowLeft size={16} /> Back
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <Crown size={18} className="text-warning shrink-0" />
            <span className="font-sora font-bold text-white truncate">Owner Dashboard</span>
          </div>
          <button onClick={fetchStats} className="p-2 rounded-lg hover:bg-white/10 transition-colors shrink-0"><RefreshCw size={17} className="text-[#8B97B5]" /></button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-6 sm:py-8 space-y-5 sm:space-y-6 w-full min-w-0">

        {lastUpdated && <p className="text-xs text-[#4A5568]">Last updated: {lastUpdated.toLocaleTimeString()} · Auto-refreshes every 30s</p>}

        <div className={`rounded-2xl p-4 sm:p-5 border-2 flex items-center justify-between gap-3 flex-wrap min-w-0 ${s.maintenanceMode ? 'bg-red-500/10 border-red-500/40' : 'bg-surface-elevated border-white/5'}`}>
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${s.maintenanceMode ? 'bg-red-500/20' : 'bg-white/5'}`}><Wrench size={18} className={s.maintenanceMode ? 'text-red-400' : 'text-[#8B97B5]'} /></div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white">Maintenance Mode</p>
              <p className="text-xs text-[#8B97B5] truncate">{s.maintenanceMode ? 'Students see the maintenance screen right now' : 'App is live for all students'}</p>
            </div>
          </div>
          <button onClick={toggleMaintenance} className={`px-4 py-2 rounded-xl text-xs font-bold transition shrink-0 ${s.maintenanceMode ? 'bg-white text-red-500 hover:bg-gray-100' : 'bg-red-500 text-white hover:bg-red-600'}`}>
            {s.maintenanceMode ? 'Turn Off' : 'Turn On'}
          </button>
        </div>

        <div className="bg-surface-elevated border border-white/5 rounded-2xl p-4 sm:p-5 min-w-0">
          <div className="flex items-center gap-2 mb-5"><DollarSign size={15} className="text-brand-green shrink-0" /><p className="text-sm font-semibold text-white">Revenue</p></div>
          <div className="grid grid-cols-4 gap-1.5 sm:gap-3 justify-items-center">{revenueCircles.map((c, i) => <CircleStat key={i} {...c} />)}</div>
          <div className="mt-5 pt-4 border-t border-white/5 grid grid-cols-2 gap-2 sm:gap-3">
            <div className="bg-surface-base rounded-xl p-2.5 sm:p-3 min-w-0"><p className="text-[10px] text-[#8B97B5] mb-1">My confirmed money</p><p className="text-brand-green font-bold text-sm break-words">{formatKsh(s.revenue.total)}</p></div>
            <div className="bg-surface-base rounded-xl p-2.5 sm:p-3 min-w-0"><p className="text-[10px] text-[#8B97B5] mb-1">Unconfirmed (STK sent)</p><p className="text-warning font-bold text-sm break-words">{formatKsh(s.revenue.escrow)}</p></div>
          </div>
        </div>

        <div className="bg-surface-elevated border border-white/5 rounded-2xl p-4 sm:p-5 min-w-0">
          <div className="flex items-center gap-2 mb-5"><Users size={15} className="text-brand-blue shrink-0" /><p className="text-sm font-semibold text-white">Users</p></div>
          <div className="grid grid-cols-4 gap-1.5 sm:gap-3 justify-items-center">{userCircles.map((c, i) => <CircleStat key={i} {...c} />)}</div>
          <div className="mt-5 pt-4 border-t border-white/5 space-y-2.5">
            <p className="text-[10px] text-[#8B97B5] font-semibold uppercase tracking-wide">By Plan</p>
            {Object.entries(s.users.planCounts).sort(([, a], [, b]) => b - a).map(([plan, count]) => {
              const pct = totalUsers > 0 ? Math.round((count / totalUsers) * 100) : 0
              return (
                <div key={plan} className="flex items-center gap-2 min-w-0">
                  <span className="text-xs w-4 shrink-0">{PLAN_ICONS[plan] || '👤'}</span>
                  <span className={`text-xs capitalize w-16 sm:w-20 shrink-0 truncate ${PLAN_COLORS[plan] || 'text-[#8B97B5]'}`}>{plan}</span>
                  <div className="flex-1 bg-surface-base rounded-full h-1.5 min-w-0"><div className="h-1.5 rounded-full" style={{ width: `${pct}%`, backgroundColor: PLAN_STROKE[plan] || '#8B97B5' }} /></div>
                  <span className="text-[10px] text-[#8B97B5] w-12 text-right shrink-0">{count} · {pct}%</span>
                </div>
              )
            })}
          </div>
        </div>

        <div className="bg-surface-elevated border border-white/5 rounded-2xl p-4 sm:p-5 min-w-0">
          <div className="flex items-center gap-2 mb-5"><Zap size={15} className="text-red-400 shrink-0" /><p className="text-sm font-semibold text-white">API Costs (all providers)</p></div>
          <div className="grid grid-cols-4 gap-1.5 sm:gap-3 justify-items-center mb-5">{apiCostCircles.map((c, i) => <CircleStat key={i} {...c} />)}</div>
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2 mb-4">
            {[{ label: 'Total in KSh', value: formatKsh(s.apiCosts.totalKSH) }, { label: 'This month', value: formatKsh(s.apiCosts.monthlyKSH) }, { label: 'Today', value: formatKsh(s.apiCosts.todayKSH) }].map((item, i) => (
              <div key={i} className="bg-surface-base rounded-xl p-2 sm:p-3 text-center min-w-0"><p className="text-[9px] sm:text-[10px] text-[#8B97B5] mb-1 truncate">{item.label}</p><p className="text-red-400 font-bold text-[10px] sm:text-xs truncate">{item.value}</p></div>
            ))}
          </div>
          {Object.keys(s.apiCosts.featureCosts).length > 0 && (
            <div className="border-t border-white/5 pt-4 space-y-2">
              <p className="text-[10px] text-[#8B97B5] font-semibold uppercase tracking-wide">Cost by Feature</p>
              {Object.entries(s.apiCosts.featureCosts).slice(0, 8).map(([feature, cost]) => {
                const pct = s.apiCosts.totalUSD > 0 ? Math.round((cost / s.apiCosts.totalUSD) * 100) : 0
                return (
                  <div key={feature} className="flex items-center gap-2 min-w-0">
                    <span className="text-xs text-[#8B97B5] w-24 sm:w-32 shrink-0 truncate">{feature.replace(/_/g, ' ')}</span>
                    <div className="flex-1 bg-surface-base rounded-full h-1.5 min-w-0"><div className="h-1.5 rounded-full bg-red-400" style={{ width: `${pct}%` }} /></div>
                    <span className="text-[10px] text-[#8B97B5] w-16 text-right shrink-0">${cost} · {pct}%</span>
                  </div>
                )
              })}
            </div>
          )}
          <div className="mt-4 bg-red-500/10 border border-red-500/20 rounded-xl p-3 min-w-0">
            <p className="text-xs text-red-400 font-medium break-words">💡 Profit check: Revenue today {formatKsh(s.revenue.today)} vs AI cost today {formatKsh(s.apiCosts.todayKSH)} = net {formatKsh(s.revenue.today - s.apiCosts.todayKSH)}</p>
          </div>
        </div>

        <div className="bg-surface-elevated border border-white/5 rounded-2xl p-4 sm:p-5 min-w-0">
          <div className="flex items-center gap-2 mb-4"><Server size={15} className="text-brand-blue shrink-0" /><p className="text-sm font-semibold text-white">AI Infrastructure</p></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <ProviderCard name="openai" label="OpenAI" info={s.aiInfrastructure.providers.openai}
              onToggle={(enabled) => toggleAIProvider('openai', enabled)}
              onBudgetSave={(b, t) => saveAIBudget('openai', b, t)} />
            <ProviderCard name="azure" label="Azure OpenAI" info={s.aiInfrastructure.providers.azure}
              onToggle={(enabled) => toggleAIProvider('azure', enabled)}
              onBudgetSave={(b, t) => saveAIBudget('azure', b, t)} />
          </div>
          {!s.aiInfrastructure.providers.azure.configured && (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 mb-4 min-w-0">
              <p className="text-xs text-blue-300 break-words">Azure isn't configured yet — create your Azure OpenAI resource and add the env vars in Vercel to enable it here.</p>
            </div>
          )}
          {s.aiInfrastructure.recentFailovers.length > 0 && (
            <div className="border-t border-white/5 pt-4 space-y-2">
              <p className="text-[10px] text-[#8B97B5] font-semibold uppercase tracking-wide">Recent Failovers</p>
              {s.aiInfrastructure.recentFailovers.map(f => (
                <div key={f.id} className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-[11px] bg-surface-base rounded-lg px-3 py-2 min-w-0">
                  <span className="text-white break-words min-w-0">{f.feature}: {f.primary_provider} → {f.fallback_provider}</span>
                  <span className={`shrink-0 ${f.succeeded ? 'text-green-400' : 'text-red-400'}`}>{f.succeeded ? '✓ recovered' : '✗ failed'} · {timeAgo(f.created_at)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {s.payments.pendingCount > 0 && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl px-4 py-3 flex items-center gap-3 min-w-0">
            <Clock size={16} className="text-yellow-400 shrink-0" />
            <div className="min-w-0"><p className="text-white font-semibold text-sm">{s.payments.pendingCount} payment{s.payments.pendingCount !== 1 ? 's' : ''} pending</p><p className="text-[#8B97B5] text-xs">STK pushes awaiting Safaricom confirmation</p></div>
          </div>
        )}

        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-4"><CheckCircle size={15} className="text-brand-green shrink-0" /><p className="text-sm font-semibold text-white">Recent Transactions</p></div>
          <div className="sm:hidden space-y-2">
            {s.payments.recentPayments.length === 0 ? (
              <div className="bg-surface-elevated border border-white/5 rounded-xl p-8 text-center text-[#8B97B5] text-sm">No transactions yet</div>
            ) : s.payments.recentPayments.map((p, i) => (
              <div key={i} className="bg-surface-elevated border border-white/5 rounded-xl p-4 space-y-2 min-w-0">
                <div className="flex items-center justify-between gap-2 min-w-0"><span className="text-[10px] font-mono text-white truncate min-w-0">{p.transaction_id}</span><span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${getStatusColor(p.status)}`}>{p.status}</span></div>
                <div className="flex items-center justify-between gap-2 min-w-0"><span className="text-sm text-white font-medium truncate">{p.plan_name}</span><span className="text-sm text-brand-green font-bold shrink-0">{formatKsh(p.amount)}</span></div>
                <div className="flex items-center justify-between text-[10px] text-[#8B97B5] gap-2 min-w-0"><span className="truncate">{p.phone_number}</span><span className="shrink-0">{new Date(p.created_at).toLocaleDateString()}</span></div>
              </div>
            ))}
          </div>
          <div className="hidden sm:block bg-surface-elevated border border-white/5 rounded-xl overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead><tr className="border-b border-white/5 bg-surface-base/50">{['Transaction ID', 'Phone', 'Plan', 'Amount', 'Status', 'Date'].map(h => <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-[#8B97B5]">{h}</th>)}</tr></thead>
              <tbody>
                {s.payments.recentPayments.length === 0 ? (
                  <tr><td colSpan={6} className="px-5 py-8 text-center text-[#8B97B5] text-sm">No transactions yet</td></tr>
                ) : s.payments.recentPayments.map((p, i) => (
                  <tr key={i} className="border-b border-white/5 hover:bg-surface-base/30 transition-colors">
                    <td className="px-5 py-3 font-mono text-xs text-white">{p.transaction_id}</td>
                    <td className="px-5 py-3 text-[#8B97B5] text-xs">{p.phone_number}</td>
                    <td className="px-5 py-3 text-white text-xs">{p.plan_name}</td>
                    <td className="px-5 py-3 text-brand-green font-semibold text-xs">{formatKsh(p.amount)}</td>
                    <td className="px-5 py-3"><span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${getStatusColor(p.status)}`}>{p.status}</span></td>
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
