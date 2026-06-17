import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Trash2, Plus, Calendar, Upload, Loader, CheckCircle2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface Exam {
  id: string
  course: string
  unit?: string
  date: string
  time?: string
  venue?: string
  daysLeft: number
}

interface SavedCourse {
  id: string
  name: string
  units: string[]
}

export default function ExamCountdown() {
  const navigate = useNavigate()
  const [exams, setExams] = useState<Exam[]>([])
  const [courseName, setCourseName] = useState('')
  const [examDate, setExamDate] = useState('')

  const [isParsing, setIsParsing] = useState(false)
  const [parseStatus, setParseStatus] = useState('')
  const [unmatchedExams, setUnmatchedExams] = useState<any[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const saved = localStorage.getItem('exams')
    if (saved) {
      try { setExams(updateDaysLeft(JSON.parse(saved))) } catch { setExams([]) }
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('exams', JSON.stringify(exams))
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
    const newExam: Exam = { id: `exam-${Date.now()}`, course: courseName, date: examDate, daysLeft: 0 }
    setExams(updateDaysLeft([...exams, newExam]))
    setCourseName('')
    setExamDate('')
  }

  const deleteExam = (id: string) => setExams(exams.filter((e) => e.id !== id))

  // ── PDF upload + auto-match ──────────────────────────────────────────

  const getSavedCourses = (): SavedCourse[] => {
  try {
    const units = JSON.parse(localStorage.getItem('units') || '[]')
    const grouped: { [key: string]: Set<string> } = {}
    units.forEach((u: any) => {
      if (!grouped[u.course]) grouped[u.course] = new Set()
      grouped[u.course].add(u.unitName)
    })
    return Object.entries(grouped).map(([name, unitSet], i) => ({
      id: `course-${i}`,
      name,
      units: Array.from(unitSet),
    }))
  } catch {
    return []
  }
}

  const matchesSavedCourses = (exam: any, courses: SavedCourse[]) => {
    if (!courses.length) return true
    const courseNames = courses.map((c) => c.name.toLowerCase())
    const unitNames = courses.flatMap((c) => (c.units || []).map((u) => u.toLowerCase()))
    const examCourse = (exam.course || '').toLowerCase()
    const examUnit = (exam.unit || '').toLowerCase()
    return (
      courseNames.some((n) => examCourse.includes(n) || n.includes(examCourse)) ||
      unitNames.some((n) => examUnit.includes(n) || n.includes(examUnit) || examCourse.includes(n))
    )
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.type !== 'application/pdf') {
      alert('Please upload a PDF file.')
      return
    }

    setIsParsing(true)
    setParseStatus('📄 Reading your timetable...')
    setUnmatchedExams([])

    try {
      const reader = new FileReader()
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1]
        const courses = getSavedCourses()

        setParseStatus('🤖 AI is finding your exams...')

        const response = await fetch('/api/parse-timetable', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pdfBase64: base64, courses }),
        })

        const data = await response.json()

        if (!response.ok || !data.exams) {
          setParseStatus('⚠️ Could not read exams from this PDF.')
          setIsParsing(false)
          return
        }

        const matched = data.exams.filter((ex: any) => matchesSavedCourses(ex, courses))
        const rest = data.exams.filter((ex: any) => !matchesSavedCourses(ex, courses))

        if (matched.length > 0) {
          const newExams: Exam[] = matched.map((ex: any) => ({
            id: `exam-${Date.now()}-${Math.random()}`,
            course: ex.course,
            unit: ex.unit,
            date: ex.date,
            time: ex.time,
            venue: ex.venue,
            daysLeft: 0,
          }))
          setExams((prev) => updateDaysLeft([...prev, ...newExams]))
          setParseStatus(`✅ Found and added ${matched.length} exam${matched.length !== 1 ? 's' : ''} matching your courses!`)
        } else if (data.exams.length > 0) {
          setParseStatus(`We found ${data.exams.length} exam(s), but none matched your saved courses. Review below:`)
        } else {
          setParseStatus('⚠️ No exams found in this PDF.')
        }

        setUnmatchedExams(rest)
        setIsParsing(false)
      }
      reader.readAsDataURL(file)
    } catch (err) {
      console.error(err)
      setParseStatus('⚠️ Something went wrong reading the PDF.')
      setIsParsing(false)
    }
  }

  const addUnmatchedExam = (ex: any) => {
    const newExam: Exam = {
      id: `exam-${Date.now()}-${Math.random()}`,
      course: ex.course,
      unit: ex.unit,
      date: ex.date,
      time: ex.time,
      venue: ex.venue,
      daysLeft: 0,
    }
    setExams((prev) => updateDaysLeft([...prev, newExam]))
    setUnmatchedExams((prev) => prev.filter((e) => e !== ex))
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
          <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-sm text-[#8B97B5] hover:text-white">
            <ArrowLeft size={16} /> Back
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
            <p className="text-[#8B97B5]">Upload your timetable — STUDIA finds your exams automatically.</p>
          </div>

          {/* PDF Upload */}
          <div className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-2xl p-6 space-y-4">
            <h2 className="font-sora font-bold text-xl text-white flex items-center gap-2">
              <Upload size={20} className="text-brand-blue" /> Upload Exam Timetable
            </h2>
            <p className="text-sm text-[#8B97B5]">Upload the official PDF timetable. STUDIA matches it to your saved courses and units automatically.</p>

            <input ref={fileInputRef} type="file" accept="application/pdf" onChange={handleFileUpload} className="hidden" />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isParsing}
              className="w-full bg-brand-blue text-white font-semibold py-3 rounded-xl hover:bg-brand-blue/90 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isParsing ? <Loader size={18} className="animate-spin" /> : <Upload size={18} />}
              {isParsing ? 'Processing...' : 'Upload PDF Timetable'}
            </button>

            {parseStatus && (
              <p className={`text-sm text-center ${parseStatus.startsWith('✅') ? 'text-green-400' : 'text-amber-400'}`}>
                {parseStatus}
              </p>
            )}
          </div>

          {/* Unmatched exams fallback */}
          <AnimatePresence>
            {unmatchedExams.length > 0 && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                className="bg-surface-elevated border border-white/5 rounded-2xl p-6 space-y-3 overflow-hidden">
                <p className="text-sm font-semibold text-white">Other exams found in this PDF:</p>
                {unmatchedExams.map((ex, i) => (
                  <div key={i} className="flex items-center justify-between bg-surface-base rounded-xl p-3">
                    <div>
                      <p className="text-white text-sm font-medium">{ex.course}{ex.unit && ` — ${ex.unit}`}</p>
                      <p className="text-xs text-[#8B97B5]">{ex.date} {ex.time}</p>
                    </div>
                    <button onClick={() => addUnmatchedExam(ex)} className="text-xs bg-brand-blue/10 text-brand-blue px-3 py-1.5 rounded-lg hover:bg-brand-blue/20">
                      Add
                    </button>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Manual add fallback */}
          <div className="bg-surface-elevated border border-white/5 rounded-2xl p-6 space-y-4">
            <h2 className="font-sora font-bold text-xl text-white">Or Add Manually</h2>
            <div className="space-y-3">
              <input type="text" placeholder="Course name (e.g., Mathematics, Physics)" value={courseName}
                onChange={(e) => setCourseName(e.target.value)}
                className="w-full bg-surface-base border border-white/10 rounded-xl p-3 text-white placeholder-[#4A5568] outline-none focus:border-brand-blue/40" />
              <input type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)}
                className="w-full bg-surface-base border border-white/10 rounded-xl p-3 text-white outline-none focus:border-brand-blue/40" />
              <button onClick={addExam} className="w-full bg-surface-base border border-brand-blue/30 text-brand-blue font-medium py-3 rounded-xl hover:bg-surface-base/80 flex items-center justify-center gap-2">
                <Plus size={20} /> Add Exam
              </button>
            </div>
          </div>

          {sortedExams.length > 0 ? (
            <div className="space-y-4">
              <h2 className="font-sora font-bold text-2xl text-white">Your Exams</h2>
              {sortedExams.map((exam, i) => (
                <motion.div key={exam.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                  className={`rounded-2xl p-6 border ${exam.daysLeft <= 3 ? 'bg-red-500/10 border-red-500/20' : exam.daysLeft <= 7 ? 'bg-amber-500/10 border-amber-500/20' : 'bg-surface-elevated border-white/5'}`}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <p className="font-sora font-bold text-2xl text-white">{exam.course}</p>
                      {exam.unit && <p className="text-sm text-brand-blue">{exam.unit}</p>}
                      <p className="text-sm text-[#8B97B5] flex items-center gap-2 mt-1">
                        <Calendar size={14} /> {new Date(exam.date).toLocaleDateString()} {exam.time && `· ${exam.time}`}
                      </p>
                      {exam.venue && <p className="text-xs text-[#8B97B5] mt-1">📍 {exam.venue}</p>}
                    </div>
                    <button onClick={() => deleteExam(exam.id)} className="p-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20">
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
                    <div className="bg-gradient-to-r from-brand-blue to-brand-green h-2 rounded-full transition-all"
                      style={{ width: `${Math.max(0, Math.min(100, (30 - exam.daysLeft) / 0.3))}%` }} />
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-surface-elevated border border-white/5 rounded-2xl p-12 text-center">
              <Calendar size={48} className="mx-auto text-[#4A5568] mb-4" />
              <p className="text-white font-medium mb-2">No exams added yet</p>
              <p className="text-[#8B97B5]">Upload your timetable PDF above, or add one manually!</p>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
