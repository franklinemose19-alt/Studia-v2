import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Loader, Check, Phone } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getCurrentUser } from '../lib/supabaseClient'
import { toast } from '../lib/toast'

interface Plan {
  id: string
  name: string
  emoji: string
  price: number
  period: string
  description: string
}

const PLANS: Record<string, Plan> = {
  explorer: { id: 'explorer', name: 'Explorer', emoji: '🌍', price: 0, period: '', description: '3 lifetime AI lectures — free' },
  'achiever-1hr': { id: 'achiever-1hr', name: 'Achiever — 1 Hour', emoji: '🎯', price: 49, period: 'per lecture', description: 'Up to 1 hour of recording with AI notes' },
  'achiever-2hr': { id: 'achiever-2hr', name: 'Achiever — 2 Hours', emoji: '🎯', price: 79, period: 'per lecture', description: 'Up to 2 hours of recording with AI notes' },
  achiever: { id: 'achiever-1hr', name: 'Achiever — 1 Hour', emoji: '🎯', price: 49, period: 'per lecture', description: 'Up to 1 hour of recording with AI notes' },
  excellence: { id: 'excellence', name: 'Excellence', emoji: '🚀', price: 399, period: '/month', description: '20 AI lectures every month' },
  valedictorian: { id: 'valedictorian', name: 'Valedictorian', emoji: '🏆', price: 1200, period: '/semester', description: '65 AI lectures every semester' },
}

