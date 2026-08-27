const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const KSH_PER_USD = 130

async function supaFetch(path, options = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, apikey: SUPABASE_SERVICE_KEY, ...(options.headers || {}) },
  })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { adminUserId, action, enabled, monthlyBudgetUsd, safetyThresholdPct } = req.body
    if (!adminUserId) return res.status(401).json({ error: 'Unauthorized' })

    const adminCheck = await supaFetch(`users?auth_id=eq.${adminUserId}&is_admin=eq.true&select=auth_id`)
    const adminData = await adminCheck.json()
    if (!Array.isArray(adminData) || adminData.length === 0) return res.status(403).json({ error: 'Forbidden' })

    if (action === 'toggle_maintenance') {
      await supaFetch('system_settings?key=eq.maintenance_mode', { method: 'PATCH', body: JSON.stringify({ value: enabled ? 'true' : 'false', updated_at: new Date().toISOString() }) })
      return res.status(200).json({ success: true, maintenanceMode: !!enabled })
    }

    // Azure removed — these two actions now always target OpenAI, the only
    // provider STUDIA runs on. No provider param needed anymore.
    if (action === 'toggle_ai_provider') {
      await supaFetch(`system_settings?key=eq.ai_openai_enabled`, { method: 'PATCH', body: JSON.stringify({ value: enabled ? 'true' : 'false', updated_at: new Date().toISOString() }) })
      return res.status(200).json({ success: true })
    }

    if (action === 'update_ai_budget') {
      await supaFetch(`ai_provider_budgets?provider=eq.openai`, {
        method: 'PATCH',
        body: JSON.stringify({ monthly_budget_usd: monthlyBudgetUsd, safety_threshold_pct: safetyThresholdPct }),
      })
      return res.status(200).json({ success: true })
    }

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
    const startOfHour = new Date(now.getTime() - 60 * 60 * 1000).toISOString()
    const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()

    const authUsersRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?per_page=1000`, { headers: { Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, apikey: SUPABASE_SERVICE_KEY } })
    const authUsersData = await authUsersRes.json()
    const authUsers = Array.isArray(authUsersData.users) ? authUsersData.users : []
    const realUsers = authUsers.filter(u => u.email !== 'franklinemose19@gmail.com')
    const totalRealUsers = realUsers.length

    const [completedRes, allRes, recentRes, usersRes, tokenRes, settingsRes, aiSettingsRes, aiHealthRes, aiBudgetRes] = await Promise.all([
      supaFetch(`payments?status=eq.completed&select=amount,created_at`),
      supaFetch(`payments?select=amount,status`),
      supaFetch(`payments?select=transaction_id,phone_number,amount,plan_name,status,created_at&order=created_at.desc&limit=25`),
      supaFetch(`users?select=current_plan,is_admin`),
      supaFetch(`token_usage?select=estimated_cost_usd,total_tokens,feature,created_at`),
      supaFetch(`system_settings?key=eq.maintenance_mode&select=value`),
      supaFetch(`system_settings?key=eq.ai_openai_enabled&select=value`),
      supaFetch(`ai_provider_health?provider=eq.openai&select=*`),
      supaFetch(`ai_provider_budgets?provider=eq.openai&select=*`),
    ])

    const completed = await completedRes.json()
    const all = await allRes.json()
    const recent = await recentRes.json()
    const users = await usersRes.json()
    const tokenData = await tokenRes.json()
    const settingsData = await settingsRes.json()
    const aiSettingsData = await aiSettingsRes.json()
    const aiHealthData = await aiHealthRes.json()
    const aiBudgetData = await aiBudgetRes.json()

    const safeCompleted = Array.isArray(completed) ? completed : []
    const safeAll = Array.isArray(all) ? all : []
    const safeTokens = Array.isArray(tokenData) ? tokenData : []

    const planCounts = { explorer: 0, achiever: 0, 'achiever-plus': 0, excellence: 0, valedictorian: 0 }
    if (Array.isArray(users)) users.filter(u => !u.is_admin).forEach(u => { const p = u.current_plan || 'explorer'; if (p in planCounts) planCounts[p]++ })

    const totalCostUSD = safeTokens.reduce((s, t) => s + parseFloat(t.estimated_cost_usd || 0), 0)
    const monthlyCostUSD = safeTokens.filter(t => t.created_at >= startOfMonth).reduce((s, t) => s + parseFloat(t.estimated_cost_usd || 0), 0)
    const todayCostUSD = safeTokens.filter(t => t.created_at >= startOfToday).reduce((s, t) => s + parseFloat(t.estimated_cost_usd || 0), 0)
    const totalTokens = safeTokens.reduce((s, t) => s + (t.total_tokens || 0), 0)

    const featureCosts = {}
    safeTokens.forEach(t => { if (!featureCosts[t.feature]) featureCosts[t.feature] = 0; featureCosts[t.feature] += parseFloat(t.estimated_cost_usd || 0) })

    const newToday = realUsers.filter(u => u.created_at >= startOfToday).length
    const newThisWeek = realUsers.filter(u => u.created_at >= startOfWeek).length
    const newThisHour = realUsers.filter(u => u.created_at >= startOfHour).length

    const openaiSpendThisMonth = safeTokens.filter(t => t.created_at >= startOfMonth).reduce((s, t) => s + parseFloat(t.estimated_cost_usd || 0), 0)
    const aiHealth = Array.isArray(aiHealthData) ? aiHealthData[0] : null
    const aiBudget = Array.isArray(aiBudgetData) ? aiBudgetData[0] : null

    const aiInfrastructure = {
      openai: {
        enabled: Array.isArray(aiSettingsData) && aiSettingsData[0] ? aiSettingsData[0].value !== 'false' : true,
        configured: !!process.env.OPENAI_API_KEY,
        status: aiHealth?.status || 'healthy',
        consecutiveFailures: aiHealth?.consecutive_failures || 0,
        avgLatencyMs: aiHealth?.avg_latency_ms || 0,
        monthlyBudgetUsd: aiBudget?.monthly_budget_usd || 0,
        safetyThresholdPct: aiBudget?.safety_threshold_pct || 90,
        monthSpendUsd: parseFloat(openaiSpendThisMonth.toFixed(4)),
      },
    }

    return res.status(200).json({
      maintenanceMode: settingsData?.[0]?.value === 'true',
      revenue: {
        total: safeCompleted.reduce((s, p) => s + (p.amount || 0), 0),
        monthly: safeCompleted.filter(p => p.created_at >= startOfMonth).reduce((s, p) => s + (p.amount || 0), 0),
        today: safeCompleted.filter(p => p.created_at >= startOfToday).reduce((s, p) => s + (p.amount || 0), 0),
        escrow: safeAll.filter(p => p.status === 'processing').reduce((s, p) => s + (p.amount || 0), 0),
      },
      payments: { pendingCount: safeAll.filter(p => p.status === 'processing' || p.status === 'pending').length, recentPayments: Array.isArray(recent) ? recent : [] },
      users: { total: totalRealUsers, planCounts, newToday, newThisWeek, newThisHour },
      apiCosts: {
        totalUSD: parseFloat(totalCostUSD.toFixed(4)), totalKSH: Math.round(totalCostUSD * KSH_PER_USD),
        monthlyUSD: parseFloat(monthlyCostUSD.toFixed(4)), monthlyKSH: Math.round(monthlyCostUSD * KSH_PER_USD),
        todayUSD: parseFloat(todayCostUSD.toFixed(4)), todayKSH: Math.round(todayCostUSD * KSH_PER_USD),
        totalTokens,
        featureCosts: Object.fromEntries(Object.entries(featureCosts).sort(([, a], [, b]) => b - a).map(([k, v]) => [k, parseFloat(v.toFixed(4))])),
      },
      aiInfrastructure,
    })
  } catch (error) {
    console.error('Admin error:', error)
    return res.status(500).json({ error: error.message || 'Internal server error' })
  }
}
