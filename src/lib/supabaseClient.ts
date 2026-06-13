import { createClient, SupabaseClient } from '@supabase/supabase-js'

let supabaseClient: SupabaseClient | null = null

const getSupabaseConfig = async () => {
  try {
    const response = await fetch('/api/get-supabase-config')
    if (!response.ok) {
      throw new Error('Failed to fetch Supabase config')
    }
    const config = await response.json()
    return config
  } catch (error) {
    console.error('Error fetching Supabase config:', error)
    throw error
  }
}

const initializeSupabase = async () => {
  if (supabaseClient) {
    return supabaseClient
  }

  try {
    const config = await getSupabaseConfig()

    if (!config.url || !config.key) {
      throw new Error('Invalid Supabase configuration')
    }

    supabaseClient = createClient(config.url, config.key)
    return supabaseClient
  } catch (error) {
    console.error('Failed to initialize Supabase:', error)
    throw error
  }
}

export const getSupabase = async () => {
  return initializeSupabase()
}

export const signUp = async (email: string, password: string, name: string) => {
  const client = await getSupabase()

  const { data, error } = await client.auth.signUp({
    email,
    password,
  })

  if (error) throw error

  if (data.user) {
    // Generate a UUID for the id
    const newId = crypto.randomUUID()
    
    const { error: profileError } = await client.from('users').insert({
      id: newId,
      auth_id: data.user.id,
      email,
      name,
      phone_number: '',
    })

    if (profileError) throw profileError
  }

  return data

}

export const signIn = async (email: string, password: string) => {
  const client = await getSupabase()

  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  })

  if (error) throw error
  return data
}

export const signOut = async () => {
  const client = await getSupabase()
  const { error } = await client.auth.signOut()
  if (error) throw error
}

export const getCurrentUser = async () => {
  const client = await getSupabase()
  const { data, error } = await client.auth.getUser()
  if (error) throw error
  return data.user
}

export const getUserProfile = async (userId: string) => {
  const client = await getSupabase()
  const { data, error } = await client.from('users').select('*').eq('auth_id', userId).single()
  if (error) throw error
  return data
}

export const supabase = {
  getSupabase,
  signUp,
  signIn,
  signOut,
  getCurrentUser,
  getUserProfile,
}
