import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Phone, Loader, CheckCircle } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { loadAccess } from '../lib/access'
import { toast } from '../lib/toast'

const PLANS: Record<string, { id: string; name: string; emoji: string; price: number; period: string; description: string }> = {
  achiever: { id: 'achiever', name: 'Achiever', emoji: '🎯', price: 45, period: 'one-time', description: '45 minutes of AI processing' },
  'achiever-plus': { id: 'achiever-plus', name: 'Achiever+', emoji: '🎯', price: 69, period: 'one-time', description: '90 minutes of AI processing' },
  excellence: { id: 'excellence', name: 'Excellence', emoji: '🚀', price: 399, period: '/month', description: '600 AI minutes every month' },
  valedictorian: { id: 'valedictorian', name: 'Valedictorian', emoji: '🏆', price: 1199, period: '/semester', description: '1,800 AI minutes per semester' },
}

const formatPhone = (phone: string) => {
  let cleaned = phone.replace(/\D/g, '')
  if (cleaned.startsWith('0')) cleaned = '254' + cleaned.substring(1)
  else if (!cleaned.startsWith('254')) cleaned = '254' + cleaned
  return cleaned
}

export default function Checkout() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { userId } = useAuth()

  const planId = searchParams.get('plan') || 'achiever'
  const plan = PLANS[planId] || PLANS.achiever

  const [phone, setPhone] = useState('')
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const pollRef = useState<{ current: ReturnType<typeof setInterval> | null }>({ current: null })[0]

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current) }, [])

  const pay = async () => {
    if (!phone.trim()) { setError('Enter your M-Pesa number'); return }
    setError('')
    setPaying(true)
    try {
      const res = await fetch('/api/mpesa-stk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: formatPhone(phone), amount: plan.price, planId: plan.id,
          planName: `${plan.name} — ${plan.description}`, userId,
        }),
      })
      const data = await res.json()
      if (!data.success) {
        setError(data.error || 'Payment failed. Please try again.')
        toast.error(data.error || 'Payment failed. Please try again.')
        setPaying(false)
        return
      }
      pollPayment(data.transactionId)
    } catch {
      setError('Connection error. Please try again.')
      setPaying(false)
    }
  }

  const pollPayment = (transactionId: string) => {
    let attempts = 0
    pollRef.current = setInterval(async () => {
      attempts++
      try {
        const res = await fetch(`/api/mpesa-stk?transactionId=${transactionId}`)
        const data = await res.json()
        if (data.status === 'completed') {
          clearInterval(pollRef.current!)
          setPaying(false)
          setSuccess(true)
          if (userId) await loadAccess(userId)
          toast.success('Payment confirmed!')
        } else if (data.status === 'failed') {
          clearInterval(pollRef.current!)
          setPaying(false)
          setError('Payment was not completed. Please try again.')
        } else if (attempts >= 20) {
          clearInterval(pollRef.current!)
          setPaying(false)
          setError('Still waiting for confirmation. If you completed the M-Pesa prompt, check your Dashboard shortly.')
        }
      } catch {}
    }, 3000)
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-surface-light to-white flex items-center justify-center px-4">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-3xl border border-gray-200 p-10 text-center max-w-sm shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-mint/15 flex items-center justify-center mx-auto mb-5"><CheckCircle size={32} className="text-mint" /></div>
          <h1 className="font-sora font-bold text-2xl text-navy mb-2">Payment confirmed!</h1>
          <p className="text-gray-500 text-sm mb-6">{plan.name} is now active. {plan.description}.</p>
          <button onClick={() => navigate('/dashboard')} className="w-full bg-indigo-premium text-white font-semibold py-3 rounded-xl hover:bg-purple-premium transition">Go to Dashboard</button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-surface-light to-white">
      <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <button onClick={() => navigate('/pricing')} className="flex items-center gap-2 text-navy hover:text-indigo-premium transition text-sm font-medium">
            <ArrowLeft size={18} /> Back to Pricing
          </button>
          <span className="font-sora font-bold text-lg text-navy">Checkout</span>
          <div className="w-24" />
        </div>
      </nav>

      <div className="max-w-md mx-auto px-4 sm:px-6 py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-3xl border border-gray-200 p-8 space-y-6">
          <div className="text-center">
            <p className="text-3xl mb-2">{plan.emoji}</p>
            <h1 className="font-sora font-bold text-2xl text-navy">{plan.name}</h1>
            <p className="text-gray-500 text-sm mt-1">{plan.description}</p>
            <div className="mt-4">
              <span className="text-4xl font-bold text-navy">KSh {plan.price}</span>
              <span className="text-gray-400 text-sm ml-1">{plan.period !== 'one-time' ? plan.period : ''}</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-navy mb-2">M-Pesa Number</label>
            <div className="relative">
              <Phone className="absolute left-4 top-3.5 text-gray-400" size={18} />
              <input type="tel" placeholder="07XX XXX XXX" value={phone} onChange={e => setPhone(e.target.value)} disabled={paying}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-12 pr-4 py-3 text-navy placeholder-gray-400 outline-none focus:border-indigo-premium transition disabled:opacity-50" />
            </div>
            {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
          </div>

          <button onClick={pay} disabled={paying}
            className="w-full bg-indigo-premium text-white font-bold py-3.5 rounded-xl hover:bg-purple-premium transition disabled:opacity-50 flex items-center justify-center gap-2">
            {paying ? (<><Loader size={18} className="animate-spin" /> Waiting for M-Pesa confirmation...</>) : (`Pay KSh ${plan.price}`)}
          </button>

          <p className="text-xs text-gray-400 text-center">You'll receive an M-Pesa prompt on your phone. Enter your PIN to confirm.</p>
        </motion.div>
      </div>
    </div>
  )
}
