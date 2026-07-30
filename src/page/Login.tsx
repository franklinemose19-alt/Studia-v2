import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Loader, Eye, EyeOff } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/AuthContext'
import { toast } from '../lib/toast'

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { signedIn, loading } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (!loading && signedIn) {
      const from = (location.state as any)?.from?.pathname || '/dashboard'
      navigate(from, { replace: true })
    }
  }, [signedIn, loading, navigate, location])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')

    if (!email || !password) {
      setErrorMsg('Please enter your email and password')
      return
    }

    setSubmitting(true)
    try {
      await supabase.signIn(email, password)
      toast.success('Welcome back! 🎓')
      // AuthContext handles redirect via useEffect above
    } catch (err: any) {
      const msg = err.message || 'An error occurred during login'

      // Friendly error messages
      if (msg.includes('Invalid login') || msg.includes('invalid_grant')) {
        setErrorMsg('Incorrect email or password. Please try again.')
      } else if (msg.includes('Invalid API key') || msg.includes('apikey')) {
        setErrorMsg('Configuration error. Please contact support or try refreshing the page.')
        toast.error('API configuration error — please check Vercel environment variables.')
      } else if (msg.includes('Email not confirmed')) {
        setErrorMsg('Please confirm your email before signing in.')
      } else if (msg.includes('Too many requests')) {
        setErrorMsg('Too many attempts. Please wait a moment and try again.')
      } else {
        setErrorMsg(msg)
      }

      setSubmitting(false)
    }
  }

  const handleGoogleLogin = async () => {
    setGoogleLoading(true)
    setErrorMsg('')
    try {
      await supabase.signInWithGoogle()
      // Redirect to Google happens — no further action
    } catch (err: any) {
      toast.error(err.message || 'Google sign-in failed. Please try again.')
      setGoogleLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-premium to-purple-premium flex items-center justify-center">
            <span className="text-white font-bold text-xl">S</span>
          </div>
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-premium" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-surface-light to-white flex items-center justify-center px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <button onClick={() => navigate('/')} className="flex items-center gap-2 text-navy hover:text-indigo-premium transition mb-8">
          <ArrowLeft size={20} /> Back
        </button>

        <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-premium to-purple-premium flex items-center justify-center">
              <span className="text-white font-bold text-lg">S</span>
            </div>
            <span className="font-sora font-bold text-navy text-lg">STUDIA AI</span>
          </div>

          <h1 className="font-sora font-bold text-3xl text-navy mb-1">Welcome back</h1>
          <p className="text-gray-500 text-sm mb-8">Sign in to continue to your dashboard</p>

          {/* Google Sign In */}
          <button
            onClick={handleGoogleLogin}
            disabled={googleLoading || submitting}
            className="w-full flex items-center justify-center gap-3 border-2 border-gray-200 rounded-xl py-3.5 text-navy font-semibold text-sm hover:border-gray-300 hover:bg-gray-50 transition disabled:opacity-50 mb-6"
          >
            {googleLoading ? (
              <Loader size={18} className="animate-spin" />
            ) : (
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 002.38-5.88c0-.57-.05-.66-.15-1.18z" fill="#4285F4"/>
                <path d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 01-7.18-2.54H1.83v2.07A8 8 0 008.98 17z" fill="#34A853"/>
                <path d="M4.5 10.52a4.8 4.8 0 010-3.04V5.41H1.83a8 8 0 000 7.18l2.67-2.07z" fill="#FBBC05"/>
                <path d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 001.83 5.4L4.5 7.49a4.77 4.77 0 014.48-3.3z" fill="#EA4335"/>
              </svg>
            )}
            {googleLoading ? 'Redirecting to Google...' : 'Continue with Google'}
          </button>

          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400 font-medium">or sign in with email</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {errorMsg && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="bg-red-50 border border-red-200 rounded-xl p-4 mb-5">
              <p className="text-sm text-red-600">{errorMsg}</p>
            </motion.div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-navy mb-2">Email</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                disabled={submitting || googleLoading}
                autoComplete="email"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-navy placeholder-gray-400 outline-none focus:border-indigo-premium transition disabled:opacity-50 text-base"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-navy mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  disabled={submitting || googleLoading}
                  autoComplete="current-password"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 pr-12 text-navy placeholder-gray-400 outline-none focus:border-indigo-premium transition disabled:opacity-50 text-base"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-3.5 text-gray-400 hover:text-navy" disabled={submitting}>
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || googleLoading}
              className="w-full bg-indigo-premium text-white font-bold py-3.5 rounded-xl hover:bg-purple-premium transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <><Loader className="animate-spin" size={20} /> Signing in...</>
              ) : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-600 mt-6">
            Don't have an account?{' '}
            <button onClick={() => navigate('/signup')} className="text-indigo-premium hover:text-purple-premium font-semibold">
              Sign up free
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
