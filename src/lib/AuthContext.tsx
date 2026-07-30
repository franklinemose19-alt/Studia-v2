import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { getClient } from './supabaseClient'
import { toast } from './toast'

interface AuthContextValue {
  user: User | null
  session: Session | null
  userId: string | null
  loading: boolean
  signedIn: boolean
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  session: null,
  userId: null,
  loading: true,
  signedIn: false,
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  const handleSession = useCallback((newSession: Session | null) => {
    setSession(newSession)
    setUser(newSession?.user ?? null)
  }, [])

  useEffect(() => {
    const client = getClient()

    // Check for existing session on mount — reads localStorage, no network call
    client.auth.getSession().then(({ data: { session: existingSession }, error }) => {
      if (error) {
        console.error('Session check error:', error.message)
        if (error.message.toLowerCase().includes('invalid')) {
          toast.error('Session expired — please sign in again.')
        }
      }
      handleSession(existingSession)
      setLoading(false)
    })

    // Listen for all future auth state changes
    const { data: { subscription } } = client.auth.onAuthStateChange(
      (event, newSession) => {
        handleSession(newSession)

        if (event === 'SIGNED_OUT') {
          toast.info('You have been signed out.')
        }

        if (event === 'TOKEN_REFRESHED') {
          console.log('Session token refreshed automatically')
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [handleSession])

  return (
    <AuthContext.Provider value={{
      user,
      session,
      userId: user?.id ?? null,
      loading,
      signedIn: !!user,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
