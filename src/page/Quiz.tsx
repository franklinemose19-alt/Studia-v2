import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Loader, RotateCcw, Save, Check, BookOpen, Upload, FileText } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface Question {
  question: string
  options: string[]
  correct: number
  topic?: string
}

interface Unit {
  id: string
  course: string
  unitName: string
  topics: string[]
}

interface NoteItem {
  id: string
  title: string
  content: string
  course?: string
  date: string
}

interface RecordingItem {
  id: string
  name: string
  course?: string
  unit?: string
  notes?: string
  transcript?: string
}

const selectClass = "w-full bg-surface-base border border-white/10 rounded-xl p-3 text-white outline-none focus:border-brand-blue/40 text-sm [&>option]:bg-[#0d1526] [&>option]:text-white"

export default function Quiz() {
  const navigate = useNavigate()

  const [units, setUnits] = useState<Unit[]>([])
  const [notes, setNotes] = useState<NoteItem[]>([])
  const [recordings, setRecordings] = useState<RecordingItem[]>([])

  const [selectedCourse, setSelectedCourse] = useState('')
  const [selectedUnit, setSelectedUnit] = useState('')

  const [manualNotes, setManualNotes] = useState('')
  const [quizzes, setQuizzes] = useState<Question[]>([])
  const [answers, setAnswers] = useState<number[]>([])
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [savedToVault, setSavedToVault] = useState(false)
  const [isPdfLoading, setIsPdfLoading] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    try { setUnits(JSON.parse(localStorage.getItem('units') || '[]')) } catch { setUnits([]) }
    try { setNotes(JSON.parse(localStorage.getItem('notes') || '[]')) } catch { setNotes([]) }
    try { setRecordings(JSON.parse(localStorage.getItem('recordingsMetadata') || '[]')) } catch { setRecordings([]) }
  }, [])

  const courseNames = Array.from(new Set(units.map((u) => u.course))).filter(Boolean)
  const filteredUnits = units.filter((u) => u.course === selectedCourse)
  const selectedUnitData = units.find((u) => u.id === selectedUnit)

  const relevantNotes = selectedCourse ? notes.filter((n) => n.course === selectedCourse) : []
  const relevantRecordings = selectedUnitData
    ? recordings.filter((r) => r.course === selectedCourse && r.unit === selectedUnitData.unitName && (r.notes || r.transcript))
    : []

  const buildUnitContent = (): string => {
    if (!selectedUnitData) return ''
    let content = `Course: ${selectedCourse}\nUnit: ${selectedUnitData.unitName}\nSyllabus Topics: ${selectedUnitData.topics.join(', ')}\n\n`
    if (relevantNotes.length > 0) {
      content += '--- Saved Notes ---\n'
      relevantNotes.forEach((n) => { content += `${n.title}\n${n.content}\n\n` })
    }
    if (relevantRecordings.length > 0) {
      content += '--- Lecture Notes ---\n'
      relevantRecordings.forEach((r) => { content += `${r.name}\n${r.notes || r.transcript || ''}\n\n` })
    }
    return content.slice(0, 10000)
  }

  const runGenerateQuiz = async (text: string) => {
    setLoading(true)
    try {
      const res = await fetch('/api/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      const data = await res.json()
      if (data.quizzes && data.quizzes.length > 0) {
        setQuizzes(data.quizzes)
        setAnswers(new Array(data.quizzes.length).fill(-1))
        setSubmitted(false)
        setSavedToVault(false)
      } else {
        alert('Error: ' + (data.error || 'Failed to generate quiz'))
      }
    } catch (err) {
      alert('Error: ' + (err instanceof Error ? err.message : 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  const generateFromUnit = () => {
    if (!selectedUnit) { alert('Please select a unit first'); return }
    const content = buildUnitContent()
    if (!content.trim() || (relevantNotes.length === 0 && relevantRecordings.length === 0)) {
      alert('No notes or recordings found for this unit yet. Try pasting notes manually below, or record/save notes first.')
      return
    }
    runGenerateQuiz(content)
  }

  const generateFromManual = () => {
    if (!manualNotes.trim()) { alert('Please paste your lecture notes'); return }
    runGenerateQuiz(manualNotes)
  }

  const uploadPastPaper = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.type !== 'application/pdf') {
      alert('Please upload a PDF file.')
      return
    }

    setIsPdfLoading(true)
    const reader = new FileReader()
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1]
      const courseContext = selectedUnitData ? `${selectedCourse} — ${selectedUnitData.unitName}` : undefined

      setLoading(true)
      try {
        const res = await fetch('/api/quiz', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pdfBase64: base64, courseContext }),
        })
        const data = await res.json()
        if (data.quizzes && data.quizzes.length > 0) {
          setQuizzes(data.quizzes)
          setAnswers(new Array(data.quizzes.length).fill(-1))
          setSubmitted(false)
          setSavedToVault(false)
        } else {
          alert('Error: ' + (data.error || 'Could not extract questions from this paper'))
        }
      } catch (err) {
        alert('Error: ' + (err instanceof Error ? err.message : 'Unknown error'))
      } finally {
        setLoading(false)
        setIsPdfLoading(false)
      }
    }
    reader.onerror = () => {
      setIsPdfLoading(false)
      alert('Failed to read PDF file.')
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const saveQuizResult = () => {
    try {
      let correct = 0
      quizzes.forEach((q, i) => { if (answers[i] === q.correct) correct++ })
      const results = JSON.parse(localStorage.getItem('quizResults') || '[]')
      const subject = selectedUnitData ? `${selectedCourse} — ${selectedUnitData.unitName}` : (selectedCourse || 'General')
      const attempt = {
        id: `attempt-${Date.now()}`,
        subject,
        score: correct,
        total: quizzes.length,
        date: new Date().toISOString(),
        questions: quizzes.map((q, i) => ({
          topic: q.topic || subject,
          correct: answers[i] === q.correct,
        })),
      }
      localStorage.setItem('quizResults', JSON.stringify([attempt, ...results]))
    } catch (err) {
      console.error('Failed to save quiz result', err)
    }
  }

  const submitQuiz = () => {
    if (answers.some((a) => a === -1)) { alert('Please answer all questions'); return }
    setSubmitted(true)
    saveQuizResult()
  }

  const calculateScore = () => {
    let correct = 0
    quizzes.forEach((q, i) => { if (answers[i] === q.correct) correct++ })
    return { correct, total: quizzes.length, percentage: Math.round((correct / quizzes.length) * 100) }
  }

  const resetQuiz = () => {
    setQuizzes([])
    setAnswers([])
    setSubmitted(false)
    setManualNotes('')
    setSavedToVault(false)
  }

  const saveQuizToVault = () => {
    try {
      const saved = JSON.parse(localStorage.getItem('savedQuizzes') || '[]')
      const newQuiz = {
        id: `quiz-${Date.now()}`,
        title: selectedUnitData ? `${selectedUnitData.unitName} Quiz` : `Quiz - ${new Date().toLocaleDateString()}`,
        questions: quizzes,
        date: new Date().toLocaleDateString(),
      }
      localStorage.setItem('savedQuizzes', JSON.stringify([newQuiz, ...saved]))
      setSavedToVault(true)
    } catch {
      alert('Could not save quiz.')
    }
  }

  const score = submitted ? calculateScore() : null

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
            <h1 className="font-sora font-bold text-4xl text-white mb-2">Generate Quiz</h1>
            <p className="text-[#8B97B5]">Pick a unit, upload a past paper, or paste notes — STUDIA builds your quiz.</p>
          </div>

          {quizzes.length === 0 ? (
            <div className="space-y-6">
              {/* Unit-based generation */}
              <div className="bg-surface-elevated border border-white/5 rounded-2xl p-6 space-y-4">
                <h2 className="font-sora font-bold text-xl text-white flex items-center gap-2">
                  <BookOpen size={20} className="text-brand-blue" /> Generate From Your Units
                </h2>

                {units.length === 0 ? (
                  <div className="bg-surface-base rounded-xl p-5 text-center space-y-3">
                    <p className="text-sm text-[#8B97B5]">No units yet. Add your courses and units in Unit Management first.</p>
                    <button onClick={() => navigate('/units')} className="bg-brand-blue text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-brand-blue/90">
                      Go to Unit Management
                    </button>
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm text-white mb-2">Select Course</label>
                      <select value={selectedCourse} onChange={(e) => { setSelectedCourse(e.target.value); setSelectedUnit('') }} className={selectClass}>
                        <option value="">Choose a course…</option>
                        {courseNames.map((name) => <option key={name} value={name}>{name}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm text-white mb-2">Select Unit</label>
                      <select value={selectedUnit} onChange={(e) => setSelectedUnit(e.target.value)} className={selectClass} disabled={!selectedCourse}>
                        <option value="">Choose a unit…</option>
                        {filteredUnits.map((u) => <option key={u.id} value={u.id}>{u.unitName}</option>)}
                      </select>
                    </div>

                    {selectedUnitData && (
                      <div className="bg-surface-base rounded-xl p-4 text-sm text-[#8B97B5] space-y-1">
                        <p>📝 {relevantNotes.length} saved note{relevantNotes.length !== 1 ? 's' : ''} for {selectedCourse}</p>
                        <p>🎙️ {relevantRecordings.length} lecture recording{relevantRecordings.length !== 1 ? 's' : ''} for {selectedUnitData.unitName}</p>
                        <p className="text-xs pt-1 border-t border-white/5 mt-2">Syllabus topics: {selectedUnitData.topics.join(', ')}</p>
                      </div>
                    )}

                    <button
                      onClick={generateFromUnit}
                      disabled={loading || !selectedUnit}
                      className="w-full bg-brand-blue text-white font-medium py-3 rounded-xl hover:bg-brand-blue/90 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {loading ? (<><Loader className="w-4 h-4 animate-spin" /> Generating Quiz...</>) : 'Generate Quiz From This Unit'}
                    </button>
                  </>
                )}
              </div>

              {/* Past paper upload */}
              <div className="bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border border-purple-500/20 rounded-2xl p-6 space-y-4">
                <h2 className="font-sora font-bold text-lg text-white flex items-center gap-2">
                  <FileText size={20} className="text-purple-400" /> Generate From a Past Paper
                </h2>
                <p className="text-sm text-[#8B97B5]">Upload a real past exam paper PDF — STUDIA extracts the actual questions and converts them into a practice quiz matching the real exam style.</p>

                <input ref={fileInputRef} type="file" accept="application/pdf" onChange={uploadPastPaper} className="hidden" />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading || isPdfLoading}
                  className="w-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-medium py-3 rounded-xl hover:bg-purple-500/30 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isPdfLoading ? (<><Loader className="w-4 h-4 animate-spin" /> Analyzing past paper...</>) : (<><Upload size={18} /> Upload Past Paper (PDF)</>)}
                </button>
              </div>

              {/* Manual fallback */}
              <div className="bg-surface-elevated border border-white/5 rounded-2xl p-6 space-y-4">
                <h2 className="font-sora font-bold text-lg text-white">Or Paste Notes Manually</h2>
                <textarea
                  value={manualNotes}
                  onChange={(e) => setManualNotes(e.target.value)}
                  placeholder="Paste lecture notes here..."
                  className="w-full h-48 bg-surface-base border border-white/10 rounded-xl p-4 text-white placeholder-[#4A5568] outline-none focus:border-brand-blue/40 resize-none"
                />
                <button
                  onClick={generateFromManual}
                  disabled={loading || !manualNotes.trim()}
                  className="w-full bg-surface-base border border-brand-blue/30 text-brand-blue font-medium py-3 rounded-xl hover:bg-surface-base/80 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (<><Loader className="w-4 h-4 animate-spin" /> Generating...</>) : 'Generate From Pasted Notes'}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {!submitted ? (
                <>
                  {quizzes.map((q, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                      className="bg-surface-elevated border border-white/5 rounded-2xl p-6">
                      <p className="text-white font-medium mb-4">Q{i + 1}. {q.question}</p>
                      <div className="space-y-2">
                        {q.options.map((option, j) => (
                          <label key={j} className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-surface-base transition-all">
                            <input type="radio" name={`q${i}`} checked={answers[i] === j}
                              onChange={() => { const a = [...answers]; a[i] = j; setAnswers(a) }}
                              className="w-4 h-4 accent-brand-blue cursor-pointer" />
                            <span className="text-[#8B97B5] text-sm">{option}</span>
                          </label>
                        ))}
                      </div>
                    </motion.div>
                  ))}

                  <div className="flex gap-3">
                    <button onClick={submitQuiz} className="flex-1 bg-brand-blue text-white font-medium py-3 rounded-xl hover:bg-brand-blue/90">
                      Submit Quiz
                    </button>
                    <button onClick={saveQuizToVault} disabled={savedToVault}
                      className="flex items-center gap-2 bg-surface-elevated border border-white/10 text-white px-5 py-3 rounded-xl hover:border-brand-blue/40 disabled:opacity-60 text-sm font-medium">
                      {savedToVault ? (<><Check size={16} className="text-green-400" /> Saved</>) : (<><Save size={16} /> Save to Vault</>)}
                    </button>
                  </div>
                </>
              ) : (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
                  <div className="bg-gradient-to-r from-brand-blue/10 to-brand-blue/5 border border-brand-blue/20 rounded-2xl p-8 text-center">
                    <p className="text-6xl font-bold text-brand-blue mb-2">{score?.percentage}%</p>
                    <p className="text-xl text-white font-sora font-bold mb-1">{score?.correct} out of {score?.total} correct</p>
                    <p className="text-[#8B97B5]">Great effort! Keep studying to improve your score.</p>
                  </div>

                  {quizzes.map((q, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                      className={`rounded-2xl p-6 border ${answers[i] === q.correct ? 'bg-brand-green/10 border-brand-green/30' : 'bg-red-500/10 border-red-500/30'}`}>
                      <p className="text-white font-medium mb-3">Q{i + 1}. {q.question}</p>
                      <div className="space-y-2">
                        {q.options.map((option, j) => (
                          <div key={j} className={`p-3 rounded-lg text-sm ${
                            j === q.correct ? 'bg-brand-green/20 text-brand-green border border-brand-green/30'
                            : j === answers[i] ? 'bg-red-500/20 text-red-500 border border-red-500/30'
                            : 'bg-surface-base text-[#8B97B5]'
                          }`}>
                            {option}
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  ))}

                  <div className="flex gap-3">
                    <button onClick={resetQuiz} className="flex-1 bg-brand-blue text-white font-medium py-3 rounded-xl hover:bg-brand-blue/90 flex items-center justify-center gap-2">
                      <RotateCcw size={16} /> Try Another Quiz
                    </button>
                    <button onClick={saveQuizToVault} disabled={savedToVault}
                      className="flex items-center gap-2 bg-surface-elevated border border-white/10 text-white px-5 py-3 rounded-xl hover:border-brand-blue/40 disabled:opacity-60 text-sm font-medium">
                      {savedToVault ? (<><Check size={16} className="text-green-400" /> Saved</>) : (<><Save size={16} /> Save to Vault</>)}
                    </button>
                  </div>
                </motion.div>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
