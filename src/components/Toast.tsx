import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react'
import { type ToastItem, onToastAdd, onToastDismiss, toast as toastApi } from '../lib/toast'

function ToastMessage({ item, onDismiss }: { item: ToastItem; onDismiss: (id: string) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(item.id), item.duration)
    return () => clearTimeout(timer)
  }, [item.id, item.duration, onDismiss])

  const config = {
    success: {
      bg: 'bg-green-500',
      border: 'border-green-400',
      icon: <CheckCircle size={18} className="text-white shrink-0" />,
    },
    error: {
      bg: 'bg-red-500',
      border: 'border-red-400',
      icon: <XCircle size={18} className="text-white shrink-0" />,
    },
    info: {
      bg: 'bg-brand-blue',
      border: 'border-blue-400',
      icon: <Info size={18} className="text-white shrink-0" />,
    },
    warning: {
      bg: 'bg-warning',
      border: 'border-amber-400',
      icon: <AlertTriangle size={18} className="text-white shrink-0" />,
    },
  }

  const { bg, border, icon } = config[item.type]

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -16, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -12, scale: 0.94 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className={`${bg} border ${border}/40 text-white rounded-2xl px-4 py-3 shadow-xl flex items-center gap-3 w-[320px] sm:w-[360px] backdrop-blur-sm`}
    >
      {icon}
      <p className="text-sm font-medium flex-1 leading-snug">{item.message}</p>
      <button
        onClick={() => onDismiss(item.id)}
        className="text-white/60 hover:text-white transition shrink-0 p-0.5 rounded-lg hover:bg-white/10"
      >
        <X size={15} />
      </button>
    </motion.div>
  )
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const dismiss = useCallback((id: string) => {
    toastApi.dismiss(id)
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  useEffect(() => {
    const unsubAdd = onToastAdd((t) => {
      setToasts(prev => [t, ...prev].slice(0, 4))
    })
    const unsubDismiss = onToastDismiss((id) => {
      setToasts(prev => prev.filter(t => t.id !== id))
    })
    return () => { unsubAdd(); unsubDismiss() }
  }, [])

  return (
    <div className="fixed top-4 left-0 right-0 z-[200] flex flex-col items-center gap-2 pointer-events-none px-4">
      <AnimatePresence mode="popLayout">
        {toasts.map(t => (
          <div key={t.id} className="pointer-events-auto">
            <ToastMessage item={t} onDismiss={dismiss} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  )
}
