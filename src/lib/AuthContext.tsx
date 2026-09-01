import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { getClient, ensureUserRow } from './supabaseClient'
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

// Best-available name from whatever the sign-in method actually populated —
// Google OAuth and email/password sign-up don't fill in the same fields.
function extractName(user: User): string {
  return user.user_metadata?.full_name || user.user_metadata?.name || ''
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  const handleSession = useCallback((newSession: Session | null) => {
    setSession(newSession)
    setUser(newSession?.user ?? null)
  }, [])

  // FIXED: Google sign-in was the one path that never guaranteed a users-
  // table row exists — createUserRow() only ever ran inside email/password
  // signIn. Runs on every real SIGNED_IN event (covers Google going
  // forward), and once on initial mount for anyone who already has a valid
  // session from before this fix existed (self-heals already-affected
  // accounts without needing a manual backfill). Fire-and-forget — never
  // blocks rendering, errors are logged, not surfaced to the user.
  const ensureRowFor = useCallback((sessionUser: User | null) => {
    if (!sessionUser) return
    ensureUserRow(sessionUser.id, sessionUser.email || '', extractName(sessionUser)).catch(err => {
      console.error('ensureUserRow failed (non-critical):', err)
    })
  }, [])

  useEffect(() => {
    const client = getClient()

    client.auth.getSession().then(({ data: { session: existingSession }, error }) => {
      if (error) {
        console.error('Session check error:', error.message)
        if (error.message.toLowerCase().includes('invalid')) {
          toast.error('Session expired — please sign in again.')
        }
      }
      handleSession(existingSession)
      if (existingSession?.user) ensureRowFor(existingSession.user)
      setLoading(false)
    })

    const { data: { subscription } } = client.auth.onAuthStateChange(
      (event, newSession) => {
        handleSession(newSession)
        if (event === 'SIGNED_IN' && newSession?.user) {
          ensureRowFor(newSession.user)
        }
        if (event === 'SIGNED_OUT') {
          toast.info('You have been signed out.')
        }
        if (event === 'TOKEN_REFRESHED') {
          console.log('Session token refreshed automatically')
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [handleSession, ensureRowFor])

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
