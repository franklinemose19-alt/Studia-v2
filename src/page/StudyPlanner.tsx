import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Plus, Bell, BellOff, Clock, CheckCircle,
  X, Trash2, Play, Pause, RotateCcw, Calendar,
  TrendingUp, Flame, Trophy, Brain, Loader,
  ChevronDown, ChevronUp,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { toast } from '../lib/toast'
import { authFetch } from '../lib/authFetch'

interface StudySession {
  id: string
  subject: string
  unit?: string
  date: string
  time: string
  duration: number
  type: 'study' | 'revision' | 'practice' | 'exam-prep'
  completed: boolean
  notified: boolean
  snoozedUntil?: number
  completedAt?: string
  totalMinutes?: number
}

interface StudyStats {
  totalSessions: number
  completedSessions: number
  totalHours: number
  currentStreak: number
  longestStreak: number
}

const SESSION_TYPES = {
  study: { label: 'Study', color: 'from-brand-blue', badge: 'bg-brand-blue/20 text-brand-blue' },
  revision: { label: 'Revision', color: 'from-purple-premium', badge: 'bg-purple-500/20 text-purple-300' },
  practice: { label: 'Practice', color: 'from-mint', badge: 'bg-mint/20 text-mint' },
  'exam-prep': { label: 'Exam Prep', color: 'from-warning', badge: 'bg-warning/20 text-warning' },
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return 'Starting now!'
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  if (h > 0) return `in ${h}h ${m}m`
  if (m > 0) return `in ${m}m`
  return 'in less than a minute'
}

