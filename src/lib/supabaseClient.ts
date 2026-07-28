import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://dmqjhhbjhzzyinxnblge.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtcWpoaGJqaHp6eWlueG5ibGdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQyODEzMTAsImV4cCI6MjA1OTg1NzMxMH0.up7DFUefMqAPUkZk76mMt0dBtSSGvRyGVvJRMqSqfmo'

// Single shared client instance — never create multiple
let _client: SupabaseClient | null = null

export function getClient(): SupabaseClient {
  if (!_client) {
    _client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        // Persist session in localStorage — survives browser restarts
        persistSession: true,
        // Automatically refresh the JWT before it expires
        autoRefreshToken: true,
        // Detect session from URL hash (needed for magic links / OAuth)
        detectSessionInUrl: true,
        // Use localStorage for session storage
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
        storageKey: 'studia-auth-token',
      },
    })
  }
  return _client
}

// Convenience async getter (matches existing getSupabase() usage)
export const getSupabase = async (): Promise<SupabaseClient> => getClient()

// ── Auth helpers ──────────────────────────────────────────────────────────

export const supabase = {
  signIn: async (email: string, password: string) => {
    const client = getClient()
    console.log('Starting signin for:', email)
    console.log('Supabase client initialized')

    const { data, error } = await client.auth.signInWithPassword({ email, password })
    if (error) throw error

    console.log('Signin successful, user ID:', data.user?.id)

    if (data.user) {
      await ensureUserRow(data.user.id, data.user.email || '', '')
    }

    return { user: data.user, session: data.session }
  },

  signUp: async (email: string, password: string, name: string, phone?: string) => {
    const client = getClient()

    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
      },
    })
    if (error) throw error

    const userId = data.user?.id
    if (userId) {
      await createUserRow(userId, email, name, phone)
    }

    return { user: data.user, session: data.session }
  },
}

export const signOut = async (): Promise<void> => {
  const client = getClient()
  const { error } = await client.auth.signOut()
  if (error) throw error
}

export const getCurrentUser = async () => {
  const client = getClient()
  const { data: { user } } = await client.auth.getUser()
  return user
}

// ── User row helpers ───────────────────────────────────────────────────────

async function createUserRow(userId: string, email: string, name: string, phone?: string) {
  const client = getClient()

  const { error } = await client.from('users').insert({
    auth_id: userId,
    email,
    full_name: name,
    phone_number: phone?.trim() || null,
    current_plan: 'explorer',
    subscription_status: 'inactive',
    free_ai_credits_used: 0,
    lite_bonus_credits: 0,
    lecture_allowance: 0,
    lectures_used: 0,
    plan_locked: false,
    created_at: new Date().toISOString(),
  })

  if (error && !error.message.includes('duplicate')) {
    console.error('Failed to create user row:', error)
  }
}

async function ensureUserRow(userId: string, email: string, name: string) {
  const client = getClient()

  const { data } = await client
    .from('users')
    .select('auth_id')
    .eq('auth_id', userId)
    .maybeSingle()

  if (!data) {
    await createUserRow(userId, email, name)
  }
}
