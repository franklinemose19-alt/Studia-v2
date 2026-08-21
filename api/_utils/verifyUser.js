const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

// The only trustworthy source of "who is making this request." Never use
// req.body.userId for authorization decisions — it's a plain string the
// client can set to anything at all.
export async function getVerifiedUserId(req) {
  const authHeader = req.headers.authorization || req.headers.Authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null
  const token = authHeader.slice(7).trim()
  if (!token) return null

  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_SERVICE_KEY },
    })
    if (!res.ok) return null
    const data = await res.json()
    return data?.id || null
  } catch (err) {
    console.error('verifyUser failed:', err)
    return null
  }
}
