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
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { adminUserId } = req.body
    if (!adminUserId) return res.status(401).json({ error: 'Unauthorized' })

    // Verify caller is actually admin
    const adminCheck = await supaFetch(`users?auth_id=eq.${adminUserId}&is_admin=eq.true&select=auth_id`)
    const adminData = await adminCheck.json()
    if (!Array.isArray(adminData) || adminData.length === 0) {
      return res.status(403).json({ error: 'Forbidden — not an admin account' })
    }

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
    const startOfHour = new Date(now.getTime() - 60 * 60 * 1000).toISOString()
    const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()

    const [
      completedPaymentsRes,
      allPaymentsRes,
      usersRes,
      recentPaymentsRes,
    ] = await Promise.all([
      supaFetch(`payments?status=eq.completed&select=amount,created_at,plan_name`),
      supaFetch(`payments?select=amount,status,created_at,plan_name`),
      supaFetch(`users?select=current_plan,subscription_status,created_at,is_admin,free_ai_credits_used`),
      supaFetch(`payments?select=transaction_id,phone_number,amount,plan_name,status,created_at&order=created_at.desc&limit=25`),
    ])

    const completedPayments = await completedPaymentsRes.json()
    const allPayments = await allPaymentsRes.json()
    const users = await usersRes.json()
    const recentPayments = await recentPaymentsRes.json()

    // Revenue calculations
    const totalRevenue = Array.isArray(completedPayments)
      ? completedPayments.reduce((sum, p) => sum + (p.amount || 0), 0)
      : 0

    const monthlyRevenue = Array.isArray(completedPayments)
      ? completedPayments.filter(p => p.created_at >= startOfMonth).reduce((sum, p) => sum + (p.amount || 0), 0)
      : 0

    const todayRevenue = Array.isArray(completedPayments)
      ? completedPayments.filter(p => p.created_at >= startOfToday).reduce((sum, p) => sum + (p.amount || 0), 0)
      : 0

    // Escrow (processing = money users paid but not yet confirmed released)
    const escrowAmount = Array.isArray(allPayments)
      ? allPayments.filter(p => p.status === 'processing').reduce((sum, p) => sum + (p.amount || 0), 0)
      : 0

    const pendingCount = Array.isArray(allPayments)
      ? allPayments.filter(p => p.status === 'processing' || p.status === 'pending').length
      : 0

    // User breakdowns
    const planCounts = { free: 0, lite: 0, pro: 0, semester: 0, none: 0 }
    let newUsersToday = 0
    let newUsersWeek = 0
    let newUsersThisHour = 0

    if (Array.isArray(users)) {
      users.forEach(u => {
        if (u.is_admin) return // don't count admin accounts
        const plan = u.current_plan || 'none'
        if (plan in planCounts) planCounts[plan]++
        else planCounts.none++
        if (u.created_at >= startOfToday) newUsersToday++
        if (u.created_at >= startOfWeek) newUsersWeek++
        if (u.created_at >= startOfHour) newUsersThisHour++
      })
    }

    const realUsers = Array.isArray(users) ? users.filter(u => !u.is_admin).length : 0

    return res.status(200).json({
      revenue: {
        total: totalRevenue,
        monthly: monthlyRevenue,
        today: todayRevenue,
        escrow: escrowAmount,
      },
      payments: {
        pendingCount,
        recentPayments: Array.isArray(recentPayments) ? recentPayments : [],
      },
      users: {
        total: realUsers,
        planCounts,
        newToday: newUsersToday,
        newThisWeek: newUsersWeek,
        newThisHour: newUsersThisHour,
      },
    })
  } catch (err) {
    console.error('Admin error:', err)
    return res.status(500).json({ error: err.message || 'Internal server error' })
  }
}
