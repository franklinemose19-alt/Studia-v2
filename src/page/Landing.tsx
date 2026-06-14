import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Loader, Eye, EyeOff } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (!email || !password) {
        setError('Please enter email and password')
        setLoading(false)
        return
      }

      console.log('Attempting login with email:', email)
      const data = await supabase.signIn(email, password)

      console.log('Login successful:', data)

      // Store session
      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user))
        localStorage.setItem('session', JSON.stringify(data.session))
        console.log('Session stored')
      }

      // Redirect
      console.log('Redirecting to dashboard...')
      setTimeout(() => {
        navigate('/dashboard')
      }, 500)
    } catch (err: any) {
      console.error('Login error:', err)
      setError(err.message || 'An error occurred during login')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-surface-light to-white flex items-center justify-center px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-navy hover:text-indigo-premium transition mb-8"
        >
          <ArrowLeft size={20} />
          Back
        </button>

        <div className="bg-white rounded-2xl border border-gray-200 p-8">
          <h1 className="font-sora font-bold text-4xl text-navy mb-2">Welcome Back</h1>
          <p className="text-gray-600 mb-8">Sign in to continue to STUDIA</p>

          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6"
            >
              <p className="text-sm text-red-600">{error}</p>
            </motion.div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-navy mb-2">Email</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-navy placeholder-gray-400 outline-none focus:border-indigo-premium transition disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-navy mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 pr-12 text-navy placeholder-gray-400 outline-none focus:border-indigo-premium transition disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-3.5 text-gray-400 hover:text-navy"
                  disabled={loading}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-premium text-white font-bold py-3 rounded-xl hover:bg-purple-premium transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader className="animate-spin" size={20} />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <p className="text-center text-sm text-gray-600 mt-6">
            Don't have an account?{' '}
            <button onClick={() => navigate('/signup')} className="text-indigo-premium hover:text-purple-premium font-semibold">
              Sign up
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
