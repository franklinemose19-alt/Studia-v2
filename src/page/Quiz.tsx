import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Loader, Upload, FileText, ClipboardList, Check, X, RotateCcw, BookOpen } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { loadAccess, explorerLecturesRemaining, isUnlimitedPlan, type AccessInfo, emptyAccess } from '../lib/access'
import { authFetch } from '../lib/authFetch'
import { getAllRecordings } from '../lib/lectureContext'
import { saveQuizResult } from '../lib/quizHistory'
import { toast } from '../lib/toast'

interface Question { question: string; options: string[]; correct: number; topic: string }
type InputMode = 'lecture' | 'paste' | 'pdf'
type Screen = 'setup' | 'quiz' | 'results'

export default function Quiz() {
  const navigate = useNavigate()
  const { userId } = useAuth()
  const fileRef = useRef<HTMLInputElement>(null)

  const [access, setAccess] = useState<AccessInfo>(emptyAccess)
  const [accessLoaded, setAccessLoaded] = useState(false)

  const [screen, setScreen] = useState<Screen>('setup')
  const [inputMode, setInputMode] = useState<InputMode>('lecture')
  const [selectedLectureId, setSelectedLectureId] = useState('')
  const [pastedText, setPastedText] = useState('')
  const [pdfBase64, setPdfBase64] = useState<string | null>(null)
  const [pdfName, setPdfName] = useState('')
  const [loading, setLoading] = useState(false)

  const [questions, setQuestions] = useState<Question[]>([])
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [currentQ, setCurrentQ] = useState(0)
  const [submitted, setSubmitted] = useState(false)
  const [score, setScore] = useState(0)

  const [recordings] = useState(() => getAllRecordings())

  useEffect(() => {
    loadAccess(userId).then(a => { setAccess(a); setAccessLoaded(true) })
  }, [userId])

  const handlePDFUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.name.endsWith('.pdf')) { toast.error('Please upload a PDF file'); return }
    setPdfName(file.name)
    const reader = new FileReader()
    reader.onload = ev => setPdfBase64((ev.target?.result as string).split(',')[1])
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const getSourceContent = () => {
    if (inputMode === 'lecture') {
      const rec = recordings.find(r => r.id === selectedLectureId)
      if (!rec) return null
      return { text: (rec.notes || '') + '\n\n' + (rec.transcript || ''), course: rec.course }
    }
    if (inputMode === 'paste') return { text: pastedText, course: '' }
    if (inputMode === 'pdf') return { text: '', course: '', pdf: pdfBase64 }
    return null
  }

  const generateQuiz = async () => {
    const source = getSourceContent()
    if (!source) { toast.error('Please select a lecture or provide content first'); return }
    if (inputMode === 'lecture' && !source.text.trim()) { toast.error('This lecture has no notes or transcript yet. Record and process it first.'); return }
    if (inputMode === 'paste' && !pastedText.trim()) { toast.error('Please paste your lecture notes'); return }
    if (inputMode === 'pdf' && !pdfBase64) { toast.error('Please upload a PDF past paper'); return }

    setLoading(true)
    try {
      const body: any = {}
      if (inputMode === 'pdf') { body.pdfBase64 = pdfBase64; body.courseContext = '' }
      else { body.text = source.text; body.courseContext = source.course || '' }

      const res = await authFetch('/api/quiz', { method: 'POST', body: JSON.stringify(body) })

      if (res.status === 402) {
        const err = await res.json()
        toast.error(err.error)
        navigate('/pricing')
        return
      }
      if (res.status === 401) { toast.error('Your session expired — please sign in again.'); return }
      if (!res.ok) {
        const err = await res.json()
        toast.error(res.status === 429 ? (err.error || 'Too many requests — please wait a moment.') : (err.error || 'Failed to generate quiz'))
        return
      }

      const data = await res.json()
      if (!data.quizzes?.length) { toast.error('Could not generate quiz from this content. Try adding more detailed notes.'); return }

      setQuestions(data.quizzes)
      setAnswers({}); setCurrentQ(0); setSubmitted(false); setScore(0)
      setScreen('quiz')
      setAccess(await loadAccess(userId))
    } catch {
      toast.error('Failed to generate quiz — check your connection.')
    } finally {
      setLoading(false)
    }
  }

  const selectAnswer = (qIdx: number, ansIdx: number) => {
    if (submitted) return
    setAnswers(prev => ({ ...prev, [qIdx]: ansIdx }))
  }

  const submitQuiz = () => {
    const correct = questions.filter((q, i) => answers[i] === q.correct).length
    setScore(correct)
    setSubmitted(true)
    setScreen('results')

    const rec = recordings.find(r => r.id === selectedLectureId)
    const questionOutcomes = questions.map((q, i) => ({ topic: q.topic || 'General', correct: answers[i] === q.correct }))
    saveQuizResult({
      subject: rec?.course || 'General', score: correct, total: questions.length,
      source: inputMode === 'pdf' ? 'past_paper' : 'notes', questions: questionOutcomes, userId,
    })

    const pct = Math.round((correct / questions.length) * 100)
    if (pct >= 80) toast.success(`Excellent! ${correct}/${questions.length} — ${pct}% 🎉`)
    else if (pct >= 60) toast.info(`Good effort! ${correct}/${questions.length} — ${pct}%`)
    else toast.info(`${correct}/${questions.length} — Review your notes and try again 📚`)
  }

  const resetQuiz = () => {
    setScreen('setup'); setQuestions([]); setAnswers({}); setSubmitted(false); setScore(0)
    setPastedText(''); setPdfBase64(null); setPdfName('')
  }

  const pct = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0
  const remaining = explorerLecturesRemaining(access)
  const minutesLeft = access.purchasedMinutesRemaining || 0
  const subscriptionMinutesLeft = Math.max(0, (access.minutesAllowance || 0) - (access.minutesUsed || 0))

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-surface-light to-white">
      <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={handlePDFUpload} />

      <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <button onClick={() => screen !== 'setup' ? setScreen('setup') : navigate('/dashboard')}
            className="flex items-center gap-2 text-navy hover:text-indigo-premium transition">
            <ArrowLeft size={20} />
            <span className="hidden sm:inline font-medium">{screen !== 'setup' ? 'Back to Setup' : 'Back'}</span>
          </button>
          <span className="font-sora font-bold text-lg text-navy">Test Yourself</span>
          <div className="w-20" />
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {screen === 'setup' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div>
              <h1 className="font-sora font-bold text-3xl sm:text-4xl text-navy mb-2">Test Yourself</h1>
              <p className="text-gray-500">Generate AI practice questions from your lecture, notes, or a past paper PDF.</p>
              {accessLoaded && (
                <p className="text-sm mt-2">
                  {isUnlimitedPlan(access) ? (
                    <span className="text-mint">✨ {access.currentPlan} plan · {subscriptionMinutesLeft} min left this period</span>
                  ) : remaining > 0 ? (
                    <span className="text-indigo-premium">🎓 {remaining} free AI credits remaining</span>
                  ) : minutesLeft > 0 ? (
                    <span className="text-brand-blue">💳 {Math.round(minutesLeft)} AI minutes available</span>
                  ) : (
                    <span className="text-red-500">🔒 No credits left — <button onClick={() => navigate('/pricing')} className="underline">upgrade</button></span>
                  )}
                </p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2">
              {([
                { id: 'lecture', label: '🎙️ My Lecture', desc: 'From recordings' },
                { id: 'paste', label: '📝 Paste Notes', desc: 'Type or paste' },
                { id: 'pdf', label: '📄 Past Paper', desc: 'Upload PDF' },
              ] as { id: InputMode; label: string; desc: string }[]).map(opt => (
                <button key={opt.id} onClick={() => setInputMode(opt.id)}
                  className={`p-3 rounded-2xl border-2 transition text-left ${inputMode === opt.id ? 'border-indigo-premium bg-indigo-premium/5' : 'border-gray-200 hover:border-gray-300'}`}>
                  <p className="font-semibold text-navy text-sm">{opt.label}</p>
                  <p className="text-xs text-gray-500">{opt.desc}</p>
                </button>
              ))}
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
              {inputMode === 'lecture' && (
                <>
                  <label className="block text-sm font-medium text-navy mb-2">Select a recording</label>
                  {recordings.length === 0 ? (
                    <div className="text-center py-8">
                      <BookOpen size={32} className="mx-auto text-gray-300 mb-2" />
                      <p className="text-gray-500 text-sm mb-3">No recordings yet</p>
                      <button onClick={() => navigate('/recording')} className="bg-indigo-premium text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-purple-premium transition">
                        Record a Lecture
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-56 overflow-y-auto">
                      {recordings.map(rec => (
                        <button key={rec.id} onClick={() => setSelectedLectureId(rec.id)}
                          className={`w-full text-left px-4 py-3 rounded-xl border-2 transition ${selectedLectureId === rec.id ? 'border-indigo-premium bg-indigo-premium/5' : 'border-gray-200 hover:border-gray-300'}`}>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-navy text-sm">{rec.name}</p>
                              <p className="text-xs text-gray-500">
                                {rec.course && `${rec.course} · `}{rec.notes ? '✓ Notes' : '—'}{rec.transcript ? ' ✓ Transcript' : ''}
                              </p>
                            </div>
                            {selectedLectureId === rec.id && <Check size={16} className="text-indigo-premium shrink-0" />}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}

              {inputMode === 'paste' && (
                <>
                  <label className="block text-sm font-medium text-navy mb-2">Paste your notes</label>
                  <textarea value={pastedText} onChange={e => setPastedText(e.target.value)}
                    placeholder="Paste your lecture notes, textbook excerpts, or any study material here..."
                    className="w-full h-48 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-navy placeholder-gray-400 outline-none focus:border-indigo-premium transition resize-none text-sm" />
                </>
              )}

              {inputMode === 'pdf' && (
                <>
                  <label className="block text-sm font-medium text-navy mb-2">Upload a past paper PDF</label>
                  {pdfBase64 ? (
                    <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
                      <div className="flex items-center gap-2">
                        <FileText size={18} className="text-indigo-premium" />
                        <p className="text-navy text-sm font-medium truncate">{pdfName}</p>
                      </div>
                      <button onClick={() => { setPdfBase64(null); setPdfName('') }} className="text-gray-400 hover:text-red-500 transition"><X size={18} /></button>
                    </div>
                  ) : (
                    <button onClick={() => fileRef.current?.click()}
                      className="w-full h-32 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-indigo-premium/50 hover:text-indigo-premium transition">
                      <Upload size={24} />
                      <span className="text-sm font-medium">Click to upload PDF</span>
                      <span className="text-xs">Past papers, exam papers, textbook PDFs</span>
                    </button>
                  )}
                </>
              )}

              <button onClick={generateQuiz} disabled={loading}
                className="w-full bg-indigo-premium text-white font-bold py-3.5 rounded-xl hover:bg-purple-premium transition disabled:opacity-50 flex items-center justify-center gap-2">
                {loading ? (<><Loader className="animate-spin" size={20} /> Generating questions...</>) : (<><ClipboardList size={20} /> Generate Quiz</>)}
              </button>
            </div>
          </motion.div>
        )}

        {screen === 'quiz' && questions.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="font-sora font-bold text-2xl text-navy">Quiz</h2>
                <p className="text-gray-500 text-sm">Question {currentQ + 1} of {questions.length}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setCurrentQ(Math.max(0, currentQ - 1))} disabled={currentQ === 0}
                  className="px-3 py-2 rounded-xl border border-gray-200 text-navy text-sm hover:bg-gray-50 disabled:opacity-30 transition">← Prev</button>
                <button onClick={() => setCurrentQ(Math.min(questions.length - 1, currentQ + 1))} disabled={currentQ === questions.length - 1}
                  className="px-3 py-2 rounded-xl border border-gray-200 text-navy text-sm hover:bg-gray-50 disabled:opacity-30 transition">Next →</button>
              </div>
            </div>

            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-indigo-premium h-2 rounded-full transition-all" style={{ width: `${((currentQ + 1) / questions.length) * 100}%` }} />
            </div>

            <AnimatePresence mode="wait">
              <motion.div key={currentQ} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
                <div className="flex items-start gap-3">
                  <span className="w-8 h-8 rounded-full bg-indigo-premium/10 text-indigo-premium font-bold text-sm flex items-center justify-center shrink-0">{currentQ + 1}</span>
                  <p className="font-semibold text-navy text-base">{questions[currentQ]?.question}</p>
                </div>
                <div className="space-y-2">
                  {questions[currentQ]?.options.map((opt, j) => {
                    const selected = answers[currentQ] === j
                    return (
                      <button key={j} onClick={() => selectAnswer(currentQ, j)}
                        className={`w-full text-left px-4 py-3 rounded-xl border-2 transition text-sm font-medium ${selected ? 'border-indigo-premium bg-indigo-premium/5 text-indigo-premium' : 'border-gray-200 text-navy hover:border-indigo-premium/40 hover:bg-indigo-premium/3'}`}>
                        <span className="font-bold mr-2">{String.fromCharCode(65 + j)}.</span>{opt}
                      </button>
                    )
                  })}
                </div>
                {questions[currentQ]?.topic && <p className="text-xs text-gray-400">Topic: {questions[currentQ].topic}</p>}
              </motion.div>
            </AnimatePresence>

            <div className="bg-white rounded-2xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500 mb-3 font-medium">Questions answered: {Object.keys(answers).length}/{questions.length}</p>
              <div className="flex flex-wrap gap-2">
                {questions.map((_, i) => (
                  <button key={i} onClick={() => setCurrentQ(i)}
                    className={`w-8 h-8 rounded-lg text-xs font-bold transition ${i === currentQ ? 'bg-indigo-premium text-white' : answers[i] !== undefined ? 'bg-mint/20 text-mint' : 'bg-gray-100 text-gray-400'}`}>
                    {i + 1}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={submitQuiz} disabled={Object.keys(answers).length < questions.length}
              className="w-full bg-indigo-premium text-white font-bold py-3.5 rounded-xl hover:bg-purple-premium transition disabled:opacity-50">
              {Object.keys(answers).length < questions.length ? `Answer all questions (${questions.length - Object.keys(answers).length} remaining)` : 'Submit Quiz'}
            </button>
          </motion.div>
        )}

        {screen === 'results' && (
          <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
            <div className={`rounded-3xl p-8 text-center text-white ${pct >= 80 ? 'bg-gradient-to-br from-mint to-green-500' : pct >= 60 ? 'bg-gradient-to-br from-indigo-premium to-purple-premium' : 'bg-gradient-to-br from-warning to-red-500'}`}>
              <p className="text-6xl font-bold mb-2">{pct}%</p>
              <p className="text-white/90 text-xl font-semibold">{score} out of {questions.length} correct</p>
              <p className="text-white/70 mt-1">{pct >= 80 ? 'Excellent work! 🎉' : pct >= 60 ? 'Good effort! Keep practicing 💪' : 'Review your notes and try again 📚'}</p>
            </div>

            <div className="space-y-3">
              <h3 className="font-sora font-bold text-xl text-navy">Review Answers</h3>
              {questions.map((q, i) => {
                const userAnswer = answers[i]
                const isCorrect = userAnswer === q.correct
                return (
                  <div key={i} className={`bg-white rounded-2xl border-2 p-5 ${isCorrect ? 'border-mint/40' : 'border-red-200'}`}>
                    <div className="flex items-start gap-3 mb-3">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${isCorrect ? 'bg-mint/20' : 'bg-red-100'}`}>
                        {isCorrect ? <Check size={14} className="text-mint" /> : <X size={14} className="text-red-500" />}
                      </div>
                      <p className="text-navy font-semibold text-sm">{q.question}</p>
                    </div>
                    <div className="space-y-1.5 ml-10">
                      {q.options.map((opt, j) => (
                        <div key={j} className={`px-3 py-2 rounded-lg text-xs font-medium ${j === q.correct ? 'bg-mint/15 text-green-700 border border-mint/30' : j === userAnswer && !isCorrect ? 'bg-red-50 text-red-600 border border-red-200' : 'text-gray-500'}`}>
                          <span className="font-bold mr-1">{String.fromCharCode(65 + j)}.</span>{opt}
                          {j === q.correct && <span className="ml-2 text-mint font-bold">✓ Correct</span>}
                          {j === userAnswer && !isCorrect && <span className="ml-2 text-red-500 font-bold">✗ Your answer</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <button onClick={resetQuiz} className="flex items-center justify-center gap-2 bg-indigo-premium text-white font-bold py-3.5 rounded-xl hover:bg-purple-premium transition">
                <RotateCcw size={18} /> New Quiz
              </button>
              <button onClick={() => navigate('/sage')} className="flex items-center justify-center gap-2 bg-gradient-to-r from-brand-blue to-purple-500 text-white font-bold py-3.5 rounded-xl hover:opacity-90 transition">
                🧠 Ask SAGE about this
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
