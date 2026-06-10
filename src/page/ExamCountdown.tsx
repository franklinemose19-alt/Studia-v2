import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Trash2, Plus, Calendar } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface Exam {
  id: string
  course: string
  date: string
  daysLeft: number
}

export default function ExamCountdown() {
  const navigate = useNavigate()
  const [exams, setExams] = useState<Exam[]>([])
  const [courseName, setCourseName] = useState('')
  const [examDate, setExamDate] = useState('')

  useEffect(() => {
    const saved = localStorage.getItem('exams')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setExams(updateDaysLeft(parsed))
      } catch {
        setExams([])
      }
    }
  }, [])

  useEffect(() => {
    if (exams.length > 0) {
      localStorage.setItem('exams', JSON.stringify(exams))
    }
  }, [exams])

  const updateDaysLeft = (examList: any[]) => {
    return examList.map((exam) => {
      const today = new Date()
      const examD = new Date(exam.date)
      const diff = Math.ceil((examD.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      return { ...exam, daysLeft: diff }
    })
  }

  const addExam = () => {
    if (!courseName.trim() || !examDate) {
      alert('Please fill in all fields')
      return
    }

    const newExam: Exam = {
      id: `exam-${Date.now()}`,
      course: courseName,
      date: examDate,
      daysLeft: 0,
    }

    const updated = updateDaysLeft([...exams, newExam])
    setExams(updated)
    setCourseName('')
    setExamDate('')
  }

  const deleteExam = (id: string) => {
    setExams(exams.filter((e) => e.id !== id))
  }

  const getMotivation = (daysLeft: number) => {
    if (daysLeft <= 0) return '🎉 Exam day!'
    if (daysLeft <= 3) return '🔥 Final push! You got this!'
    if (daysLeft <= 7) return '💪 One week to go!'
    if (daysLeft <= 14) return '📚 Keep studying smart!'
    return '✨ Start preparing now!'
  }

  const sortedExams = [...exams].sort((a, b) => a.daysLeft - b.daysLeft)

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

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
          <div>
            <h1 className="font-sora font-bold text-4xl text-white mb-2">Exam Countdown</h1>
            <p className="text-[#8B97B5]">Track your upcoming exams and stay motivated!</p>
          </div>

          <div className="bg-surface-elevated border border-white/5 rounded-2xl p-6 space-y-4">
            <h2 className="font-sora font-bold text-xl text-white">Add New Exam</h2>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Course name (e.g., Mathematics, Physics)"
                value={courseName}
                onChange={(e) => setCourseName(e.target.value)}
                className="w-full bg-surface-base border border-white/10 rounded-xl p-3 text-white placeholder-[#4A5568] outline-none focus:border-brand-blue/40"
              />
              <input
                type="date"
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                className="w-full bg-surface-base border border-white/10 rounded-xl p-3 text-white outline-none focus:border-brand-blue/40"
              />
              <button
                onClick={addExam}
                className="w-full bg-brand-blue text-white font-medium py-3 rounded-xl hover:bg-brand-blue/90 flex items-center justify-center gap-2"
              >
                <Plus size={20} />
                Add Exam
              </button>
            </div>
          </div>

          {sortedExams.length > 0 ? (
            <div className="space-y-4">
              <h2 className="font-sora font-bold text-2xl text-white">Your Exams</h2>
              {sortedExams.map((exam, i) => (
                <motion.div
                  key={exam.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className={`rounded-2xl p-6 border ${
                    exam.daysLeft <= 3
                      ? 'bg-red-500/10 border-red-500/20'
                      : exam.daysLeft <= 7
                      ? 'bg-amber-500/10 border-amber-500/20'
                      : 'bg-surface-elevated border-white/5'
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <p className="font-sora font-bold text-2xl text-white">{exam.course}</p>
                      <p className="text-sm text-[#8B97B5] flex items-center gap-2 mt-1">
                        <Calendar size={14} />
                        {new Date(exam.date).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={() => deleteExam(exam.id)}
                      className="p-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-end gap-2">
                      <p className="text-6xl font-bold text-brand-blue">{exam.daysLeft}</p>
                      <p className="text-[#8B97B5] mb-2">{exam.daysLeft === 1 ? 'day' : 'days'} left</p>
                    </div>
                    <p className="text-lg font-medium text-white">{getMotivation(exam.daysLeft)}</p>
                  </div>

                  <div className="mt-4 w-full bg-surface-base rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-brand-blue to-brand-green h-2 rounded-full transition-all"
                      style={{ width: `${Math.max(0, Math.min(100, (30 - exam.daysLeft) / 0.3))}%` }}
                    />
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-surface-elevated border border-white/5 rounded-2xl p-12 text-center"
            >
              <Calendar size={48} className="mx-auto text-[#4A5568] mb-4" />
              <p className="text-white font-medium mb-2">No exams added yet</p>
              <p className="text-[#8B97B5]">Add your first exam to start tracking!</p>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
