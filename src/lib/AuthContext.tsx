import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { getSupabase } from './supabaseClient'

interface AuthContextValue {
  userId: string | null
  loading: boolean
}

const AuthContext = createContext<AuthContextValue>({ userId: null, loading: true })

export function AuthProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    let subscription: { unsubscribe: () => void } | null = null

    const init = async () => {
      try {
        const client = await getSupabase()
        const { data } = await client.auth.getUser()
        if (mounted) {
          setUserId(data.user?.id || null)
          setLoading(false)
        }

        const { data: sub } = client.auth.onAuthStateChange((_event, session) => {
          if (mounted) setUserId(session?.user?.id || null)
        })
        subscription = sub.subscription
      } catch (err) {
        console.error('Auth init failed:', err)
        if (mounted) {
          setUserId(null)
          setLoading(false)
        }
      }
    }

    init()
    return () => {
      mounted = false
      subscription?.unsubscribe()
    }
  }, [])

  return <AuthContext.Provider value={{ userId, loading }}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
