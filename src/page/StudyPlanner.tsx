import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Plus, Trash2, Clock } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface StudySession {
  id: string
  day: string
  subject: string
  startTime: string
  endTime: string
  notes?: string
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export default function StudyPlanner() {
  const navigate = useNavigate()
  const [sessions, setSessions] = useState<StudySession[]>([])
  const [selectedDay, setSelectedDay] = useState('Monday')
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ subject: '', startTime: '', endTime: '', notes: '' })

  useEffect(() => {
    const saved = localStorage.getItem('studySessions')
    if (saved) {
      try {
        setSessions(JSON.parse(saved))
      } catch {
        setSessions([])
      }
    }
  }, [])

  useEffect(() => {
    if (sessions.length > 0) {
      localStorage.setItem('studySessions', JSON.stringify(sessions))
    }
  }, [sessions])

  const addSession = () => {
    if (!formData.subject.trim() || !formData.startTime || !formData.endTime) {
      alert('Please fill in all required fields')
      return
    }

    const newSession: StudySession = {
      id: `session-${Date.now()}`,
      day: selectedDay,
      subject: formData.subject,
      startTime: formData.startTime,
      endTime: formData.endTime,
      notes: formData.notes,
    }

    setSessions([...sessions, newSession])
    setFormData({ subject: '', startTime: '', endTime: '', notes: '' })
    setShowForm(false)
  }

  const deleteSession = (id: string) => {
    setSessions(sessions.filter((s) => s.id !== id))
  }

  const daysSessions = sessions.filter((s) => s.day === selectedDay).sort((a, b) => {
    return a.startTime.localeCompare(b.startTime)
  })

  const getTotalStudyTime = () => {
    return daysSessions.reduce((total, session) => {
      const start = new Date(`2000-01-01 ${session.startTime}`)
      const end = new Date(`2000-01-01 ${session.endTime}`)
      const diff = (end.getTime() - start.getTime()) / (1000 * 60)
      return total + diff
    }, 0)
  }

  const totalMinutes = getTotalStudyTime()
  const hours = Math.floor(totalMinutes / 60)
  const minutes = Math.floor(totalMinutes % 60)

  return (
    <div className="min-h-screen bg-surface-base">
      <nav className="border-b border-white/5 bg-surface-elevated/50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-sm text-[#8B97B5] hover:text-white"
          >
            <ArrowLeft size={16} />
            Back
          </button>
          <div className="flex items-center gap-1">
            <span className="font-sora font-bold text-xl text-white">STUDIA</span>
            <sup className="text-brand-blue text-xs">β</sup>
          </div>
          <div className="w-20" />
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
          <div>
            <h1 className="font-sora font-bold text-4xl text-white mb-2">Study Planner</h1>
            <p className="text-[#8B97B5]">Plan your weekly study sessions and stay organized.</p>
          </div>

          <div className="bg-surface-elevated border border-white/5 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-sora font-bold text-xl text-white">Select a Day</h2>
              {!showForm && (
                <button
                  onClick={() => setShowForm(true)}
                  className="bg-brand-blue text-white px-4 py-2 rounded-lg hover:bg-brand-blue/90 flex items-center gap-2 text-sm font-medium"
                >
                  <Plus size={16} />
                  Add Session
                </button>
              )}
            </div>

            <div className="grid grid-cols-7 gap-2">
              {DAYS.map((day) => (
                <button
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  className={`p-3 rounded-lg text-sm font-medium transition-all ${
                    selectedDay === day
                      ? 'bg-brand-blue text-white'
                      : 'bg-surface-base text-[#8B97B5] hover:bg-surface-base/80'
                  }`}
                >
                  {day.slice(0, 3)}
                </button>
              ))}
            </div>
          </div>

          {daysSessions.length > 0 && (
            <div className="bg-gradient-to-r from-brand-blue/10 to-brand-blue/5 border border-brand-blue/20 rounded-2xl p-6">
              <div className="flex items-center gap-3">
                <Clock className="text-brand-blue" size={24} />
                <div>
                  <p className="text-[#8B97B5] text-sm">Total study time</p>
                  <p className="font-sora font-bold text-white text-2xl">
                    {hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`}
                  </p>
                </div>
              </div>
            </div>
          )}

          {showForm && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-surface-elevated border border-white/5 rounded-2xl p-6 space-y-4"
            >
              <h3 className="font-sora font-bold text-xl text-white mb-4">Add Study Session - {selectedDay}</h3>

              <input
                type="text"
                placeholder="Subject (e.g., Mathematics, Physics)"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className="w-full bg-surface-base border border-white/10 rounded-xl p-3 text-white placeholder-[#4A5568] outline-none focus:border-brand-blue/40"
              />

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-white mb-2">Start time</label>
                  <input
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    className="w-full bg-surface-base border border-white/10 rounded-xl p-3 text-white outline-none focus:border-brand-blue/40"
                  />
                </div>
                <div>
                  <label className="block text-sm text-white mb-2">End time</label>
                  <input
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    className="w-full bg-surface-base border border-white/10 rounded-xl p-3 text-white outline-none focus:border-brand-blue/40"
                  />
                </div>
              </div>

              <textarea
                placeholder="Notes (optional)"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full h-24 bg-surface-base border border-white/10 rounded-xl p-3 text-white placeholder-[#4A5568] outline-none focus:border-brand-blue/40 resize-none"
              />

              <div className="flex gap-2">
                <button
                  onClick={addSession}
                  className="flex-1 bg-brand-blue text-white font-medium py-3 rounded-xl hover:bg-brand-blue/90"
                >
                  Save Session
                </button>
                <button
                  onClick={() => {
                    setShowForm(false)
                    setFormData({ subject: '', startTime: '', endTime: '', notes: '' })
                  }}
                  className="flex-1 bg-surface-base text-[#8B97B5] font-medium py-3 rounded-xl hover:bg-surface-base/80"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          )}

          {daysSessions.length > 0 ? (
            <div className="space-y-3">
              <h3 className="font-sora font-bold text-xl text-white">{selectedDay}'s Schedule</h3>
              {daysSessions.map((session, i) => (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-surface-elevated border border-white/5 rounded-2xl p-6 hover:border-brand-blue/30 transition-all"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-sora font-bold text-white">{session.subject}</p>
                      <p className="text-sm text-brand-blue">
                        {session.startTime} - {session.endTime}
                      </p>
                    </div>
                    <button
                      onClick={() => deleteSession(session.id)}
                      className="p-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                  {session.notes && <p className="text-sm text-[#8B97B5]">{session.notes}</p>}
                </motion.div>
              ))}
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-surface-elevated border border-white/5 rounded-2xl p-12 text-center"
            >
              <p className="text-white font-medium mb-2">No study sessions for {selectedDay}</p>
              <p className="text-[#8B97B5]">Add a study session to get started!</p>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
