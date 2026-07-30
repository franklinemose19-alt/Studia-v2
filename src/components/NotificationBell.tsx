import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, CheckCheck, Info, AlertTriangle, CheckCircle, XCircle, X } from 'lucide-react'
import { getSupabase } from '../lib/supabaseClient'

interface Notification {
  id: number
  user_id: string
  title: string
  message: string
  type: 'success' | 'error' | 'info' | 'warning'
  read: boolean
  created_at: string
}

interface NotificationBellProps {
  userId: string | null
}

const TYPE_CONFIG = {
  success: { icon: <CheckCircle size={16} />, color: 'text-green-500', bg: 'bg-green-500/10' },
  error: { icon: <XCircle size={16} />, color: 'text-red-500', bg: 'bg-red-500/10' },
  info: { icon: <Info size={16} />, color: 'text-brand-blue', bg: 'bg-brand-blue/10' },
  warning: { icon: <AlertTriangle size={16} />, color: 'text-warning', bg: 'bg-warning/10' },
}

function timeAgo(date: string) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (seconds < 60) return 'Just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export default function NotificationBell({ userId }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const unreadCount = notifications.filter(n => !n.read).length

  const fetchNotifications = async () => {
    if (!userId) return
    setLoading(true)
    try {
      const client = await getSupabase()
      const { data, error } = await client
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20)

      if (!error && data) {
        setNotifications(data as Notification[])
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err)
    } finally {
      setLoading(false)
    }
  }

  const markAllRead = async () => {
    if (!userId || unreadCount === 0) return
    try {
      const client = await getSupabase()
      await client
        .from('notifications')
        .update({ read: true })
        .eq('user_id', userId)
        .eq('read', false)

      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    } catch (err) {
      console.error('Failed to mark notifications read:', err)
    }
  }

  const markOneRead = async (id: number) => {
    try {
      const client = await getSupabase()
      await client.from('notifications').update({ read: true }).eq('id', id)
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    } catch {}
  }

  // Subscribe to real-time new notifications
  useEffect(() => {
    if (!userId) return
    fetchNotifications()

    let channel: any = null
    const setupRealtime = async () => {
      const client = await getSupabase()
      channel = client
        .channel(`notifications-${userId}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        }, (payload) => {
          setNotifications(prev => [payload.new as Notification, ...prev].slice(0, 20))
        })
        .subscribe()
    }
    setupRealtime()

    return () => {
      if (channel) channel.unsubscribe()
    }
  }, [userId])

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Mark all read when opened
  useEffect(() => {
    if (open && unreadCount > 0) {
      setTimeout(markAllRead, 1500)
    }
  }, [open])

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 hover:bg-gray-100 rounded-lg transition"
        aria-label="Notifications"
      >
        <Bell size={20} className="text-navy" />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.span>
        )}
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="absolute right-0 top-12 w-80 sm:w-96 bg-white border border-gray-200 rounded-2xl shadow-2xl z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <h3 className="font-sora font-bold text-navy text-sm">
                Notifications
                {unreadCount > 0 && (
                  <span className="ml-2 text-[10px] bg-red-500/10 text-red-500 px-1.5 py-0.5 rounded-full font-bold">
                    {unreadCount} new
                  </span>
                )}
              </h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="text-[10px] text-indigo-premium hover:text-purple-premium font-medium flex items-center gap-1">
                    <CheckCheck size={12} /> Mark all read
                  </button>
                )}
                <button onClick={() => setOpen(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Notification list */}
            <div className="max-h-80 overflow-y-auto">
              {loading ? (
                <div className="px-4 py-8 text-center text-gray-400 text-sm">Loading...</div>
              ) : notifications.length === 0 ? (
                <div className="px-4 py-10 text-center">
                  <Bell size={28} className="mx-auto text-gray-300 mb-2" />
                  <p className="text-gray-400 text-sm font-medium">No notifications yet</p>
                  <p className="text-gray-300 text-xs mt-1">We'll notify you about payments, referrals, and more.</p>
                </div>
              ) : (
                notifications.map((n) => {
                  const config = TYPE_CONFIG[n.type] || TYPE_CONFIG.info
                  return (
                    <button
                      key={n.id}
                      onClick={() => markOneRead(n.id)}
                      className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition flex items-start gap-3 ${
                        !n.read ? 'bg-indigo-premium/3' : ''
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full ${config.bg} flex items-center justify-center shrink-0 mt-0.5 ${config.color}`}>
                        {config.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-xs font-semibold ${n.read ? 'text-gray-600' : 'text-navy'} leading-snug`}>
                            {n.title}
                          </p>
                          {!n.read && (
                            <span className="w-2 h-2 bg-indigo-premium rounded-full shrink-0 mt-1" />
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 leading-snug">{n.message}</p>
                        <p className="text-[10px] text-gray-300 mt-1">{timeAgo(n.created_at)}</p>
                      </div>
                    </button>
                  )
                })
              )}
            </div>

            {notifications.length > 0 && (
              <div className="px-4 py-2 border-t border-gray-100 text-center">
                <p className="text-[10px] text-gray-400">Showing last 20 notifications</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
