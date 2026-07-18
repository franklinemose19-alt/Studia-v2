import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { getSupabase } from './supabaseClient'

export default function AdminRoute({ children }: { children: React.ReactNode }) {
  const { userId, loading: authLoading } = useAuth()
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    if (authLoading) return
    if (!userId) { setIsAdmin(false); setChecking(false); return }

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
      } finally {
        setChecking(false)
      }
    }
    check()
  }, [userId, authLoading])

  if (authLoading || checking) {
    return (
      <div className="min-h-screen bg-surface-base flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-blue" />
      </div>
    )
  }

  if (!userId || !isAdmin) return <Navigate to="/dashboard" replace />

  return <>{children}</>
}
