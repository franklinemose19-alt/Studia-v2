const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

async function supaFetch(path, options = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      apikey: SUPABASE_SERVICE_KEY,
      ...(options.headers || {}),
    },
  })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { adminUserId } = req.body
    if (!adminUserId) return res.status(401).json({ error: 'Unauthorized' })

    const adminCheck = await supaFetch(`users?auth_id=eq.${adminUserId}&is_admin=eq.true&select=auth_id`)
    const adminData = await adminCheck.json()
    if (!Array.isArray(adminData) || adminData.length === 0) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
    const startOfHour = new Date(now.getTime() - 60 * 60 * 1000).toISOString()
    const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()

    // ── Real auth user count (source of truth) ─────────────────────────────
    const authUsersRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?per_page=1000`, {
      headers: {
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        apikey: SUPABASE_SERVICE_KEY,
      },
    })
    const authUsersData = await authUsersRes.json()
    const authUsers = Array.isArray(authUsersData.users) ? authUsersData.users : []

    // Non-admin real users
    const realUsers = authUsers.filter(u => {
      const email = u.email || ''
      return email !== 'franklinemose19@gmail.com'
    })
    const totalRealUsers = realUsers.length

    const newToday = realUsers.filter(u => u.created_at >= startOfToday).length
    const newThisWeek = realUsers.filter(u => u.created_at >= startOfWeek).length
    const newThisHour = realUsers.filter(u => u.created_at >= startOfHour).length

    // ── Plan distribution from users table ────────────────────────────────
    const usersRes = await supaFetch(`users?select=current_plan,is_admin`)
    const usersData = await usersRes.json()
    const planCounts = { explorer: 0, achiever: 0, excellence: 0, valedictorian: 0 }

    if (Array.isArray(usersData)) {
      usersData
        .filter(u => !u.is_admin)
        .forEach(u => {
          const plan = u.current_plan || 'explorer'
          if (plan in planCounts) planCounts[plan]++
        })
    }

    // ── Revenue ────────────────────────────────────────────────────────────
    const [completedRes, allRes, recentRes] = await Promise.all([
      supaFetch(`payments?status=eq.completed&select=amount,created_at,plan_name`),
      supaFetch(`payments?select=amount,status,created_at`),
      supaFetch(`payments?select=transaction_id,phone_number,amount,plan_name,status,created_at&order=created_at.desc&limit=25`),
    ])

    const completed = await completedRes.json()
    const all = await allRes.json()
    const recent = await recentRes.json()

    const safeCompleted = Array.isArray(completed) ? completed : []
    const safeAll = Array.isArray(all) ? all : []

    return res.status(200).json({
      revenue: {
        total: safeCompleted.reduce((s, p) => s + (p.amount || 0), 0),
        monthly: safeCompleted.filter(p => p.created_at >= startOfMonth).reduce((s, p) => s + (p.amount || 0), 0),
        today: safeCompleted.filter(p => p.created_at >= startOfToday).reduce((s, p) => s + (p.amount || 0), 0),
        escrow: safeAll.filter(p => p.status === 'processing').reduce((s, p) => s + (p.amount || 0), 0),
      },
      payments: {
        pendingCount: safeAll.filter(p => p.status === 'processing' || p.status === 'pending').length,
        recentPayments: Array.isArray(recent) ? recent : [],
      },
      users: {
        total: totalRealUsers,
        planCounts,
        newToday,
        newThisWeek,
        newThisHour,
      },
    })
  } catch (error) {
    console.error('Admin error:', error)
    return res.status(500).json({ error: error.message || 'Internal server error' })
  }
}
