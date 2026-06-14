import { useState } from 'react'
import { motion } from 'framer-motion'
import { Mail, Lock, Eye, EyeOff, ArrowRight, Loader } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      navigate('/dashboard')
    }, 1500)
  }

  return (
    <div className="min-h-screen bg-surface-base flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative w-full max-w-md"
      >
        <div className="bg-surface-elevated border border-white/5 rounded-3xl p-8 sm:p-10">
          <div className="mb-8 text-center">
            <a href="/" className="inline-flex items-center gap-1 mb-6">
              <span className="font-sora font-bold text-2xl text-white">STUDIA</span>
              <sup className="text-brand-blue text-xs font-mono">β</sup>
            </a>
            <h1 className="font-sora font-bold text-3xl text-white mb-2">Welcome back</h1>
            <p className="text-[#8B97B5] text-sm">Sign in to your study dashboard</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-white mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4A5568] w-4 h-4" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@university.ac.ke"
                  className="w-full bg-surface-base border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder-[#4A5568] outline-none focus:border-brand-blue/40 focus:ring-1 focus:ring-brand-blue/20"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-white mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4A5568] w-4 h-4" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-surface-base border border-white/10 rounded-xl pl-10 pr-10 py-3 text-white placeholder-[#4A5568] outline-none focus:border-brand-blue/40 focus:ring-1 focus:ring-brand-blue/20"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4A5568] hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
  onClick={() => window.history.back()}
  className="flex items-center gap-2 text-navy hover:text-indigo-premium transition mb-8"
>
  <ArrowLeft size={20} />
  Back
</button>
          </form>

          <p className="text-center text-sm text-[#8B97B5] mt-8">
            Don't have an account?{' '}
            <a href="/signup" className="text-brand-blue hover:text-brand-blue/80 font-medium">
              Sign up free
            </a>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
