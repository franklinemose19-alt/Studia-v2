import { createClient, SupabaseClient } from '@supabase/supabase-js'

let supabaseClient: SupabaseClient | null = null

const getSupabaseConfig = async () => {
  try {
    const response = await fetch('/api/get-supabase-config')
    if (!response.ok) {
      throw new Error(`Failed to fetch Supabase config: ${response.status}`)
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
