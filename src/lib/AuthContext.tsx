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

    // Step 1 — Check for an existing session immediately on mount.
    // getSession() reads from localStorage — no network call, instant.
    client.auth.getSession().then(({ data: { session: existingSession } }) => {
      handleSession(existingSession)
      setLoading(false)
    })

    // Step 2 — Listen for all future auth events for the lifetime of the app.
    // This fires on: SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED, USER_UPDATED,
    // PASSWORD_RECOVERY, MFA_CHALLENGE_VERIFIED
    const { data: { subscription } } = client.auth.onAuthStateChange(
      (_event, newSession) => {
        handleSession(newSession)
        // Don't set loading here — it's only for the initial check above
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [handleSession])

  const value: AuthContextValue = {
    user,
    session,
    userId: user?.id ?? null,
    loading,
    signedIn: !!user,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
