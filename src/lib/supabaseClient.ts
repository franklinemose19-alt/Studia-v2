import { createClient } from '@supabase/supabase-js'

// These will be loaded from the API
let supabaseInstance: any = null

const initSupabase = async () => {
  if (supabaseInstance) return supabaseInstance

  try {
    const res = await fetch('/api/get-supabase-config')
    const config = await res.json()

    if (!config.url || !config.key) {
      throw new Error('Missing Supabase config')
    }

    supabaseInstance = createClient(config.url, config.key)
    return supabaseInstance
  } catch (err) {
    console.error('Failed to initialize Supabase:', err)
    throw err
  }
}

export const supabase = { init: initSupabase }

export const signUp = async (email: string, password: string, name: string) => {
  const client = await initSupabase()
  const { data, error } = await client.auth.signUp({
    email,
    password,
  })

  if (error) throw error

  if (data.user) {
    const { error: profileError } = await client.from('users').insert({
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
  const client = await initSupabase()
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  })

  if (error) throw error
  return data
}

export const signOut = async () => {
  const client = await initSupabase()
  const { error } = await client.auth.signOut()
  if (error) throw error
}

export const getCurrentUser = async () => {
  const client = await initSupabase()
  const { data, error } = await client.auth.getUser()
  if (error) throw error
  return data.user
}

export const getUserProfile = async (userId: string) => {
  const client = await initSupabase()
  const { data, error } = await client.from('users').select('*').eq('auth_id', userId).single()
  if (error) throw error
  return data
}
