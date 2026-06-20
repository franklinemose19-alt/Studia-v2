import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, RefreshCw, CheckCircle, Clock, AlertCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { getSupabase } from '../lib/supabaseClient'

interface Payment {
  transactionId: string
  phoneNumber: string
  amount: number
  planName: string
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded'
  createdAt: string
  updatedAt: string
  mpesaConfirmation?: {
    resultCode: number
    resultDesc: string
    transactionId: string
  }
  completedAt?: string
  refundReason?: string
}

export default function PaymentDashboard() {
  const navigate = useNavigate()
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const userIdRef = useRef<string | null>(null)

  useEffect(() => {
    const init = async () => {
      try {
        const client = await getSupabase()
        const { data: { user } } = await client.auth.getUser()
        if (user) {
          userIdRef.current = user.id
          await fetchPayments()
        } else {
          setLoading(false)
        }
      } catch (err) {
        console.error('Failed to load user:', err)
        setLoading(false)
      }
    }
    init()

    const interval = setInterval(() => {
      if (userIdRef.current) fetchPayments()
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  const fetchPayments = async () => {
    if (!userIdRef.current) return
    try {
      const res = await fetch(`/api/payments?userId=${userIdRef.current}`)
      const data = await res.json()
      if (Array.isArray(data)) {
        const mapped: Payment[] = data.map((p: any) => ({
          transactionId: p.transaction_id,
          phoneNumber: p.phone_number,
          amount: p.amount,
          planName: p.plan_name,
          status: p.status,
          createdAt: p.created_at,
          updatedAt: p.updated_at,
          mpesaConfirmation: p.mpesa_confirmation || undefined,
          completedAt: p.completed_at || undefined,
          refundReason: p.refund_reason || undefined,
        }))
        setPayments(mapped)
      }
    } catch (error) {
      console.error('Failed to fetch payments', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'processing': return 'bg-blue-100 text-blue-800'
      case 'completed': return 'bg-green-100 text-green-800'
      case 'failed': return 'bg-red-100 text-red-800'
      case 'refunded': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="text-green-600" size={20} />
      case 'processing': return <Clock className="text-blue-600" size={20} />
      case 'failed':
      case 'refunded': return <AlertCircle className="text-red-600" size={20} />
      default: return <Clock className="text-yellow-600" size={20} />
    }
  }

  return (
    <div className="min-h-screen bg-surface-base">
      <nav className="border-b border-white/5 bg-surface-elevated/50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-sm text-[#8B97B5] hover:text-white transition-colors">
            <ArrowLeft size={16} /> Back to Dashboard
          </button>
          <div className="flex items-center gap-1">
            <span className="font-sora font-bold text-xl text-white">STUDIA Payments</span>
            <sup className="text-brand-blue text-xs">β</sup>
          </div>
          <button onClick={fetchPayments} className="p-2 rounded-lg hover:bg-white/10 transition">
            <RefreshCw size={18} className="text-[#8B97B5]" />
          </button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
          <div>
            <h1 className="font-sora font-bold text-4xl text-white mb-2">Payment Tracking</h1>
            <p className="text-[#8B97B5]">Your real transaction history and escrow status</p>
          </div>

          <div className="grid md:grid-cols-4 gap-4">
            {[
              { label: 'Total Payments', value: payments.length, color: 'from-brand-blue' },
              { label: 'In Escrow', value: payments.filter((p) => p.status === 'processing').length, color: 'from-warning' },
              { label: 'Completed', value: payments.filter((p) => p.status === 'completed').length, color: 'from-brand-green' },
              { label: 'Refunded', value: payments.filter((p) => p.status === 'refunded').length, color: 'from-red-500' },
            ].map((stat, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                className={`bg-gradient-to-br ${stat.color} to-transparent rounded-xl p-4 border border-white/10`}>
                <p className="text-[#8B97B5] text-sm mb-1">{stat.label}</p>
                <p className="font-sora font-bold text-3xl text-white">{stat.value}</p>
              </motion.div>
            ))}
          </div>

          <div className="bg-surface-elevated rounded-2xl border border-white/5 overflow-hidden">
            <div className="overflow-x-auto">
              {loading ? (
                <div className="p-12 text-center text-[#8B97B5]">Loading your payments...</div>
              ) : payments.length === 0 ? (
                <div className="p-12 text-center text-[#8B97B5]">No payments yet. Choose a plan to get started.</div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/5 bg-surface-base/50">
                      <th className="px-6 py-4 text-left text-xs font-semibold text-[#8B97B5]">Transaction ID</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-[#8B97B5]">Phone</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-[#8B97B5]">Plan</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-[#8B97B5]">Amount</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-[#8B97B5]">Status</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-[#8B97B5]">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((payment, i) => (
                      <motion.tr key={payment.transactionId} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}
                        className="border-b border-white/5 hover:bg-surface-base/50 transition">
                        <td className="px-6 py-4 text-sm font-mono text-white">{payment.transactionId}</td>
                        <td className="px-6 py-4 text-sm text-[#8B97B5]">{payment.phoneNumber}</td>
                        <td className="px-6 py-4 text-sm text-white">{payment.planName}</td>
                        <td className="px-6 py-4 text-sm font-semibold text-brand-blue">KSh {payment.amount}</td>
                        <td className="px-6 py-4 text-sm">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(payment.status)}
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(payment.status)}`}>
                              {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-[#8B97B5]">{new Date(payment.createdAt).toLocaleDateString()}</td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div className="bg-gradient-to-r from-brand-blue/10 to-purple-premium/10 rounded-2xl p-8 border border-brand-blue/20">
            <h2 className="font-sora font-bold text-2xl text-white mb-6">Escrow Payment Flow</h2>
            <div className="grid md:grid-cols-5 gap-4">
              {[
                { step: '1', title: 'Pending', desc: 'Payment initiated', color: 'from-yellow-500' },
                { step: '2', title: 'Processing', desc: 'Funds in escrow', color: 'from-brand-blue' },
                { step: '3', title: 'AI Active', desc: 'Lectures process', color: 'from-purple-premium' },
                { step: '4', title: 'Released/Refund', desc: 'Complete or refund', color: 'from-brand-green' },
              ].map((item, i) => (
                <div key={i} className="relative">
                  <div className={`bg-gradient-to-br ${item.color} to-transparent rounded-lg p-4 border border-white/10`}>
                    <p className="font-sora font-bold text-2xl text-white mb-1">{item.step}</p>
                    <p className="font-semibold text-white text-sm">{item.title}</p>
                    <p className="text-xs text-[#8B97B5] mt-1">{item.desc}</p>
                  </div>
                  {i < 3 && <div className="hidden md:block absolute top-1/2 -right-2 text-brand-blue text-lg">→</div>}
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
