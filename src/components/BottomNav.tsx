import { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Home, Mic, BookOpen, FlaskConical, Zap } from 'lucide-react'

const TABS = [
  { path: '/dashboard', icon: Home, label: 'Home' },
  { path: '/recording', icon: Mic, label: 'Record' },
  { path: '/notes', icon: BookOpen, label: 'Notes' },
  { path: '/quiz', icon: FlaskConical, label: 'Test' },
  { path: '/ai-tools', icon: Zap, label: 'AI Tools' },
]

const SHOW_ON = [
  '/dashboard', '/recording', '/notes', '/quiz', '/ai-tools',
  '/summarize', '/exam-countdown', '/study-planner',
  '/adaptive-learning', '/offline-vault', '/units',
  '/unit-management', '/payments',
]

export default function BottomNav() {
  const navigate = useNavigate()
  const location = useLocation()

  const shouldShow = SHOW_ON.some(p => location.pathname.startsWith(p))

  useEffect(() => {
    const root = document.getElementById('root')
    if (!root) return
    root.style.paddingBottom = shouldShow ? '72px' : ''
    return () => { if (root) root.style.paddingBottom = '' }
  }, [shouldShow])

  if (!shouldShow) return null

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 bg-surface-elevated/95 backdrop-blur-xl border-t border-white/5"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex items-center justify-around px-1 py-1.5 max-w-lg mx-auto">
        {TABS.map((tab) => {
          const Icon = tab.icon
          const isActive =
            location.pathname === tab.path ||
            (tab.path === '/notes' && location.pathname === '/summarize')
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all active:scale-95 min-w-[56px] ${
                isActive ? 'text-brand-blue' : 'text-[#8B97B5]'
              }`}
            >
              <div className={`p-1.5 rounded-xl transition-all ${isActive ? 'bg-brand-blue/15' : ''}`}>
                <Icon size={21} strokeWidth={isActive ? 2.5 : 1.8} />
              </div>
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
