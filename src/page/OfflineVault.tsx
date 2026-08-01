import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Download, Trash2, Play, Pause,
  FileText, Mic, ClipboardList, BookOpen,
  HardDrive, Search, Filter, X,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { toast } from '../lib/toast'

// IndexedDB helpers — same as Recording.tsx
const openDB = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const req = indexedDB.open('studia-recordings', 1)
    req.onupgradeneeded = (e: any) => e.target.result.createObjectStore('blobs')
    req.onsuccess = (e: any) => resolve(e.target.result)
    req.onerror = () => reject(req.error)
  })

const getBlob = async (id: string): Promise<Blob | null> => {
  try {
    const db = await openDB()
    return new Promise((resolve) => {
      const req = db.transaction('blobs').objectStore('blobs').get(id)
      req.onsuccess = () => resolve(req.result || null)
      req.onerror = () => resolve(null)
    })
  } catch { return null }
}

const deleteBlob = async (id: string) => {
  try { const db = await openDB(); db.transaction('blobs', 'readwrite').objectStore('blobs').delete(id) } catch {}
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

type VaultTab = 'recordings' | 'notes' | 'quizzes'

export default function OfflineVault() {
  const navigate = useNavigate()

  const [tab, setTab] = useState<VaultTab>('recordings')
  const [searchQuery, setSearchQuery] = useState('')
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null)

  const [recordings, setRecordings] = useState<any[]>([])
  const [notes, setNotes] = useState<any[]>([])
  const [quizResults, setQuizResults] = useState<any[]>([])

  useEffect(() => {
    try { setRecordings(JSON.parse(localStorage.getItem('recordingsMetadata') || '[]')) } catch {}
    try { setNotes(JSON.parse(localStorage.getItem('notes') || '[]')) } catch {}
    try { setQuizResults(JSON.parse(localStorage.getItem('quizResults') || '[]')) } catch {}
  }, [])

  const stopAudio = () => {
    if (currentAudio) { currentAudio.pause(); setCurrentAudio(null) }
    setPlayingId(null)
  }

  const playRecording = async (recording: any) => {
    stopAudio()
    if (playingId === recording.id) return

    const blob = await getBlob(recording.id)
    if (!blob) { toast.error('Recording file not found locally. It may only be available in the cloud.'); return }

    const url = URL.createObjectURL(blob)
    const audio = new Audio(url)
    audio.play()
    setCurrentAudio(audio)
    setPlayingId(recording.id)
    audio.onended = () => { setPlayingId(null); URL.revokeObjectURL(url) }
    audio.onerror = () => { setPlayingId(null); URL.revokeObjectURL(url); toast.error('Could not play recording') }
  }

  const downloadRecording = async (recording: any) => {
    const blob = await getBlob(recording.id)
    if (!blob) { toast.error('File not found on this device. Only cloud-synced recordings can be downloaded.'); return }
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `${recording.name}.webm`; a.click()
    URL.revokeObjectURL(url)
    toast.success('Download started!')
  }

  const deleteRecording = async (id: string) => {
    await deleteBlob(id)
    const updated = recordings.filter(r => r.id !== id)
    setRecordings(updated)
    try { localStorage.setItem('recordingsMetadata', JSON.stringify(updated)) } catch {}
    if (playingId === id) stopAudio()
    toast.success('Recording deleted')
  }

  const downloadNote = (note: any) => {
    const content = `${note.title}\n${'='.repeat(note.title.length)}\n\nCourse: ${note.course || 'N/A'}\nDate: ${note.date}\n\n${note.content}`
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `${note.title.replace(/\s+/g, '_')}.txt`; a.click()
    URL.revokeObjectURL(url)
    toast.success('Note downloaded as text file')
  }

  const downloadNoteAsPDF = async (note: any) => {
    try {
      const { jsPDF } = await import('jspdf')
      const doc = new jsPDF()
      doc.setFontSize(18)
      doc.text(note.title, 14, 20)
      doc.setFontSize(11)
      doc.setTextColor(100)
      if (note.course) doc.text(`Course: ${note.course}`, 14, 30)
      doc.text(`Date: ${note.date}`, 14, note.course ? 37 : 30)
      doc.setTextColor(0)
      doc.setFontSize(11)
      const lines = doc.splitTextToSize(note.content, 180)
      doc.text(lines, 14, note.course ? 47 : 40)
      doc.save(`${note.title.replace(/\s+/g, '_')}.pdf`)
      toast.success('Note exported as PDF')
    } catch {
      toast.error('PDF export failed. Downloading as text instead.')
      downloadNote(note)
    }
  }

  const deleteNote = (id: string) => {
    const updated = notes.filter(n => n.id !== id)
    setNotes(updated)
    try { localStorage.setItem('notes', JSON.stringify(updated)) } catch {}
    toast.success('Note deleted')
  }

  const clearQuizResults = () => {
    setQuizResults([])
    localStorage.removeItem('quizResults')
    toast.success('Quiz history cleared')
  }

  const exportQuizResults = () => {
    const content = quizResults.map((q, i) =>
      `Quiz ${i + 1} — ${q.subject || 'General'}\nDate: ${q.date ? new Date(q.date).toLocaleDateString() : 'N/A'}\nScore: ${q.score}/${q.total} (${Math.round((q.score / q.total) * 100)}%)\n`
    ).join('\n---\n\n')
    const blob = new Blob([`STUDIA AI Quiz Results\n${'='.repeat(30)}\n\n${content}`], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'quiz_results.txt'; a.click()
    URL.revokeObjectURL(url)
    toast.success('Quiz results exported')
  }

  // Filtered lists
  const filteredRecordings = recordings.filter(r =>
    r.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.course?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.unit?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredNotes = notes.filter(n =>
    n.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    n.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    n.course?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredQuizzes = quizResults.filter(q =>
    q.subject?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const avgScore = quizResults.length > 0
    ? Math.round(quizResults.reduce((s, q) => s + (q.total > 0 ? (q.score / q.total) * 100 : 0), 0) / quizResults.length)
    : 0

  return (
    <div className="min-h-screen bg-surface-base">
      <nav className="border-b border-white/5 bg-surface-elevated/50 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-sm text-[#8B97B5] hover:text-white">
            <ArrowLeft size={16} /> Back
          </button>
          <div className="flex items-center gap-2">
            <HardDrive size={18} className="text-brand-blue" />
            <span className="font-sora font-bold text-white">Offline Vault</span>
          </div>
          <div className="w-20" />
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: Mic, label: 'Recordings', value: recordings.length, color: 'from-brand-blue' },
            { icon: BookOpen, label: 'Notes', value: notes.length, color: 'from-purple-premium' },
            { icon: ClipboardList, label: 'Quizzes', value: quizResults.length, color: 'from-mint' },
          ].map((s, i) => (
            <div key={i} className={`bg-gradient-to-br ${s.color} to-transparent rounded-xl p-4 border border-white/10`}>
              <s.icon size={16} className="text-white/60 mb-2" />
              <p className="font-sora font-bold text-2xl text-white">{s.value}</p>
              <p className="text-xs text-white/60">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-3.5 text-[#4A5568]" size={18} />
          <input type="text" placeholder="Search vault..." value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-surface-elevated border border-white/10 rounded-xl p-3 pl-11 pr-10 text-white placeholder-[#4A5568] outline-none focus:border-brand-blue/40" />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-3 text-[#8B97B5] hover:text-white">
              <X size={18} />
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex bg-surface-elevated rounded-xl p-1 gap-1">
          {([
            { id: 'recordings', label: '🎙️ Recordings', count: recordings.length },
            { id: 'notes', label: '📝 Notes', count: notes.length },
            { id: 'quizzes', label: '🧠 Quizzes', count: quizResults.length },
          ] as const).map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                tab === t.id ? 'bg-brand-blue text-white' : 'text-[#8B97B5] hover:text-white'
              }`}>
              {t.label}
              {t.count > 0 && <span className="ml-1 text-[10px] opacity-70">({t.count})</span>}
            </button>
          ))}
        </div>

        {/* ── RECORDINGS ───────────────────────────────────────────────── */}
        {tab === 'recordings' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
            {filteredRecordings.length === 0 ? (
              <div className="bg-surface-elevated border border-white/5 rounded-2xl p-12 text-center">
                <Mic size={36} className="mx-auto text-[#4A5568] mb-3" />
                <p className="text-white font-semibold mb-1">{searchQuery ? 'No recordings match your search' : 'No recordings yet'}</p>
                <p className="text-[#8B97B5] text-sm">Record a lecture to see it here</p>
                {!searchQuery && (
                  <button onClick={() => navigate('/recording')}
                    className="mt-4 bg-brand-blue text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-brand-blue/90 transition">
                    Start Recording
                  </button>
                )}
              </div>
            ) : (
              filteredRecordings.map((recording, i) => (
                <motion.div key={recording.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                  className="bg-surface-elevated border border-white/5 rounded-2xl p-5">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold break-words">{recording.name}</p>
                      <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-[#8B97B5]">
                        {recording.duration > 0 && <span>⏱️ {formatDuration(recording.duration)}</span>}
                        {recording.course && <span className="text-brand-blue">{recording.course}</span>}
                        {recording.unit && <span>· {recording.unit}</span>}
                        {recording.notes && <span className="text-green-400">✓ Notes</span>}
                        {recording.transcript && <span className="text-purple-400">✓ Transcript</span>}
                        <span>{recording.timestamp ? new Date(recording.timestamp).toLocaleDateString('en-KE') : ''}</span>
                      </div>

                      {/* AI Notes preview */}
                      {recording.notes && (
                        <div className="mt-3 bg-surface-base rounded-xl p-3 max-h-20 overflow-hidden">
                          <p className="text-[10px] text-[#8B97B5] font-semibold mb-1">AI NOTES PREVIEW</p>
                          <p className="text-xs text-[#C5CCDE] line-clamp-2">{recording.notes.slice(0, 150)}...</p>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 shrink-0 flex-wrap">
                      <button onClick={() => playingId === recording.id ? stopAudio() : playRecording(recording)}
                        className={`p-2.5 rounded-xl border transition ${
                          playingId === recording.id
                            ? 'bg-brand-blue/20 border-brand-blue/40 text-brand-blue'
                            : 'bg-surface-base border-white/10 text-[#8B97B5] hover:text-white'
                        }`}>
                        {playingId === recording.id ? <Pause size={17} /> : <Play size={17} />}
                      </button>
                      <button onClick={() => downloadRecording(recording)}
                        className="p-2.5 rounded-xl bg-surface-base border border-white/10 text-[#8B97B5] hover:text-white transition">
                        <Download size={17} />
                      </button>
                      {recording.notes && (
                        <button onClick={() => navigate('/sage')}
                          className="p-2.5 rounded-xl bg-brand-blue/10 border border-brand-blue/20 text-brand-blue hover:bg-brand-blue/20 transition" title="Open in SAGE">
                          <FileText size={17} />
                        </button>
                      )}
                      <button onClick={() => deleteRecording(recording.id)}
                        className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition">
                        <Trash2 size={17} />
                      </button>
                    </div>
                  </div>

                  {/* Audio progress indicator */}
                  {playingId === recording.id && (
                    <div className="mt-3 flex items-center gap-2">
                      <div className="flex gap-0.5">
                        {[...Array(5)].map((_, i) => (
                          <motion.div key={i}
                            animate={{ scaleY: [1, 2.5, 1] }}
                            transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.1 }}
                            className="w-1 h-4 bg-brand-blue rounded-full" />
                        ))}
                      </div>
                      <p className="text-xs text-brand-blue">Playing...</p>
                    </div>
                  )}
                </motion.div>
              ))
            )}
          </motion.div>
        )}

        {/* ── NOTES ─────────────────────────────────────────────────────── */}
        {tab === 'notes' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
            {filteredNotes.length === 0 ? (
              <div className="bg-surface-elevated border border-white/5 rounded-2xl p-12 text-center">
                <BookOpen size={36} className="mx-auto text-[#4A5568] mb-3" />
                <p className="text-white font-semibold mb-1">{searchQuery ? 'No notes match your search' : 'No notes yet'}</p>
                <p className="text-[#8B97B5] text-sm">Create notes or generate them from a lecture</p>
                {!searchQuery && (
                  <button onClick={() => navigate('/notes')}
                    className="mt-4 bg-brand-blue text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-brand-blue/90 transition">
                    Go to Notes
                  </button>
                )}
              </div>
            ) : (
              filteredNotes.map((note, i) => (
                <motion.div key={note.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                  className="bg-surface-elevated border border-white/5 rounded-2xl p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold break-words">{note.title}</p>
                      {note.course && <p className="text-xs text-brand-blue mt-0.5">{note.course}</p>}
                      <p className="text-xs text-[#8B97B5] mt-1">{note.date}</p>
                      <p className="text-sm text-[#C5CCDE] mt-2 line-clamp-2">{note.content}</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => downloadNote(note)} title="Download as text"
                        className="p-2.5 rounded-xl bg-surface-base border border-white/10 text-[#8B97B5] hover:text-white transition">
                        <Download size={16} />
                      </button>
                      <button onClick={() => downloadNoteAsPDF(note)} title="Export as PDF"
                        className="p-2.5 rounded-xl bg-brand-blue/10 border border-brand-blue/20 text-brand-blue hover:bg-brand-blue/20 transition">
                        <FileText size={16} />
                      </button>
                      <button onClick={() => deleteNote(note.id)}
                        className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </motion.div>
        )}

        {/* ── QUIZ RESULTS ─────────────────────────────────────────────── */}
        {tab === 'quizzes' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            {quizResults.length > 0 && (
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className="bg-surface-elevated border border-white/5 rounded-xl px-4 py-2">
                    <p className="text-xs text-[#8B97B5]">Average Score</p>
                    <p className={`font-sora font-bold text-lg ${avgScore >= 70 ? 'text-mint' : avgScore >= 50 ? 'text-warning' : 'text-red-400'}`}>
                      {avgScore}%
                    </p>
                  </div>
                  <div className="bg-surface-elevated border border-white/5 rounded-xl px-4 py-2">
                    <p className="text-xs text-[#8B97B5]">Total Quizzes</p>
                    <p className="font-sora font-bold text-lg text-white">{quizResults.length}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={exportQuizResults}
                    className="flex items-center gap-2 bg-surface-elevated border border-white/10 text-white px-4 py-2 rounded-xl text-sm font-medium hover:border-brand-blue/40 transition">
                    <Download size={15} /> Export
                  </button>
                  <button onClick={clearQuizResults}
                    className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-2 rounded-xl text-sm font-medium hover:bg-red-500/20 transition">
                    <Trash2 size={15} /> Clear All
                  </button>
                </div>
              </div>
            )}

            {filteredQuizzes.length === 0 ? (
              <div className="bg-surface-elevated border border-white/5 rounded-2xl p-12 text-center">
                <ClipboardList size={36} className="mx-auto text-[#4A5568] mb-3" />
                <p className="text-white font-semibold mb-1">{searchQuery ? 'No quizzes match your search' : 'No quiz results yet'}</p>
                <p className="text-[#8B97B5] text-sm">Take a quiz to see your results here</p>
                {!searchQuery && (
                  <button onClick={() => navigate('/quiz')}
                    className="mt-4 bg-brand-blue text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-brand-blue/90 transition">
                    Take a Quiz
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredQuizzes.map((result, i) => {
                  const pct = result.total > 0 ? Math.round((result.score / result.total) * 100) : 0
                  const color = pct >= 70 ? 'text-mint bg-mint/10' : pct >= 50 ? 'text-warning bg-warning/10' : 'text-red-400 bg-red-500/10'
                  return (
                    <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                      className="bg-surface-elevated border border-white/5 rounded-xl px-5 py-4 flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white font-medium truncate">{result.subject || 'General Quiz'}</p>
                        <p className="text-xs text-[#8B97B5] mt-0.5">
                          {result.date ? new Date(result.date).toLocaleDateString('en-KE', { weekday: 'short', month: 'short', day: 'numeric' }) : ''}
                          {result.source === 'mock_exam' && ' · Mock Exam'}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className={`text-xs font-bold px-3 py-1.5 rounded-full ${color}`}>
                          {result.score}/{result.total} · {pct}%
                        </div>
                        <div className="w-16 bg-surface-base rounded-full h-1.5">
                          <div className={`h-1.5 rounded-full transition-all ${pct >= 70 ? 'bg-mint' : pct >= 50 ? 'bg-warning' : 'bg-red-400'}`}
                            style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  )
}