function formatTimer(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function StudyPlanner() {
  const navigate = useNavigate()

  const [sessions, setSessions] = useState<StudySession[]>([])
  const [stats, setStats] = useState<StudyStats>({
    totalSessions: 0, completedSessions: 0, totalHours: 0, currentStreak: 0, longestStreak: 0,
  })

  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    subject: '', unit: '', date: '', time: '', duration: 60, type: 'study' as StudySession['type'],
  })

  const [notifPermission, setNotifPermission] = useState<NotificationPermission>('default')
  const [activeSession, setActiveSession] = useState<StudySession | null>(null)
  const [timerRunning, setTimerRunning] = useState(false)
  const [timerSeconds, setTimerSeconds] = useState(0)
  const [sageRec, setSageRec] = useState<string>('')
  const [sageLoading, setSageLoading] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const alarmRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    try { setSessions(JSON.parse(localStorage.getItem('studySessions') || '[]')) } catch {}

    if ('Notification' in window) {
      setNotifPermission(Notification.permission)
    }

    alarmRef.current = setInterval(checkAlarms, 30000)
    return () => {
      if (alarmRef.current) clearInterval(alarmRef.current)
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  useEffect(() => {
    try { localStorage.setItem('studySessions', JSON.stringify(sessions)) } catch {}
    computeStats()
  }, [sessions])

  const computeStats = () => {
    const completed = sessions.filter(s => s.completed)
    const totalHours = completed.reduce((sum, s) => sum + (s.totalMinutes || s.duration) / 60, 0)

    const studyDates = new Set(completed.map(s => s.date))
    let streak = 0
    const cursor = new Date()
    while (studyDates.has(cursor.toISOString().slice(0, 10))) {
      streak++
      cursor.setDate(cursor.getDate() - 1)
    }

    setStats({
      totalSessions: sessions.length,
      completedSessions: completed.length,
      totalHours: Math.round(totalHours * 10) / 10,
      currentStreak: streak,
      longestStreak: Math.max(streak, 0),
    })
  }

  const requestNotifPermission = async () => {
    if (!('Notification' in window)) { toast.error('Notifications not supported in this browser'); return }
    const perm = await Notification.requestPermission()
    setNotifPermission(perm)
    if (perm === 'granted') toast.success('Notifications enabled! You\'ll be reminded when sessions start.')
    else toast.error('Notification permission denied. Enable it in browser settings.')
  }

  const fireNotification = (session: StudySession) => {
    if (Notification.permission !== 'granted') return
    new Notification(`📚 Study Session Starting!`, {
      body: `Time to study ${session.subject}${session.unit ? ` — ${session.unit}` : ''}. Duration: ${session.duration} minutes.`,
      icon: '/icon-192.png',
      tag: session.id,
    })
    toast.info(`⏰ Study session starting: ${session.subject}`)
  }

  const checkAlarms = useCallback(() => {
    const now = new Date()
    setSessions(prev => {
      const updated = [...prev]
      let changed = false
      updated.forEach((s, i) => {
        if (s.completed || s.notified) return
        if (s.snoozedUntil && Date.now() < s.snoozedUntil) return
        const sessionTime = new Date(`${s.date}T${s.time}`)
        const diff = sessionTime.getTime() - now.getTime()
        if (diff <= 0 && diff > -120000) {
          fireNotification(s)
          updated[i] = { ...s, notified: true }
          changed = true
        }
      })
      return changed ? updated : prev
    })
  }, [])

  const addSession = () => {
    if (!formData.subject.trim() || !formData.date || !formData.time) {
      toast.error('Please fill in subject, date, and time')
      return
    }
    const session: StudySession = {
      id: `session-${Date.now()}`,
      ...formData,
      completed: false,
      notified: false,
    }
    setSessions(prev => [session, ...prev].sort((a, b) => {
      const da = new Date(`${a.date}T${a.time}`).getTime()
      const db = new Date(`${b.date}T${b.time}`).getTime()
      return da - db
    }))
    setFormData({ subject: '', unit: '', date: '', time: '', duration: 60, type: 'study' })
    setShowForm(false)
    toast.success('Study session scheduled! 📅')
  }

  const deleteSession = (id: string) => {
    setSessions(prev => prev.filter(s => s.id !== id))
  }

  const snoozeSession = (id: string, minutes = 10) => {
    setSessions(prev => prev.map(s =>
      s.id === id ? { ...s, notified: false, snoozedUntil: Date.now() + minutes * 60000 } : s
    ))
    toast.info(`Session snoozed for ${minutes} minutes`)
  }

  const startTimer = (session: StudySession) => {
    setActiveSession(session)
    setTimerSeconds(0)
    setTimerRunning(true)
    timerRef.current = setInterval(() => setTimerSeconds(prev => prev + 1), 1000)

    // FIXED: was a plain fetch with no Authorization header — api/ai-tools.js
    // now requires a verified session token for every mode including
    // 'chat', so this was silently 401ing every time.
    setSageRec('')
    setSageLoading(true)
    authFetch('/api/ai-tools', {
      method: 'POST',
      body: JSON.stringify({
        mode: 'chat',
        chatMessages: [{
          role: 'user',
          content: `I'm about to start a ${session.duration}-minute ${session.type} session on "${session.subject}"${session.unit ? ` — unit: ${session.unit}` : ''}. Give me a quick, practical 2-sentence study tip for this session.`
        }],
        chatMode: 'general',
      }),
    })
      .then(r => r.json())
      .then(d => { setSageRec(d.reply || ''); setSageLoading(false) })
      .catch(() => setSageLoading(false))
  }

  const pauseTimer = () => {
    setTimerRunning(false)
    if (timerRef.current) clearInterval(timerRef.current)
  }

  const resumeTimer = () => {
    setTimerRunning(true)
    timerRef.current = setInterval(() => setTimerSeconds(prev => prev + 1), 1000)
  }

  const completeSession = () => {
    if (!activeSession) return
    if (timerRef.current) clearInterval(timerRef.current)
    setTimerRunning(false)

    const minutesStudied = Math.round(timerSeconds / 60)
    setSessions(prev => prev.map(s =>
      s.id === activeSession.id
        ? { ...s, completed: true, completedAt: new Date().toISOString(), totalMinutes: minutesStudied }
        : s
    ))

    if (Notification.permission === 'granted') {
      new Notification('✅ Study Session Complete!', {
        body: `Great work! You studied ${activeSession.subject} for ${minutesStudied} minutes.`,
        icon: '/icon-192.png',
      })
    }

    toast.success(`🎉 Session complete! ${minutesStudied} minutes studied.`)
    setActiveSession(null)
    setTimerSeconds(0)
    setSageRec('')
  }

  const now = new Date()
  const upcoming = sessions.filter(s => !s.completed).sort((a, b) =>
    new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime()
  )
  const completed = sessions.filter(s => s.completed)
    .sort((a, b) => new Date(b.completedAt || b.date).getTime() - new Date(a.completedAt || a.date).getTime())

  const todayStr = now.toISOString().slice(0, 10)
  const defaultTime = `${String(now.getHours() + 1).padStart(2, '0')}:00`

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-surface-light to-white">
      <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-navy hover:text-indigo-premium transition">
            <ArrowLeft size={20} />
            <span className="hidden sm:inline font-medium">Back</span>
          </button>
          <span className="font-sora font-bold text-lg text-navy">Study Planner</span>
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 bg-indigo-premium text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-purple-premium transition">
            <Plus size={16} /> Schedule
          </button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        <AnimatePresence>
          {activeSession && (
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              className="bg-gradient-to-r from-indigo-premium to-purple-premium rounded-2xl p-6 text-white">
              <div className="flex items-start justify-between flex-wrap gap-4">
                <div>
                  <p className="text-white/60 text-xs font-semibold uppercase tracking-wide mb-1">Active Session</p>
                  <p className="font-sora font-bold text-xl mb-0.5">{activeSession.subject}</p>
                  {activeSession.unit && <p className="text-white/70 text-sm">{activeSession.unit}</p>}
                </div>
                <div className="text-center">
                  <p className="font-mono font-bold text-4xl">{formatTimer(timerSeconds)}</p>
                  <p className="text-white/60 text-xs mt-1">of {activeSession.duration} min session</p>
                </div>
              </div>

              {sageLoading && (
                <div className="mt-4 flex items-center gap-2 text-white/70 text-sm">
                  <Loader size={14} className="animate-spin" /> SAGE is preparing a tip...
                </div>
              )}
              {sageRec && !sageLoading && (
                <div className="mt-4 bg-white/10 rounded-xl p-3">
                  <p className="text-[10px] text-white/60 font-semibold mb-1 flex items-center gap-1"><Brain size={10} /> SAGE TIP</p>
                  <p className="text-sm text-white/90">{sageRec}</p>
                </div>
              )}

              <div className="flex gap-3 mt-5 flex-wrap">
                {timerRunning ? (
                  <button onClick={pauseTimer}
                    className="flex items-center gap-2 bg-white/20 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-white/30 transition">
                    <Pause size={15} /> Pause
                  </button>
                ) : (
                  <button onClick={resumeTimer}
                    className="flex items-center gap-2 bg-white/20 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-white/30 transition">
                    <Play size={15} /> Resume
                  </button>
                )}
                <button onClick={completeSession}
                  className="flex items-center gap-2 bg-white text-indigo-premium px-4 py-2 rounded-xl text-sm font-bold hover:bg-gray-100 transition">
                  <CheckCircle size={15} /> Complete Session
                </button>
                <button onClick={() => { pauseTimer(); setActiveSession(null) }}
                  className="flex items-center gap-2 bg-white/10 text-white/60 px-4 py-2 rounded-xl text-sm hover:bg-white/20 transition">
                  <X size={15} /> Cancel
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {notifPermission !== 'granted' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <BellOff size={20} className="text-yellow-600 shrink-0" />
              <div>
                <p className="font-semibold text-yellow-800 text-sm">Enable notifications for study alarms</p>
                <p className="text-yellow-600 text-xs">Get reminded when your study sessions start</p>
              </div>
            </div>
            <button onClick={requestNotifPermission}
              className="bg-yellow-500 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-yellow-600 transition shrink-0">
              <Bell size={14} className="inline mr-1.5" /> Enable Notifications
            </button>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {[
            { icon: CheckCircle, label: 'Sessions Done', value: stats.completedSessions, color: 'text-mint' },
            { icon: Clock, label: 'Hours Studied', value: `${stats.totalHours}h`, color: 'text-brand-blue' },
            { icon: Flame, label: 'Day Streak', value: `${stats.currentStreak}`, color: 'text-warning' },
            { icon: Trophy, label: 'Total Sessions', value: stats.totalSessions, color: 'text-purple-premium' },
          ].map((s, i) => (
            <div key={i} className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-200">
              <s.icon size={20} className={`${s.color} mb-2`} />
              <p className="font-sora font-bold text-2xl text-navy">{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        <AnimatePresence>
          {showForm && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
              className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-sora font-bold text-xl text-navy">Schedule Study Session</h2>
                <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={20} />
                </button>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-navy mb-2">Subject *</label>
                  <input type="text" placeholder="e.g., Mathematics" value={formData.subject}
                    onChange={e => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-navy outline-none focus:border-indigo-premium transition text-base" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-navy mb-2">Unit / Topic</label>
                  <input type="text" placeholder="e.g., Unit 3: Calculus" value={formData.unit}
                    onChange={e => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-navy outline-none focus:border-indigo-premium transition text-base" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-navy mb-2">Date *</label>
                  <input type="date" value={formData.date || todayStr} min={todayStr}
                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-navy outline-none focus:border-indigo-premium transition text-base" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-navy mb-2">Time *</label>
                  <input type="time" value={formData.time || defaultTime}
                    onChange={e => setFormData({ ...formData, time: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-navy outline-none focus:border-indigo-premium transition text-base" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-navy mb-2">Duration (minutes)</label>
                  <select value={formData.duration} onChange={e => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-navy outline-none focus:border-indigo-premium transition text-base">
                    {[30, 45, 60, 90, 120, 180].map(d => (
                      <option key={d} value={d}>{d < 60 ? `${d} min` : `${d / 60}h${d % 60 ? ` ${d % 60}min` : ''}`}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-navy mb-2">Session Type</label>
                  <select value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value as StudySession['type'] })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-navy outline-none focus:border-indigo-premium transition text-base">
                    {Object.entries(SESSION_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={addSession}
                  className="flex-1 bg-indigo-premium text-white font-semibold py-3.5 rounded-xl hover:bg-purple-premium transition">
                  📅 Schedule Session
                </button>
                <button onClick={() => setShowForm(false)}
                  className="flex-1 bg-gray-100 text-navy font-semibold py-3.5 rounded-xl hover:bg-gray-200 transition">
                  Cancel
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div>
          <h2 className="font-sora font-bold text-xl text-navy mb-4">📅 Upcoming Sessions</h2>
          {upcoming.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
              <Calendar size={36} className="mx-auto text-gray-300 mb-3" />
              <p className="text-navy font-semibold mb-1">No upcoming sessions</p>
              <p className="text-gray-500 text-sm">Schedule your first study session to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcoming.map(session => {
                const sessionTime = new Date(`${session.date}T${session.time}`)
                const msUntil = sessionTime.getTime() - now.getTime()
                const isToday = session.date === todayStr
                const isOverdue = msUntil < 0
                const config = SESSION_TYPES[session.type]

                return (
                  <motion.div key={session.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-2xl border border-gray-200 p-5 hover:border-indigo-premium/50 hover:shadow-md transition">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <p className="font-sora font-bold text-navy text-base truncate">{session.subject}</p>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${config.badge}`}>{config.label}</span>
                        </div>
                        {session.unit && <p className="text-xs text-gray-500 mb-2">{session.unit}</p>}
                        <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
                          <span className="flex items-center gap-1">
                            <Calendar size={12} />
                            {isToday ? 'Today' : sessionTime.toLocaleDateString('en-KE', { weekday: 'short', month: 'short', day: 'numeric' })} at {session.time}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock size={12} />
                            {session.duration < 60 ? `${session.duration}min` : `${session.duration / 60}h`}
                          </span>
                          <span className={isOverdue ? 'text-red-500 font-semibold' : isToday ? 'text-indigo-premium font-semibold' : ''}>
                            {isOverdue ? 'Overdue' : formatCountdown(msUntil)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button onClick={() => startTimer(session)}
                          disabled={!!activeSession}
                          className="flex items-center gap-1.5 bg-indigo-premium text-white px-3 py-2 rounded-xl text-xs font-semibold hover:bg-purple-premium disabled:opacity-40 transition">
                          <Play size={13} /> Start
                        </button>
                        {session.notified && (
                          <button onClick={() => snoozeSession(session.id)}
                            className="px-3 py-2 rounded-xl text-xs border border-gray-200 text-gray-500 hover:border-gray-300 transition">
                            Snooze
                          </button>
                        )}
                        <button onClick={() => deleteSession(session.id)}
                          className="p-2 rounded-xl text-red-400 hover:bg-red-50 transition">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>

        {completed.length > 0 && (
          <div>
            <h2 className="font-sora font-bold text-xl text-navy mb-4">✅ Completed Sessions</h2>
            <div className="space-y-2">
              {completed.slice(0, 10).map(session => {
                const config = SESSION_TYPES[session.type]
                return (
                  <div key={session.id}
                    className="bg-white rounded-xl border border-gray-200 px-5 py-4 flex items-center justify-between gap-4 opacity-75">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <CheckCircle size={15} className="text-mint shrink-0" />
                        <p className="text-sm font-medium text-navy truncate">{session.subject}</p>
                        {session.unit && <p className="text-xs text-gray-400 truncate">— {session.unit}</p>}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5 ml-5">
                        {session.completedAt ? new Date(session.completedAt).toLocaleDateString('en-KE', { weekday: 'short', month: 'short', day: 'numeric' }) : session.date}
                        {session.totalMinutes && ` · ${session.totalMinutes}min studied`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${config.badge}`}>{config.label}</span>
                      <button onClick={() => deleteSession(session.id)} className="p-1.5 text-gray-300 hover:text-red-400 transition">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
