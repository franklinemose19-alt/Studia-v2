import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Download, Trash2, Lock, Wifi, WifiOff, Mic, BookOpen, BarChart3, Loader } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface RecordingItem {
  id: string
  name: string
  duration: number
  course?: string
  unit?: string
  notes?: string
  transcript?: string
}

interface NoteItem {
  id: string
  title: string
  content: string
  course?: string
  date: string
}

interface QuizItem {
  id: string
  title: string
  questions: { question: string; options: string[]; correct: number }[]
  date: string
}

const openRecordingsDB = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const req = indexedDB.open('studia-recordings', 1)
    req.onupgradeneeded = (e: any) => e.target.result.createObjectStore('blobs')
    req.onsuccess = (e: any) => resolve(e.target.result)
    req.onerror = () => reject(req.error)
  })

const getRecordingBlob = async (id: string): Promise<Blob | null> => {
  try {
    const db = await openRecordingsDB()
    return new Promise((resolve) => {
      const req = db.transaction('blobs').objectStore('blobs').get(id)
      req.onsuccess = () => resolve(req.result || null)
      req.onerror = () => resolve(null)
    })
  } catch { return null }
}

const formatBytes = (bytes: number) => {
  if (bytes <= 0) return '0 KB'
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function OfflineVault() {
  const navigate = useNavigate()
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  const [lectures, setLectures] = useState<RecordingItem[]>([])
  const [notes, setNotes] = useState<NoteItem[]>([])
  const [quizzes, setQuizzes] = useState<QuizItem[]>([])
  const [lectureSizes, setLectureSizes] = useState<Record<string, number>>({})
  const [loadingSizes, setLoadingSizes] = useState(true)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    try { setLectures(JSON.parse(localStorage.getItem('recordingsMetadata') || '[]')) } catch { setLectures([]) }
    try { setNotes(JSON.parse(localStorage.getItem('notes') || '[]')) } catch { setNotes([]) }
    try { setQuizzes(JSON.parse(localStorage.getItem('savedQuizzes') || '[]')) } catch { setQuizzes([]) }

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  useEffect(() => {
    const loadSizes = async () => {
      setLoadingSizes(true)
      const sizes: Record<string, number> = {}
      for (const lec of lectures) {
        const blob = await getRecordingBlob(lec.id)
        sizes[lec.id] = blob ? blob.size : 0
      }
      setLectureSizes(sizes)
      setLoadingSizes(false)
    }
    if (lectures.length > 0) loadSizes()
    else setLoadingSizes(false)
  }, [lectures])

  const notesSize = (n: NoteItem) => new Blob([JSON.stringify(n)]).size
  const quizSize = (q: QuizItem) => new Blob([JSON.stringify(q)]).size

  const totalBytes =
    Object.values(lectureSizes).reduce((s, v) => s + v, 0) +
    notes.reduce((s, n) => s + notesSize(n), 0) +
    quizzes.reduce((s, q) => s + quizSize(q), 0)

  const deleteLecture = async (id: string) => {
    try { const db = await openRecordingsDB(); db.transaction('blobs', 'readwrite').objectStore('blobs').delete(id) } catch {}
    const updated = lectures.filter((l) => l.id !== id)
    setLectures(updated)
    localStorage.setItem('recordingsMetadata', JSON.stringify(updated))
  }

  const deleteNote = (id: string) => {
    const updated = notes.filter((n) => n.id !== id)
    setNotes(updated)
    localStorage.setItem('notes', JSON.stringify(updated))
  }

  const deleteQuiz = (id: string) => {
    const updated = quizzes.filter((q) => q.id !== id)
    setQuizzes(updated)
    localStorage.setItem('savedQuizzes', JSON.stringify(updated))
  }

  const downloadText = (filename: string, text: string) => {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  const downloadLectureNotes = (lec: RecordingItem) => {
    const text = `${lec.name}\n${lec.course ? `Course: ${lec.course}\n` : ''}${lec.unit ? `Unit: ${lec.unit}\n` : ''}\n--- AI Notes ---\n${lec.notes || 'No notes generated.'}\n\n--- Transcript ---\n${lec.transcript || 'No transcript available.'}`
    downloadText(`${lec.name}.txt`, text)
  }

  const downloadLectureAudio = async (lec: RecordingItem) => {
    const blob = await getRecordingBlob(lec.id)
    if (!blob) { alert('Audio file not found.'); return }
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${lec.name}.webm`
    a.click()
    URL.revokeObjectURL(url)
  }

  const downloadNote = (note: NoteItem) => {
    const text = `${note.title}\n${note.course ? `Course: ${note.course}\n` : ''}\n${note.content}`
    downloadText(`${note.title}.txt`, text)
  }

  import jsPDF from 'jspdf'

const downloadQuizPDF = (quiz: QuizItem) => {
  const doc = new jsPDF()
  doc.setFontSize(16)
  doc.text(quiz.title, 14, 20)
  doc.setFontSize(11)

  let y = 32
  quiz.questions.forEach((q, i) => {
    if (y > 270) { doc.addPage(); y = 20 }
    doc.setFont('helvetica', 'bold')
    const questionLines = doc.splitTextToSize(`Q${i + 1}. ${q.question}`, 180)
    doc.text(questionLines, 14, y)
    y += questionLines.length * 6 + 2

    doc.setFont('helvetica', 'normal')
    q.options.forEach((opt, j) => {
      const marker = j === q.correct ? '✓' : ' '
      const optLines = doc.splitTextToSize(`${marker} ${opt}`, 170)
      if (y > 270) { doc.addPage(); y = 20 }
      doc.text(optLines, 18, y)
      y += optLines.length * 6
    })
    y += 6
  })

  doc.save(`${quiz.title}.pdf`)
}

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-surface-light to-white">
      <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-navy hover:text-indigo-premium transition">
            <ArrowLeft size={20} />
            <span className="font-medium">Back</span>
          </button>
          <div className="flex items-center gap-1">
            <span className="font-sora font-bold text-lg text-navy">STUDIA</span>
            <sup className="text-indigo-premium text-xs">β</sup>
          </div>
          <div className="flex items-center gap-2">
            {isOnline ? (
              <div className="flex items-center gap-2 text-mint"><Wifi size={18} /><span className="text-sm">Online</span></div>
            ) : (
              <div className="flex items-center gap-2 text-warning"><WifiOff size={18} /><span className="text-sm">Offline</span></div>
            )}
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
          <div>
            <h1 className="font-sora font-bold text-5xl text-navy mb-2">Offline Vault</h1>
            <p className="text-gray-600">Everything you've recorded, written, and generated — ready to use without internet.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className={`rounded-2xl p-6 border ${isOnline ? 'bg-mint/10 border-mint/20' : 'bg-warning/10 border-warning/20'}`}>
              <div className="flex items-center gap-3">
                {isOnline ? <Wifi className="text-mint" size={32} /> : <WifiOff className="text-warning" size={32} />}
                <div>
                  <p className="text-sm text-gray-600">Connection Status</p>
                  <p className="font-sora font-bold text-2xl text-navy">{isOnline ? 'Online' : 'Offline'}</p>
                </div>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="bg-indigo-premium/10 border border-indigo-premium/20 rounded-2xl p-6">
              <div className="flex items-center gap-3">
                <Lock className="text-indigo-premium" size={32} />
                <div>
                  <p className="text-sm text-gray-600">Total Vault Size</p>
                  <p className="font-sora font-bold text-2xl text-navy">
                    {loadingSizes ? <Loader size={20} className="animate-spin inline" /> : formatBytes(totalBytes)}
                  </p>
                </div>
              </div>
            </motion.div>
          </div>

          <div className="space-y-8">
            <div>
              <h2 className="font-sora font-bold text-2xl text-navy mb-4">📚 Lectures ({lectures.length})</h2>
              {lectures.length > 0 ? (
                <div className="space-y-3">
                  {lectures.map((item, i) => (
                    <motion.div key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                      className="bg-white rounded-xl p-4 border border-gray-200 hover:border-indigo-premium/50 transition group">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <div className="w-10 h-10 rounded-lg bg-indigo-premium/10 flex items-center justify-center shrink-0">
                            <Mic className="text-indigo-premium" size={20} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-sora font-bold text-navy truncate">{item.name}</p>
                            <p className="text-sm text-gray-600">
                              {formatBytes(lectureSizes[item.id] || 0)}
                              {item.course && ` • ${item.course}`}{item.unit && ` · ${item.unit}`}
                              {item.notes && ' • ✓ Notes saved'}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition shrink-0">
                          <button onClick={() => downloadLectureAudio(item)} title="Download audio" className="p-2 rounded-lg bg-indigo-premium/10 text-indigo-premium hover:bg-indigo-premium/20">
                            <Download size={18} />
                          </button>
                          <button onClick={() => deleteLecture(item.id)} title="Delete" className="p-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20">
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                      {item.notes && (
                        <button onClick={() => downloadLectureNotes(item)} className="mt-3 text-xs text-indigo-premium hover:underline">
                          Download notes as .txt →
                        </button>
                      )}
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="bg-gray-50 rounded-xl p-8 text-center border border-gray-200"><p className="text-gray-600">No lectures recorded yet</p></div>
              )}
            </div>

            <div>
              <h2 className="font-sora font-bold text-2xl text-navy mb-4">📝 Notes ({notes.length})</h2>
              {notes.length > 0 ? (
                <div className="space-y-3">
                  {notes.map((item, i) => (
                    <motion.div key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                      className="bg-white rounded-xl p-4 border border-gray-200 hover:border-purple-premium/50 transition group">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <div className="w-10 h-10 rounded-lg bg-purple-premium/10 flex items-center justify-center shrink-0">
                            <BookOpen className="text-purple-premium" size={20} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-sora font-bold text-navy truncate">{item.title}</p>
                            <p className="text-sm text-gray-600">{formatBytes(notesSize(item))} • {item.date}{item.course && ` • ${item.course}`}</p>
                          </div>
                        </div>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition shrink-0">
                          <button onClick={() => downloadNote(item)} className="p-2 rounded-lg bg-purple-premium/10 text-purple-premium hover:bg-purple-premium/20">
                            <Download size={18} />
                          </button>
                          <button onClick={() => deleteNote(item.id)} className="p-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20">
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="bg-gray-50 rounded-xl p-8 text-center border border-gray-200"><p className="text-gray-600">No notes saved yet</p></div>
              )}
            </div>

            <div>
              <h2 className="font-sora font-bold text-2xl text-navy mb-4">🧪 Quizzes ({quizzes.length})</h2>
              {quizzes.length > 0 ? (
                <div className="space-y-3">
                  {quizzes.map((item, i) => (
                    <motion.div key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                      className="bg-white rounded-xl p-4 border border-gray-200 hover:border-mint/50 transition group">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <div className="w-10 h-10 rounded-lg bg-mint/10 flex items-center justify-center shrink-0">
                            <BarChart3 className="text-mint" size={20} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-sora font-bold text-navy truncate">{item.title}</p>
                            <p className="text-sm text-gray-600">{formatBytes(quizSize(item))} • {item.questions.length} questions</p>
                          </div>
                        </div>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition shrink-0">
                          <button onClick={() => downloadQuiz(item)} className="p-2 rounded-lg bg-mint/10 text-mint hover:bg-mint/20">
                            <Download size={18} />
                          </button>
                          <button onClick={() => deleteQuiz(item.id)} className="p-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20">
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="bg-gray-50 rounded-xl p-8 text-center border border-gray-200"><p className="text-gray-600">No quizzes saved yet</p></div>
              )}
            </div>
          </div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-to-r from-indigo-premium to-purple-premium rounded-2xl p-8 text-white">
            <div className="flex items-start gap-4">
              <Lock className="flex-shrink-0 mt-1" size={24} />
              <div>
                <h3 className="font-sora font-bold text-xl mb-2">Your Data is Protected</h3>
                <p className="text-white/90 mb-3">All content is stored locally on your device. Once recorded or generated, lectures, notes, and quizzes are available even without internet.</p>
                <p className="text-sm text-white/70">✓ Stored on your device • ✓ Personal use only • ✓ Works offline once saved</p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}
