import { createClient, SupabaseClient } from '@supabase/supabase-js'

let supabaseClient: SupabaseClient | null = null

// Hardcode Supabase config (anon key is public)
const SUPABASE_URL = 'https://dmqjhhbjhzzyinxnblge.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtcWpoaGJqaHp6eWlueG5ibGdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyNDkwNzMsImV4cCI6MjA5NjgyNTA3M30.SEGicDknNe-iNewG7FHbO5nWKoJj0im6kBWTtR9_4uc'

const initializeSupabase = async () => {
  if (supabaseClient) {
    return supabaseClient
  }

  try {
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY)
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
  console.log('Starting signup for:', email)
  
  try {
    const client = await getSupabase()
    console.log('Supabase client initialized')

    const { data, error } = await client.auth.signUp({
      email,
      password,
    })

    if (error) {
      console.error('Auth signup error:', error)
      throw new Error(error.message || 'Failed to sign up')
    }

    console.log('Auth signup successful, user ID:', data.user?.id)

    if (data.user?.id) {
      console.log('Creating user profile...')
      
      const { error: profileError } = await client.from('users').insert({
        id: data.user.id,
        auth_id: data.user.id,
        email,
        name,
        phone_number: null,
      })

      if (profileError) {
        console.error('Profile insert error:', profileError)
        throw new Error(profileError.message || 'Failed to create user profile')
      }

      console.log('User profile created successfully')
    }

    return data
  } catch (err: any) {
    console.error('Signup failed:', err.message || err)
    throw err
  }
}

export const signIn = async (email: string, password: string) => {
  console.log('Starting signin for:', email)
  
  try {
    const client = await getSupabase()
    console.log('Supabase client initialized')

    const { data, error } = await client.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      console.error('Auth signin error:', error)
      throw new Error(error.message || 'Failed to sign in')
    }

    console.log('Signin successful, user ID:', data.user?.id)
    return data
  } catch (err: any) {
    console.error('Signin failed:', err.message || err)
    throw err
  }
}

export const signOut = async () => {
  console.log('Signing out...')
  
  try {
    const client = await getSupabase()
    const { error } = await client.auth.signOut()
    
    if (error) {
      console.error('Signout error:', error)
      throw error
    }
    
    console.log('Signout successful')
  } catch (err: any) {
    console.error('Signout failed:', err.message || err)
    throw err
  }
}

export const getCurrentUser = async () => {
  try {
    const client = await getSupabase()
    const { data, error } = await client.auth.getUser()
    
    if (error) {
      console.error('Get current user error:', error)
      throw error
    }
    
    return data.user
  } catch (err: any) {
    console.error('Get current user failed:', err.message || err)
    throw err
  }
}

export const getUserProfile = async (userId: string) => {
  try {
    const client = await getSupabase()
    const { data, error } = await client.from('users').select('*').eq('auth_id', userId).single()
    
    if (error) {
      console.error('Get user profile error:', error)
      throw error
    }
    
    return data
  } catch (err: any) {
    console.error('Get user profile failed:', err.message || err)
    throw err
  }
}

export const supabase = {
  getSupabase,
  signUp,
  signIn,
  signOut,
  getCurrentUser,
  getUserProfile,
}
