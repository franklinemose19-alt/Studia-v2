import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Loader, Eye, EyeOff, Check, RefreshCw } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/AuthContext'
import { authFetch } from '../lib/authFetch'

const MAX_RETRIES = 5
const RETRY_DELAYS = [4000, 8000, 16000, 32000, 64000]

function isRateLimitError(err: any) {
  const msg = (err?.message || '').toLowerCase()
  return err?.status === 429 || msg.includes('rate') || msg.includes('limit') || msg.includes('too many') || msg.includes('exceeded')
}

export default function Signup() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const refCode = searchParams.get('ref')
  const { signedIn, loading } = useAuth()

  const [step, setStep] = useState(1)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [retryCountdown, setRetryCountdown] = useState(0)
  const [isRetrying, setIsRetrying] = useState(false)

  useEffect(() => {
    if (!loading && signedIn) navigate('/dashboard', { replace: true })
  }, [signedIn, loading, navigate])

  const validateEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)

  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!name.trim()) { setError('Please enter your name'); return }
    if (!validateEmail(email)) { setError('Please enter a valid email'); return }
    setStep(2)
  }

  const handleStep2 = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    if (password !== confirmPassword) { setError('Passwords do not match'); return }
    setStep(3)
  }

  const attemptSignup = async (attempt: number): Promise<any> => {
    try {
      return await supabase.signUp(email, password, name, phone)
    } catch (err: any) {
      if (isRateLimitError(err) && attempt < MAX_RETRIES) {
        const delay = RETRY_DELAYS[attempt]
        const seconds = Math.ceil(delay / 1000)
        setIsRetrying(true)
        setRetryCount(attempt + 1)
        setRetryCountdown(seconds)
        const timer = setInterval(() => {
          setRetryCountdown(prev => { if (prev <= 1) { clearInterval(timer); return 0 } return prev - 1 })
        }, 1000)
        await new Promise(resolve => setTimeout(resolve, delay))
        clearInterval(timer)
        setIsRetrying(false)
        return attemptSignup(attempt + 1)
      }
      throw err
    }
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    setRetryCount(0)
    setRetryCountdown(0)

    try {
      await attemptSignup(0)
      // FIXED: now uses authFetch — a real session exists at this point
      // (signUp establishes one immediately since email confirmation is
      // off) — so the server derives identity from the verified token
      // instead of trusting a userId in the body, matching every other
      // hardened endpoint.
      if (refCode) {
        authFetch('/api/referral', {
          method: 'POST',
          body: JSON.stringify({ action: 'link', code: refCode }),
        }).catch(() => {})
      }
      setSuccess(true)
      setTimeout(() => navigate('/dashboard'), 2000)
    } catch (err: any) {
      if (isRateLimitError(err)) {
        setError(`STUDIA is experiencing high demand. All ${MAX_RETRIES} retries were used. Please wait a few minutes and try again.`)
      } else {
        setError(err.message || 'Signup failed')
      }
      setSubmitting(false)
      setIsRetrying(false)
    }
  }

  const handleGoogleSignup = async () => {
    setGoogleLoading(true)
    setError('')
    try {
      await supabase.signInWithGoogle()
    } catch (err: any) {
      setError(err.message || 'Google sign-in failed')
      setGoogleLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-premium" />
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-surface-light to-white flex items-center justify-center px-4">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center max-w-md">
          <div className="w-20 h-20 rounded-full bg-mint/20 flex items-center justify-center mx-auto mb-6">
            <Check className="text-mint" size={40} />
          </div>
          <h1 className="font-sora font-bold text-3xl text-navy mb-2">Account Created!</h1>
          <p className="text-gray-600 mb-4">Welcome to STUDIA AI. Your account is ready.</p>
          <p className="text-sm text-gray-500">Redirecting to your dashboard...</p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-surface-light to-white flex items-center justify-center px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <button onClick={() => window.history.back()} className="flex items-center gap-2 text-navy hover:text-indigo-premium transition mb-8">
          <ArrowLeft size={20} /> Back
        </button>

        <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-premium to-purple-premium flex items-center justify-center">
              <span className="text-white font-bold text-lg">S</span>
            </div>
            <span className="font-sora font-bold text-navy text-lg">STUDIA AI</span>
          </div>

          <h1 className="font-sora font-bold text-3xl text-navy mb-1">Create account</h1>
          <p className="text-gray-500 text-sm mb-6">
            {step === 1 ? 'Start with your basic info' : step === 2 ? 'Set a secure password' : 'Almost done!'}
          </p>

          {step === 1 && (
            <>
              {refCode && (
                <div className="bg-mint/10 border border-mint/20 rounded-xl p-3 mb-5">
                  <p className="text-xs text-mint font-semibold">🎁 You'll get 5 bonus AI minutes after your first action — invited via referral!</p>
                </div>
              )}

              <button
                onClick={handleGoogleSignup}
                disabled={googleLoading || submitting}
                className="w-full flex items-center justify-center gap-3 border-2 border-gray-200 rounded-xl py-3.5 text-navy font-semibold text-sm hover:border-gray-300 hover:bg-gray-50 transition disabled:opacity-50 mb-6"
              >
                {googleLoading ? (
                  <Loader size={18} className="animate-spin" />
                ) : (
                  <svg width="18" height="18" viewBox="0 0 18 18">
                    <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 002.38-5.88c0-.57-.05-.66-.15-1.18z"/>
                    <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 01-7.18-2.54H1.83v2.07A8 8 0 008.98 17z"/>
                    <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 010-3.04V5.41H1.83a8 8 0 000 7.18l2.67-2.07z"/>
                    <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 001.83 5.4L4.5 7.49a4.77 4.77 0 014.48-3.3z"/>
                  </svg>
                )}
                {googleLoading ? 'Redirecting to Google...' : 'Continue with Google'}
              </button>

              <div className="flex items-center gap-3 mb-6">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400 font-medium">or sign up with email</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>
            </>
          )}

          <div className="flex items-center gap-2 mb-6">
            {[1, 2, 3].map((s) => (
              <div key={s} className={`h-1.5 rounded-full transition-all ${
                s === step ? 'bg-indigo-premium flex-1' : s < step ? 'bg-mint w-6' : 'bg-gray-200 w-6'
              }`} />
            ))}
          </div>

          {isRetrying && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-5 flex items-start gap-3">
              <RefreshCw size={18} className="text-blue-500 animate-spin shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-blue-700">High demand — retrying automatically</p>
                <p className="text-xs text-blue-600 mt-0.5">Attempt {retryCount} of {MAX_RETRIES} · Retrying in {retryCountdown}s...</p>
              </div>
            </motion.div>
          )}

          {error && !isRetrying && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="bg-red-50 border border-red-200 rounded-xl p-4 mb-5">
              <p className="text-sm text-red-600">{error}</p>
            </motion.div>
          )}

          {step === 1 && (
            <form onSubmit={handleStep1} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-navy mb-2">Full Name</label>
                <input type="text" placeholder="Your name" value={name} onChange={e => setName(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-navy placeholder-gray-400 outline-none focus:border-indigo-premium transition text-base" />
              </div>
              <div>
                <label className="block text-sm font-medium text-navy mb-2">Email</label>
                <input type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-navy placeholder-gray-400 outline-none focus:border-indigo-premium transition text-base" />
              </div>
              <button type="submit" className="w-full bg-indigo-premium text-white font-bold py-3.5 rounded-xl hover:bg-purple-premium transition">
                Continue →
              </button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleStep2} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-navy mb-2">Password</label>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 pr-12 text-navy placeholder-gray-400 outline-none focus:border-indigo-premium transition text-base" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-3.5 text-gray-400 hover:text-navy">
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">At least 8 characters</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-navy mb-2">Confirm Password</label>
                <div className="relative">
                  <input type={showConfirmPassword ? 'text' : 'password'} placeholder="••••••••" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 pr-12 text-navy placeholder-gray-400 outline-none focus:border-indigo-premium transition text-base" />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-4 top-3.5 text-gray-400 hover:text-navy">
                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setStep(1)} className="flex-1 border border-gray-200 text-navy font-bold py-3.5 rounded-xl hover:bg-gray-50 transition">
                  ← Back
                </button>
                <button type="submit" className="flex-1 bg-indigo-premium text-white font-bold py-3.5 rounded-xl hover:bg-purple-premium transition">
                  Continue →
                </button>
              </div>
            </form>
          )}

          {step === 3 && (
            <form onSubmit={handleSignup} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-navy mb-2">Phone Number (Optional — for M-Pesa)</label>
                <input type="tel" placeholder="0712345678" value={phone} onChange={e => setPhone(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-navy placeholder-gray-400 outline-none focus:border-indigo-premium transition text-base" />
              </div>
              <div className="bg-mint/10 border border-mint/20 rounded-xl p-4">
                <p className="text-sm text-mint font-semibold mb-2">✓ Ready to go!</p>
                <p className="text-xs text-gray-600">Email: <strong>{email}</strong></p>
                <p className="text-xs text-gray-600 mt-1">Name: <strong>{name}</strong></p>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setStep(2)} disabled={submitting}
                  className="flex-1 border border-gray-200 text-navy font-bold py-3.5 rounded-xl hover:bg-gray-50 transition disabled:opacity-50">
                  ← Back
                </button>
                <button type="submit" disabled={submitting}
                  className="flex-1 bg-indigo-premium text-white font-bold py-3.5 rounded-xl hover:bg-purple-premium transition disabled:opacity-50 flex items-center justify-center gap-2">
                  {submitting ? (
                    isRetrying
                      ? <><RefreshCw size={18} className="animate-spin" /> Retrying {retryCount}/{MAX_RETRIES}...</>
                      : <><Loader size={18} className="animate-spin" /> Creating...</>
                  ) : 'Create Account 🎓'}
                </button>
              </div>
            </form>
          )}

          <p className="text-center text-sm text-gray-600 mt-6">
            Already have an account?{' '}
            <button onClick={() => navigate('/login')} className="text-indigo-premium hover:text-purple-premium font-semibold">Sign in</button>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