export default function Checkout() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const planParam = searchParams.get('plan') || 'excellence'

  const [selectedPlan, setSelectedPlan] = useState<Plan>(PLANS[planParam] || PLANS.excellence)
  const [phoneNumber, setPhoneNumber] = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [userId, setUserId] = useState<string | null>(null)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const isAchiever = planParam === 'achiever' || planParam === 'achiever-1hr' || planParam === 'achiever-2hr'

  useEffect(() => {
    setSelectedPlan(PLANS[planParam] || PLANS.excellence)
  }, [planParam])

  useEffect(() => {
    const check = async () => {
      try {
        const user = await getCurrentUser()
        if (!user) { navigate('/login'); return }
        setUserId(user.id)
      } catch { navigate('/login') }
      finally { setCheckingAuth(false) }
    }
    check()
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [navigate])

  const formatPhone = (phone: string) => {
    let cleaned = phone.replace(/\D/g, '')
    if (cleaned.startsWith('0')) cleaned = '254' + cleaned.substring(1)
    else if (!cleaned.startsWith('254')) cleaned = '254' + cleaned
    return cleaned
  }

  const pollPaymentStatus = (transactionId: string) => {
    let attempts = 0
    pollRef.current = setInterval(async () => {
      attempts++
      try {
        const res = await fetch(`/api/mpesa-stk?transactionId=${transactionId}`)
        const data = await res.json()
        if (data.status === 'completed') {
          clearInterval(pollRef.current!)
          setStatus('success')
          toast.success('Payment confirmed! Your plan is now active.')
          setTimeout(() => navigate('/dashboard'), 2500)
        } else if (data.status === 'failed') {
          clearInterval(pollRef.current!)
          setStatus('error')
          setErrorMsg('Payment was not completed. Please try again.')
        } else if (attempts >= 20) {
          clearInterval(pollRef.current!)
          setStatus('error')
          setErrorMsg('Still waiting for confirmation. If you completed the M-Pesa prompt, your plan will activate shortly — check your dashboard in a minute.')
        }
      } catch {}
    }, 3000)
  }

  const initiatePayment = async () => {
    setErrorMsg('')
    if (!phoneNumber.trim()) { setErrorMsg('Please enter your M-Pesa phone number'); return }
    const formattedPhone = formatPhone(phoneNumber)
    if (formattedPhone.length !== 12 || !formattedPhone.startsWith('254')) {
      setErrorMsg('Invalid phone number. Use format 0712345678')
      return
    }
    setLoading(true)
    setStatus('processing')
    try {
      const response = await fetch('/api/mpesa-stk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: formattedPhone,
          amount: selectedPlan.price,
          planId: selectedPlan.id,
          planName: `${selectedPlan.emoji} ${selectedPlan.name}`,
          userId,
        }),
      })
      const data = await response.json()
      if (data.success) {
        pollPaymentStatus(data.transactionId)
      } else {
        setStatus('error')
        setErrorMsg(data.error || 'Payment failed. Please try again.')
      }
    } catch {
      setStatus('error')
      setErrorMsg('Connection error. Check your internet and try again.')
    } finally {
      setLoading(false)
    }
  }

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader className="animate-spin text-indigo-premium" size={32} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-surface-light to-white">
      <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <button onClick={() => navigate('/pricing')} className="flex items-center gap-2 text-navy hover:text-indigo-premium transition">
            <ArrowLeft size={20} />
            <span className="font-medium hidden sm:inline">Back</span>
          </button>
          <div className="flex items-center gap-1">
            <span className="font-sora font-bold text-lg text-navy">STUDIA AI</span>
          </div>
          <div className="w-16" />
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-8">

        <div>
          <h1 className="font-sora font-bold text-4xl sm:text-5xl text-navy mb-2">Complete Your Purchase</h1>
          <p className="text-gray-500">Secure M-Pesa payment. Instant activation.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Order summary */}
          <div className="bg-white rounded-2xl border border-gray-200 p-8">
            <h2 className="font-sora font-bold text-2xl text-navy mb-6">Order Summary</h2>

            <div className="pb-5 border-b border-gray-200 mb-5">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-3xl">{selectedPlan.emoji}</span>
                <div>
                  <p className="font-sora font-bold text-xl text-navy">{selectedPlan.name}</p>
                  <p className="text-sm text-gray-500">{selectedPlan.description}</p>
                </div>
              </div>
            </div>

            {/* Achiever duration picker */}
            {isAchiever && (
              <div className="mb-5 space-y-2">
                <p className="text-sm font-semibold text-navy">Select lecture duration:</p>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setSelectedPlan(PLANS['achiever-1hr'])}
                    className={`p-3 rounded-xl border-2 text-left transition ${selectedPlan.price === 49 ? 'border-indigo-premium bg-indigo-premium/5' : 'border-gray-200 hover:border-gray-300'}`}>
                    <p className="font-bold text-navy text-lg">KSh 49</p>
                    <p className="text-xs text-gray-600">Up to 1 hour</p>
                  </button>
                  <button onClick={() => setSelectedPlan(PLANS['achiever-2hr'])}
                    className={`p-3 rounded-xl border-2 text-left transition ${selectedPlan.price === 79 ? 'border-indigo-premium bg-indigo-premium/5' : 'border-gray-200 hover:border-gray-300'}`}>
                    <p className="font-bold text-navy text-lg">KSh 79</p>
                    <p className="text-xs text-gray-600">Up to 2 hours</p>
                    <p className="text-[10px] text-light-blue font-semibold">More recording time</p>
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-2 mb-5">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span className="font-medium text-navy">KSh {selectedPlan.price.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Processing fee</span>
                <span className="font-medium text-navy">KSh 0</span>
              </div>
            </div>

            <div className="pt-4 border-t-2 border-gray-200 flex justify-between items-center mb-5">
              <p className="font-sora font-bold text-lg text-navy">Total</p>
              <p className="font-sora font-bold text-4xl text-indigo-premium">KSh {selectedPlan.price.toLocaleString()}</p>
            </div>

            <div className="bg-mint/10 border border-mint/20 rounded-xl p-4">
              <p className="text-sm text-mint font-semibold">✓ Secure M-Pesa Payment</p>
              <p className="text-xs text-gray-600 mt-1">Plan activates instantly on M-Pesa confirmation.</p>
            </div>
          </div>

          {/* Payment form */}
          <div className="bg-white rounded-2xl border border-gray-200 p-8">
            <h2 className="font-sora font-bold text-2xl text-navy mb-6">M-Pesa Payment</h2>

            {(status === 'idle' || status === 'error') && (
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-navy mb-2">M-Pesa Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3.5 text-gray-400" size={20} />
                    <input
                      type="tel" placeholder="0712345678"
                      value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)}
                      disabled={loading}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-12 pr-4 py-3 text-navy placeholder-gray-400 outline-none focus:border-indigo-premium transition disabled:opacity-50 text-base"
                    />
                  </div>
                </div>

                {errorMsg && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <p className="text-sm text-red-600">{errorMsg}</p>
                  </div>
                )}

                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                  <p className="text-xs text-blue-700 font-medium mb-2">How M-Pesa payment works:</p>
                  <ol className="text-xs text-blue-600 space-y-1">
                    <li>1. Enter your Safaricom number above</li>
                    <li>2. Click "Pay with M-Pesa" below</li>
                    <li>3. Check your phone for the STK push</li>
                    <li>4. Enter your M-Pesa PIN to confirm</li>
                    <li>5. Your plan activates automatically</li>
                  </ol>
                </div>

                <button onClick={initiatePayment} disabled={loading || !phoneNumber.trim()}
                  className="w-full bg-indigo-premium text-white font-bold py-4 rounded-xl hover:bg-purple-premium transition disabled:opacity-50 flex items-center justify-center gap-2 text-base">
                  {loading ? <><Loader className="animate-spin" size={20} /> Sending request...</> : <>💰 Pay KSh {selectedPlan.price.toLocaleString()}</>}
                </button>

                <p className="text-center text-xs text-gray-400">100% secure · Powered by M-Pesa Daraja</p>
              </div>
            )}

            {status === 'processing' && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Loader className="animate-spin text-indigo-premium mb-4" size={40} />
                <p className="font-sora font-bold text-navy mb-2">Waiting for M-Pesa confirmation</p>
                <p className="text-gray-500 text-sm">Check your phone for the STK prompt.<br />Enter your M-Pesa PIN to complete.</p>
              </div>
            )}

            {status === 'success' && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 rounded-full bg-mint/20 flex items-center justify-center mb-4">
                  <Check className="text-mint" size={32} />
                </div>
                <p className="font-sora font-bold text-2xl text-navy mb-2">Payment Successful!</p>
                <p className="text-gray-500 text-sm mb-1">{selectedPlan.emoji} {selectedPlan.name} is now active.</p>
                <p className="text-xs text-gray-400">Redirecting to dashboard...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
