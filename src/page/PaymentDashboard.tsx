import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, RefreshCw, CheckCircle, Clock, AlertCircle, Gift, Copy, Share2, Trophy, Users } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getSupabase } from '../lib/supabaseClient'

interface Payment {
  transactionId: string
  phoneNumber: string
  amount: number
  planName: string
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded'
  createdAt: string
  updatedAt: string
  mpesaConfirmation?: { resultCode: number; resultDesc: string; transactionId: string }
  completedAt?: string
  refundReason?: string
}

interface ReferralRecord {
  id: number
  referred_user_id: string
  status: string
  created_at: string
}

const MILESTONES = [
  { threshold: 1, total: 2 },
  { threshold: 5, total: 5 },
  { threshold: 10, total: 12 },
  { threshold: 25, total: 30 },
  { threshold: 50, total: 70 },
  { threshold: 100, total: 150 },
]
export default function PaymentDashboard() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [tab, setTab] = useState<'payments' | 'invite'>(searchParams.get('tab') === 'invite' ? 'invite' : 'payments')
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const userIdRef = useRef<string | null>(null)

  const [referralCode, setReferralCode] = useState<string | null>(null)
  const [verifiedCount, setVerifiedCount] = useState(0)
  const [isAmbassador, setIsAmbassador] = useState(false)
  const [referralHistory, setReferralHistory] = useState<ReferralRecord[]>([])
  const [referralLoading, setReferralLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const init = async () => {
      try {
        const client = await getSupabase()
        const { data: { user } } = await client.auth.getUser()
        if (user) {
          userIdRef.current = user.id
          await fetchPayments()
          await loadReferralData(user.id)
        } else {
          setLoading(false)
          setReferralLoading(false)
        }
      } catch (err) {
        console.error('Failed to load user:', err)
        setLoading(false)
        setReferralLoading(false)
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

  const loadReferralData = async (userId: string) => {
    setReferralLoading(true)
    try {
      const genRes = await fetch('/api/referral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate', userId }),
      })
      const genData = await genRes.json()
      setReferralCode(genData.code || null)
      setVerifiedCount(genData.verifiedCount || 0)
      setIsAmbassador(genData.isAmbassador || false)

      const client = await getSupabase()
      const { data } = await client
        .from('referrals')
        .select('id, referred_user_id, status, created_at')
        .eq('referrer_user_id', userId)
        .order('created_at', { ascending: false })

      if (data) setReferralHistory(data as ReferralRecord[])
    } catch (err) {
      console.error('Failed to load referral data:', err)
    } finally {
      setReferralLoading(false)
    }
  }

  const referralLink = referralCode ? `${window.location.origin}/signup?ref=${referralCode}` : ''

  const copyLink = () => {
    if (!referralLink) return
    navigator.clipboard.writeText(referralLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const shareLink = async () => {
    if (!referralLink) return
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join me on STUDIA',
          text: 'I\'m using STUDIA to ace my exams — record lectures, get AI notes & quizzes instantly. Sign up with my link and we both get bonus credits!',
          url: referralLink,
        })
      } catch {
        // user cancelled share, no-op
      }
    } else {
      copyLink()
    }
  }

  const nextMilestone = MILESTONES.find((m) => m.threshold > verifiedCount)
  const currentMilestoneTotal = [...MILESTONES].reverse().find((m) => verifiedCount >= m.threshold)?.total || 0
  const progressToNext = nextMilestone
    ? Math.round((verifiedCount / nextMilestone.threshold) * 100)
    : 100

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
            <span className="font-sora font-bold text-xl text-white">STUDIA</span>
            <sup className="text-brand-blue text-xs">β</sup>
          </div>
          <button onClick={() => (tab === 'payments' ? fetchPayments() : userIdRef.current && loadReferralData(userIdRef.current))} className="p-2 rounded-lg hover:bg-white/10 transition">
            <RefreshCw size={18} className="text-[#8B97B5]" />
          </button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">

          <div className="flex bg-surface-elevated rounded-xl p-1 gap-1 max-w-md">
            <button
              onClick={() => setTab('payments')}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${tab === 'payments' ? 'bg-brand-blue text-white' : 'text-[#8B97B5] hover:text-white'}`}
            >
              Payments
            </button>
            <button
              onClick={() => setTab('invite')}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-1.5 ${
                tab === 'invite'
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/30'
                  : 'bg-gradient-to-r from-purple-500/15 to-pink-500/15 text-purple-300 hover:from-purple-500/25 hover:to-pink-500/25'
              }`}
            >
              <motion.span animate={{ rotate: [0, -10, 10, -10, 0] }} transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 3 }}>🎁</motion.span>
              Refer and Earn
            </button>
          </div>

          {tab === 'payments' ? (
            <>
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
            </>
          ) : (
            <>
              <div>
                <h1 className="font-sora font-bold text-4xl text-white mb-2 flex items-center gap-3">
                  🎉 Invite & Earn
                </h1>
                <p className="text-[#8B97B5]">Invite fellow students and unlock bonus AI credits.</p>
              </div>

              {referralLoading ? (
                <div className="text-center py-12 text-[#8B97B5]">Loading your referral info...</div>
              ) : (
                <>
                  {isAmbassador && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                      className="bg-gradient-to-r from-warning/20 to-red-500/20 border border-warning/40 rounded-2xl p-6 flex items-center gap-4">
                      <Trophy className="text-warning shrink-0" size={32} />
                      <div>
                        <p className="font-sora font-bold text-white text-lg">🏆 Campus Ambassador</p>
                        <p className="text-sm text-[#8B97B5]">You've referred 100+ students — you're officially a STUDIA legend.</p>
                      </div>
                    </motion.div>
                  )}

                  <div className="bg-gradient-to-br from-brand-blue/10 to-purple-500/10 border border-brand-blue/20 rounded-2xl p-8 space-y-6">
                    <div>
                      <p className="text-sm text-[#8B97B5] mb-2">Your Referral Code</p>
                      <p className="font-sora font-bold text-3xl text-white tracking-wider">{referralCode || '...'}</p>
                    </div>

                    <div>
                      <p className="text-sm text-[#8B97B5] mb-2">Your Referral Link</p>
                      <div className="bg-surface-base border border-white/10 rounded-xl p-3 text-sm text-[#8B97B5] font-mono break-all">
                        {referralLink || 'Generating...'}
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button onClick={copyLink} className="flex-1 flex items-center justify-center gap-2 bg-surface-elevated border border-white/10 text-white py-3 rounded-xl hover:border-brand-blue/40 text-sm font-medium transition-colors">
                        <Copy size={16} /> {copied ? 'Copied!' : 'Copy Link'}
                      </button>
                      <button onClick={shareLink} className="flex-1 flex items-center justify-center gap-2 bg-brand-blue text-white py-3 rounded-xl hover:bg-brand-blue/90 text-sm font-medium transition-colors">
                        <Share2 size={16} /> Share Link
                      </button>
                    </div>
                  </div>

                
                  {loading ? (
                <div className="bg-surface-elevated rounded-2xl border border-white/5 p-12 text-center text-[#8B97B5]">Loading your payments...</div>
              ) : payments.length === 0 ? (
                <div className="bg-surface-elevated rounded-2xl border border-white/5 p-12 text-center text-[#8B97B5]">No payments yet. Choose a plan to get started.</div>
              ) : (
                <>
                  {/* Mobile: stacked cards */}
                  <div className="md:hidden space-y-3">
                    {payments.map((payment, i) => (
                      <motion.div key={payment.transactionId} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                        className="bg-surface-elevated rounded-2xl border border-white/5 p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono text-white truncate pr-2">{payment.transactionId}</span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {getStatusIcon(payment.status)}
                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusColor(payment.status)}`}>
                              {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-white font-medium">{payment.planName}</span>
                          <span className="text-brand-blue font-semibold">KSh {payment.amount}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-[#8B97B5] pt-2 border-t border-white/5">
                          <span>{payment.phoneNumber}</span>
                          <span>{new Date(payment.createdAt).toLocaleDateString()}</span>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {/* Desktop: table */}
                  <div className="hidden md:block bg-surface-elevated rounded-2xl border border-white/5 overflow-hidden">
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
                  </div>
                </>
              )}

                 {loading ? (
              <div className="bg-surface-elevated border border-white/5 rounded-2xl overflow-hidden">
                    <div className="p-6 pb-4">
                      <p className="font-sora font-bold text-white text-lg mb-1">Reward Tiers</p>
                      <p className="text-sm text-[#8B97B5]">The more friends you bring, the more you earn.</p>
                    </div>

                    {/* Mobile: stacked cards */}
                    <div className="md:hidden px-4 pb-4 space-y-2">
                      {[
                        { friends: '1', you: '2 bonus credits', friend: '2 bonus credits' },
                        { friends: '5', you: '5 bonus credits', friend: '2 bonus credits' },
                        { friends: '10', you: '12 bonus credits', friend: '2 bonus credits' },
                        { friends: '25', you: '30 bonus credits', friend: '2 bonus credits' },
                        { friends: '50', you: '70 bonus credits', friend: '2 bonus credits' },
                        { friends: '100', you: '150 bonus credits + 🏆 Campus Ambassador', friend: '2 bonus credits' },
                        { friends: '100+', you: '+1 credit per referral', friend: '2 bonus credits' },
                      ].map((row, i) => (
                        <div key={i} className={`rounded-xl p-4 border border-white/5 ${verifiedCount >= parseInt(row.friends) ? 'bg-green-500/10' : 'bg-surface-base'}`}>
                          <p className="text-white font-semibold text-sm mb-2">{row.friends} verified friends</p>
                          <div className="flex justify-between text-xs">
                            <span className="text-[#8B97B5]">You earn</span>
                            <span className="text-brand-blue font-medium text-right">{row.you}</span>
                          </div>
                          <div className="flex justify-between text-xs mt-1">
                            <span className="text-[#8B97B5]">Friend earns</span>
                            <span className="text-[#8B97B5] font-medium">{row.friend}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Desktop: table */}
                    <div className="hidden md:block">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-white/5 bg-surface-base/50">
                            <th className="px-6 py-3 text-left text-xs font-semibold text-[#8B97B5]">Verified Friends</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-[#8B97B5]">You Earn</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-[#8B97B5]">Friend Earns</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            { friends: '1', you: '2 bonus credits', friend: '2 bonus credits' },
                            { friends: '5', you: '5 bonus credits', friend: '2 bonus credits' },
                            { friends: '10', you: '12 bonus credits', friend: '2 bonus credits' },
                            { friends: '25', you: '30 bonus credits', friend: '2 bonus credits' },
                            { friends: '50', you: '70 bonus credits', friend: '2 bonus credits' },
                            { friends: '100', you: '150 bonus credits + 🏆 Campus Ambassador', friend: '2 bonus credits' },
                            { friends: '100+', you: '+1 credit per referral', friend: '2 bonus credits' },
                          ].map((row, i) => (
                            <tr key={i} className={`border-b border-white/5 ${verifiedCount >= parseInt(row.friends) ? 'bg-green-500/5' : ''}`}>
                              <td className="px-6 py-3 text-sm text-white font-semibold">{row.friends}</td>
                              <td className="px-6 py-3 text-sm text-brand-blue">{row.you}</td>
                              <td className="px-6 py-3 text-sm text-[#8B97B5]">{row.friend}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Desktop: table */}
                  <div className="hidden md:block bg-surface-elevated rounded-2xl border border-white/5 overflow-hidden">
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
                  </div>
                </>
              )}
                      
