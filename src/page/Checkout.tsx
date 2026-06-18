import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Loader, Check, Phone } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getCurrentUser } from '../lib/supabaseClient'

interface Plan {
  id: string
  name: string
  price: number
  period: string
  features: string[]
}

export default function Checkout() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const planId = searchParams.get('plan') || 'plus'

  const plans: { [key: string]: Plan } = {
    free: { id: 'free', name: 'Free', price: 0, period: '', features: [] },
    lite: { id: 'lite', name: 'Lite', price: 25, period: 'per lecture', features: [] },
    plus: { id: 'plus', name: 'Plus', price: 250, period: '/month', features: [] },
    pro: { id: 'pro', name: 'Pro', price: 450, period: '/month', features: [] },
    semester: { id: 'semester', name: 'Semester Pass', price: 800, period: '/semester', features: [] },
  }

  const [selectedPlan, setSelectedPlan] = useState<Plan>(plans[planId] || plans.plus)
  const [phoneNumber, setPhoneNumber] = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [userId, setUserId] = useState<string | null>(null)
  const [checkingAuth, setCheckingAuth] = useState(true)

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    setSelectedPlan(plans[planId] || plans.plus)
  }, [planId])

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = await getCurrentUser()
        if (!user) {
          navigate('/login')
          return
        }
        setUserId(user.id)
      } catch {
        navigate('/login')
      } finally {
        setCheckingAuth(false)
      }
    }
    checkAuth()
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [navigate])

  const formatPhoneNumber = (phone: string) => {
    let cleaned = phone.replace(/\D/g, '')
    if (cleaned.startsWith('0')) cleaned = '254' + cleaned.substring(1)
    else if (!cleaned.startsWith('254')) cleaned = '254' + cleaned
    return cleaned
  }

  const pollPaymentStatus = (transactionId: string) => {
    let attempts = 0
    const maxAttempts = 20 // ~60 seconds

    pollRef.current = setInterval(async () => {
      attempts++
      try {
        const res = await fetch(`/api/mpesa-stk?transactionId=${transactionId}`)
        const data = await res.json()

        if (data.status === 'completed') {
          clearInterval(pollRef.current!)
          setStatus('success')
          localStorage.setItem('currentSubscription', JSON.stringify({
            planId: data.planId,
            planName: data.planName,
            startDate: new Date().toISOString(),
            status: 'active',
          }))
          setTimeout(() => navigate('/dashboard'), 3000)
        } else if (data.status === 'failed') {
          clearInterval(pollRef.current!)
          setStatus('error')
          setErrorMsg('Payment was not completed. Please try again.')
        } else if (attempts >= maxAttempts) {
          clearInterval(pollRef.current!)
          setStatus('error')
          setErrorMsg('Still waiting for confirmation. If you completed the M-Pesa prompt, your plan will activate shortly — check your dashboard in a minute.')
        }
      } catch {
        // ignore transient errors, keep polling
      }
    }, 3000)
  }

  const initiatePayment = async () => {
    if (!phoneNumber.trim()) {
      setErrorMsg('Please enter your M-Pesa phone number')
      return
    }
    const formattedPhone = formatPhoneNumber(phoneNumber)
    if (formattedPhone.length !== 12 || !formattedPhone.startsWith('254')) {
      setErrorMsg('Invalid phone number. Please use format 0XXXXXXXXX or 254XXXXXXXXX')
      return
    }

    setLoading(true)
    setStatus('processing')
    setErrorMsg('')

    try {
      const response = await fetch('/api/mpesa-stk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: formattedPhone,
          amount: selectedPlan.price,
          planId: selectedPlan.id,
          planName: selectedPlan.name,
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
      setErrorMsg('Connection error. Please check your internet and try again.')
    } finally {
      setLoading(false)
    }
  }

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
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
            <span className="font-medium">Back</span>
          </button>
          <div className="flex items-center gap-1">
            <span className="font-sora font-bold text-lg text-navy">STUDIA</span>
            <sup className="text-indigo-premium text-xs">β</sup>
          </div>
          <div className="w-20" />
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
          <div>
            <h1 className="font-sora font-bold text-5xl text-navy mb-2">Complete Your Purchase</h1>
            <p className="text-gray-600">Secure M-Pesa payment. Instant activation.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl border border-gray-200 p-8">
              <h2 className="font-sora font-bold text-2xl text-navy mb-6">Order Summary</h2>
              <div className="space-y-6">
                <div className="pb-6 border-b border-gray-200">
                  <p className="text-gray-600 text-sm mb-1">Plan</p>
                  <p className="font-sora font-bold text-2xl text-navy">{selectedPlan.name}</p>
                  {selectedPlan.period && <p className="text-sm text-gray-600 mt-1">{selectedPlan.period}</p>}
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <p className="text-gray-600">Subtotal</p>
                    <p className="font-semibold text-navy">KSh {selectedPlan.price}</p>
                  </div>
                  <div className="flex justify-between">
                    <p className="text-gray-600">Processing Fee</p>
                    <p className="font-semibold text-navy">KSh 0</p>
                  </div>
                </div>
                <div className="pt-6 border-t-2 border-gray-200">
                  <div className="flex justify-between items-center">
                    <p className="font-sora font-bold text-lg text-navy">Total</p>
                    <p className="font-sora font-bold text-4xl text-indigo-premium">KSh {selectedPlan.price}</p>
                  </div>
                </div>
                <div className="bg-mint/10 border border-mint/20 rounded-xl p-4 mt-6">
                  <p className="text-sm text-mint font-semibold">✓ Secure Escrow Payment</p>
                  <p className="text-xs text-gray-600 mt-1">Payment held securely. Released after activation.</p>
                </div>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white rounded-2xl border border-gray-200 p-8">
              <h2 className="font-sora font-bold text-2xl text-navy mb-6">M-Pesa Payment</h2>

              {status === 'idle' || status === 'error' ? (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-navy mb-2">M-Pesa Phone Number</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3.5 text-gray-400" size={20} />
                      <input
                        type="tel"
                        placeholder="0712345678 or 254712345678"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        disabled={loading}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-12 pr-4 py-3 text-navy placeholder-gray-400 outline-none focus:border-indigo-premium transition disabled:opacity-50"
                      />
                    </div>
                  </div>

                  {errorMsg && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                      <p className="text-sm text-red-600">{errorMsg}</p>
                    </div>
                  )}

                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <p className="text-xs text-blue-700 font-medium mb-2">How it works:</p>
                    <ol className="text-xs text-blue-600 space-y-1">
                      <li>1. Enter your M-Pesa number above</li>
                      <li>2. Click "Pay with M-Pesa"</li>
                      <li>3. Confirm the STK prompt on your phone</li>
                      <li>4. Your plan activates automatically once payment is confirmed</li>
                    </ol>
                  </div>

                  <button
                    onClick={initiatePayment}
                    disabled={loading || !phoneNumber.trim()}
                    className="w-full bg-indigo-premium text-white font-bold py-4 rounded-xl hover:bg-purple-premium transition disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? (<><Loader className="animate-spin" size={20} /> Sending request...</>) : (<>💰 Pay KSh {selectedPlan.price}</>)}
                  </button>

                  <p className="text-center text-xs text-gray-500">Your payment is 100% secure and protected by M-Pesa escrow.</p>
                </div>
              ) : status === 'processing' ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader className="animate-spin text-indigo-premium mb-4" size={40} />
                  <p className="font-sora font-bold text-navy mb-2">Waiting for confirmation</p>
                  <p className="text-gray-600 text-center">Check your phone for the M-Pesa prompt.<br />Enter your PIN to complete payment.</p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-16 h-16 rounded-full bg-mint/20 flex items-center justify-center mb-4">
                    <Check className="text-mint" size={32} />
                  </div>
                  <p className="font-sora font-bold text-2xl text-navy mb-2">Payment Successful!</p>
                  <p className="text-gray-600 text-center mb-6">Your {selectedPlan.name} plan is now active.</p>
                  <p className="text-sm text-gray-600">Redirecting to dashboard...</p>
                </div>
              )}
            </motion.div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-8">
            <h3 className="font-sora font-bold text-xl text-navy mb-4">Payment FAQ</h3>
            <div className="space-y-4">
              <div>
                <p className="font-semibold text-navy mb-1">Is this secure?</p>
                <p className="text-sm text-gray-600">Yes! M-Pesa is Kenya's most secure payment system. Your funds are protected.</p>
              </div>
              <div>
                <p className="font-semibold text-navy mb-1">What if payment fails?</p>
                <p className="text-sm text-gray-600">Your payment is automatically refunded. No charges if unsuccessful.</p>
              </div>
              <div>
                <p className="font-semibold text-navy mb-1">When does my plan start?</p>
                <p className="text-sm text-gray-600">As soon as your M-Pesa payment is confirmed — usually within seconds.</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
