import { getSupabase } from './supabaseClient'

// Drop-in replacement for fetch() that automatically attaches the current
// session's real access token — this is what lets the backend verify who's
// actually calling, instead of trusting a plain string in the body.
export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const client = await getSupabase()
  const { data: { session } } = await client.auth.getSession()
  const token = session?.access_token

  const headers = new Headers(options.headers || {})
  if (token) headers.set('Authorization', `Bearer ${token}`)
  if (!headers.has('Content-Type') && options.body) headers.set('Content-Type', 'application/json')

  return fetch(url, { ...options, headers })
}
