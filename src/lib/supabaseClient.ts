import { createClient } from '@supabase/supabase-js'

let supabaseUrl = ''
let supabaseKey = ''

// Fetch from API endpoint
;(async () => {
  try {
    const res = await fetch('/api/get-supabase-config')
    const config = await res.json()
    supabaseUrl = config.url
    supabaseKey = config.key
  } catch (err) {
    console.error('Failed to load Supabase config:', err)
  }
})()

export const supabase = createClient(supabaseUrl, supabaseKey)

export const signUp = async (email: string, password: string, name: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  })

  if (error) throw error

  if (data.user) {
    const { error: profileError } = await supabase.from('users').insert({
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
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) throw error
  return data
}

export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export const getCurrentUser = async () => {
  const { data, error } = await supabase.auth.getUser()
  if (error) throw error
  return data.user
}

export const getUserProfile = async (userId: string) => {
  const { data, error } = await supabase.from('users').select('*').eq('auth_id', userId).single()
  if (error) throw error
  return data
}
