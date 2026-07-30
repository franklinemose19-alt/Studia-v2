import { motion } from 'framer-motion'

function Pulse({ className }: { className: string }) {
  return (
    <motion.div
      animate={{ opacity: [0.4, 0.8, 0.4] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
      className={`bg-gray-200 rounded-xl ${className}`}
    />
  )
}

function DarkPulse({ className }: { className: string }) {
  return (
    <motion.div
      animate={{ opacity: [0.15, 0.35, 0.15] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
      className={`bg-white/20 rounded-xl ${className}`}
    />
  )
}

// ── Variants ───────────────────────────────────────────────────────────────

export function StatCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl p-4 sm:p-6 border border-gray-200">
      <Pulse className="w-10 h-10 sm:w-12 sm:h-12 mb-4" />
      <Pulse className="h-8 w-16 mb-2" />
      <Pulse className="h-4 w-20" />
    </div>
  )
}

export function CardSkeleton({ dark = false }: { dark?: boolean }) {
  const P = dark ? DarkPulse : Pulse
  const bg = dark ? 'bg-surface-elevated border-white/5' : 'bg-white border-gray-200'
  return (
    <div className={`rounded-2xl p-5 sm:p-6 border ${bg}`}>
      <P className="w-10 h-10 mb-4" />
      <P className="h-4 w-3/4 mb-2" />
      <P className="h-3 w-1/2" />
    </div>
  )
}

export function TableRowSkeleton({ dark = false }: { dark?: boolean }) {
  const P = dark ? DarkPulse : Pulse
  return (
    <div className="flex items-center gap-4 px-6 py-4">
      <P className="h-4 w-32 shrink-0" />
      <P className="h-4 w-24 shrink-0" />
      <P className="h-4 flex-1" />
      <P className="h-4 w-16 shrink-0" />
      <P className="h-6 w-20 rounded-full shrink-0" />
    </div>
  )
}

export function RevenueCardSkeleton({ dark = false }: { dark?: boolean }) {
  const P = dark ? DarkPulse : Pulse
  const bg = dark ? 'bg-surface-elevated border-white/10' : 'bg-gray-50 border-gray-200'
  return (
    <div className={`rounded-xl p-4 border ${bg}`}>
      <P className="w-6 h-6 mb-3" />
      <P className="h-8 w-24 mb-1" />
      <P className="h-3 w-20 mb-0.5" />
      <P className="h-3 w-16" />
    </div>
  )
}

export function NotificationSkeleton() {
  return (
    <div className="px-4 py-3 border-b border-white/5">
      <div className="flex items-start gap-3">
        <Pulse className="w-8 h-8 rounded-full shrink-0" />
        <div className="flex-1 min-w-0">
          <Pulse className="h-3 w-3/4 mb-1.5" />
          <Pulse className="h-3 w-full mb-1" />
          <Pulse className="h-2.5 w-16 mt-1" />
        </div>
      </div>
    </div>
  )
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-8 animate-none">
      <div>
        <Pulse className="h-10 w-64 mb-3" />
        <Pulse className="h-5 w-80" />
      </div>
      <div className="rounded-2xl p-5 border-2 border-gray-200 bg-gray-50">
        <Pulse className="h-5 w-32 mb-3" />
        <Pulse className="h-4 w-64 mb-2" />
        <Pulse className="h-2 w-full rounded-full" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[...Array(4)].map((_, i) => <StatCardSkeleton key={i} />)}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {[...Array(10)].map((_, i) => <CardSkeleton key={i} />)}
      </div>
    </div>
  )
}

export function AdminSkeleton() {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <RevenueCardSkeleton key={i} dark />)}
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <RevenueCardSkeleton key={i} dark />)}
      </div>
      <div className="bg-surface-elevated border border-white/5 rounded-xl overflow-hidden">
        {[...Array(6)].map((_, i) => <TableRowSkeleton key={i} dark />)}
      </div>
    </div>
  )
}
