import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Plus, Trash2, Download, Search, X,
  Camera, FileText, Loader, BookOpen, Sparkles,
  Image, AlignLeft, ChevronDown, ChevronUp,
} from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import {
  loadAccess, checkAccess, consumeCredit,
  explorerLecturesRemaining, isUnlimitedPlan,
  type AccessInfo, emptyAccess,
} from '../lib/access'
import { toast } from '../lib/toast'

interface Note {
  id: string
  title: string
  content: string
  course?: string
  date: string
  source: 'manual' | 'ai' | 'snap'
}

const STORAGE_KEY = 'notes'

function loadNotes(): Note[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') }
  catch { return [] }
}

function saveNotes(notes: Note[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes))
}

export default function NotesLibrary() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { userId } = useAuth()
  const imageRef = useRef<HTMLInputElement>(null)

  const initialTab = (searchParams.get('tab') === 'summarize') ? 'summarize' : 'notes'
  const [activeTab, setActiveTab] = useState<'notes' | 'summarize'>(initialTab)
  const [notes, setNotes] = useState<Note[]>([])
  const [search, setSearch] = useState('')
  const [expandedNote, setExpandedNote] = useState<string | null>(null)
  const [access, setAccess] = useState<AccessInfo>(emptyAccess)

  // Manual note form
  const [showAddNote, setShowAddNote] = useState(false)
  const [noteTitle, setNoteTitle] = useState('')
  const [noteContent, setNoteContent] = useState('')
  const [noteCourse, setNoteCourse] = useState('')

  // Summarize tab
  const [summarizeMode, setSummarizeMode] = useState<'text' | 'image'>('text')
  const [summarizeText, setSummarizeText] = useState('')
  const [summarizeImage, setSummarizeImage] = useState<string | null>(null)
  const [summarizeImageName, setSummarizeImageName] = useState('')
  const [summary, setSummary] = useState('')
  const [summarizeLoading, setSummarizeLoading] = useState(false)

  useEffect(() => {
    setNotes(loadNotes())
    loadAccess(userId).then(setAccess)
  }, [userId])

  const addManualNote = () => {
    if (!noteTitle.trim() || !noteContent.trim()) { toast.error('Please fill in title and content'); return }
    const note: Note = {
      id: `note-${Date.now()}`,
      title: noteTitle.trim(),
      content: noteContent.trim(),
      course: noteCourse.trim() || undefined,
      date: new Date().toLocaleDateString('en-KE'),
      source: 'manual',
    }
    const updated = [note, ...notes]
    setNotes(updated)
    saveNotes(updated)
    setNoteTitle('')
    setNoteContent('')
    setNoteCourse('')
    setShowAddNote(false)
    toast.success('Note saved!')
  }

  const deleteNote = (id: string) => {
    const updated = notes.filter(n => n.id !== id)
    setNotes(updated)
    saveNotes(updated)
    toast.info('Note deleted')
  }

  const downloadNote = (note: Note) => {
    const content = `${note.title}\n${'='.repeat(note.title.length)}\n${note.course ? `Course: ${note.course}\n` : ''}Date: ${note.date}\n\n${note.content}`
    const url = URL.createObjectURL(new Blob([content], { type: 'text/plain' }))
    const a = document.createElement('a')
    a.href = url; a.download = `${note.title.replace(/\s+/g, '_')}.txt`; a.click()
    URL.revokeObjectURL(url)
    toast.success('Note downloaded')
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { toast.error('Please upload an image file'); return }
    setSummarizeImageName(file.name)
    const reader = new FileReader()
    reader.onload = ev => setSummarizeImage(ev.target?.result as string)
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const handleSummarize = async () => {
    if (summarizeMode === 'text' && !summarizeText.trim()) { toast.error('Please paste your notes first'); return }
    if (summarizeMode === 'image' && !summarizeImage) { toast.error('Please upload an image first'); return }

    const result = checkAccess(access, 'core')
    if (!result.allowed) {
      toast.error('Free AI credits used up — upgrade to continue.')
      navigate('/pricing')
      return
    }

    setSummarizeLoading(true)
    setSummary('')
    try {
      const res = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          text: summarizeMode === 'text' ? summarizeText : undefined,
          image: summarizeMode === 'image' ? summarizeImage : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Summarization failed'); return }
      setSummary(data.summary || '')
      await consumeCredit(access, result.source)
      setAccess(prev => ({
        ...prev,
        freeCreditsUsed: result.source === 'explorer_free' ? prev.freeCreditsUsed + 1 : prev.freeCreditsUsed,
        liteBonusCredits: result.source === 'bonus' ? Math.max(0, prev.liteBonusCredits - 1) : prev.liteBonusCredits,
      }))
    } catch { toast.error('Failed to generate summary. Check your connection.') }
    finally { setSummarizeLoading(false) }
  }

  const saveSummaryAsNote = () => {
    if (!summary) return
    const note: Note = {
      id: `note-${Date.now()}`,
      title: `AI Summary — ${new Date().toLocaleDateString('en-KE')}`,
      content: summary,
      date: new Date().toLocaleDateString('en-KE'),
      source: 'ai',
    }
    const updated = [note, ...notes]
    setNotes(updated)
    saveNotes(updated)
    setActiveTab('notes')
    toast.success('Summary saved to notes!')
  }

  const filteredNotes = notes.filter(n =>
    n.title.toLowerCase().includes(search.toLowerCase()) ||
    n.content.toLowerCase().includes(search.toLowerCase()) ||
    (n.course?.toLowerCase() || '').includes(search.toLowerCase())
  )

  const remaining = explorerLecturesRemaining(access)

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-surface-light to-white">
      <input ref={imageRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />

      <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-navy hover:text-indigo-premium transition">
            <ArrowLeft size={20} />
            <span className="hidden sm:inline font-medium">Back</span>
          </button>
          <span className="font-sora font-bold text-lg text-navy">Notes Library</span>
          <button
            onClick={() => setShowAddNote(true)}
            className="flex items-center gap-1.5 bg-indigo-premium text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-purple-premium transition"
          >
            <Plus size={16} /> New Note
          </button>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* Tabs */}
        <div className="flex bg-gray-100 rounded-2xl p-1 gap-1">
          <button onClick={() => setActiveTab('notes')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2 ${activeTab === 'notes' ? 'bg-white text-navy shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            <BookOpen size={16} /> My Notes
          </button>
          <button onClick={() => setActiveTab('summarize')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2 ${activeTab === 'summarize' ? 'bg-white text-navy shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            <Sparkles size={16} /> AI Summarize
          </button>
        </div>

        {/* ── NOTES TAB ───────────────────────────────────────────────── */}
        {activeTab === 'notes' && (
          <div className="space-y-5">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-4 top-3.5 text-gray-400" size={18} />
              <input type="text" placeholder="Search notes..." value={search} onChange={e => setSearch(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-xl py-3 pl-12 pr-10 text-navy placeholder-gray-400 outline-none focus:border-indigo-premium transition" />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"><X size={18} /></button>
              )}
            </div>

            {/* Add note form */}
            <AnimatePresence>
              {showAddNote && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                  className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="font-sora font-bold text-navy">New Note</h2>
                    <button onClick={() => setShowAddNote(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-navy mb-2">Title *</label>
                      <input type="text" placeholder="Note title" value={noteTitle} onChange={e => setNoteTitle(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-navy placeholder-gray-400 outline-none focus:border-indigo-premium transition text-base" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-navy mb-2">Course (optional)</label>
                      <input type="text" placeholder="e.g. Biology" value={noteCourse} onChange={e => setNoteCourse(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-navy placeholder-gray-400 outline-none focus:border-indigo-premium transition text-base" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-navy mb-2">Content *</label>
                    <textarea value={noteContent} onChange={e => setNoteContent(e.target.value)}
                      placeholder="Write your notes here..."
                      className="w-full h-40 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-navy placeholder-gray-400 outline-none focus:border-indigo-premium transition resize-none text-sm" />
                  </div>
                  <div className="flex gap-3">
                    <button onClick={addManualNote} className="flex-1 bg-indigo-premium text-white font-semibold py-3 rounded-xl hover:bg-purple-premium transition">Save Note</button>
                    <button onClick={() => setShowAddNote(false)} className="flex-1 bg-gray-100 text-navy font-semibold py-3 rounded-xl hover:bg-gray-200 transition">Cancel</button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Notes list */}
            {filteredNotes.length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center">
                <FileText size={40} className="mx-auto text-gray-300 mb-4" />
                <p className="font-sora font-bold text-navy mb-2">{search ? 'No notes match your search' : 'No notes yet'}</p>
                <p className="text-gray-500 text-sm mb-6">{search ? 'Try a different search term.' : 'Create a note or generate one from a lecture recording.'}</p>
                {!search && (
                  <div className="flex justify-center gap-3 flex-wrap">
                    <button onClick={() => setShowAddNote(true)} className="bg-indigo-premium text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-purple-premium transition">
                      Write a Note
                    </button>
                    <button onClick={() => navigate('/recording')} className="border border-gray-200 text-navy px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-gray-50 transition">
                      Record a Lecture
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredNotes.map((note, i) => (
                  <motion.div key={note.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                    className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:border-indigo-premium/30 hover:shadow-sm transition">
                    <div className="px-5 py-4 flex items-start justify-between gap-3">
                      <button onClick={() => setExpandedNote(expandedNote === note.id ? null : note.id)}
                        className="flex-1 text-left min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <p className="font-sora font-bold text-navy truncate">{note.title}</p>
                          {note.source === 'ai' && <span className="text-[10px] bg-indigo-premium/10 text-indigo-premium px-2 py-0.5 rounded-full font-semibold">AI</span>}
                          {note.source === 'snap' && <span className="text-[10px] bg-mint/15 text-mint px-2 py-0.5 rounded-full font-semibold">Snap</span>}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-400 flex-wrap">
                          {note.course && <span className="text-indigo-premium">{note.course}</span>}
                          <span>{note.date}</span>
                          <span>{note.content.slice(0, 80)}{note.content.length > 80 ? '...' : ''}</span>
                        </div>
                      </button>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => downloadNote(note)} className="p-2 rounded-lg text-gray-400 hover:text-indigo-premium hover:bg-indigo-premium/10 transition" title="Download">
                          <Download size={15} />
                        </button>
                        <button onClick={() => deleteNote(note.id)} className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition">
                          <Trash2 size={15} />
                        </button>
                        {expandedNote === note.id
                          ? <ChevronUp size={16} className="text-gray-400" />
                          : <ChevronDown size={16} className="text-gray-400" />}
                      </div>
                    </div>

                    <AnimatePresence>
                      {expandedNote === note.id && (
                        <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                          className="overflow-hidden border-t border-gray-100">
                          <div className="px-5 py-4">
                            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{note.content}</p>
                            <div className="flex gap-2 mt-4">
                              <button onClick={() => navigate(`/sage`)}
                                className="flex items-center gap-1.5 bg-indigo-premium/10 text-indigo-premium px-4 py-2 rounded-xl text-xs font-semibold hover:bg-indigo-premium/20 transition">
                                🧠 Ask SAGE
                              </button>
                              <button onClick={() => downloadNote(note)}
                                className="flex items-center gap-1.5 border border-gray-200 text-navy px-4 py-2 rounded-xl text-xs font-semibold hover:bg-gray-50 transition">
                                <Download size={13} /> Download
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── SUMMARIZE TAB ───────────────────────────────────────────── */}
        {activeTab === 'summarize' && (
          <div className="space-y-5">
            <div>
              <h2 className="font-sora font-bold text-2xl text-navy mb-1">AI Summarize</h2>
              <p className="text-gray-500 text-sm">
                Paste your lecture notes or upload a photo — SAGE will summarize the key points.
                {!isUnlimitedPlan(access) && remaining > 0 && (
                  <span className="text-indigo-premium ml-2">· {remaining} free credit{remaining !== 1 ? 's' : ''} left</span>
                )}
              </p>
            </div>

            {/* Mode selector */}
            <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
              <button onClick={() => { setSummarizeMode('text'); setSummarizeImage(null) }}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition flex items-center justify-center gap-2 ${summarizeMode === 'text' ? 'bg-white text-navy shadow-sm' : 'text-gray-500'}`}>
                <AlignLeft size={16} /> Paste Text
              </button>
              <button onClick={() => { setSummarizeMode('image'); setSummarizeText('') }}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition flex items-center justify-center gap-2 ${summarizeMode === 'image' ? 'bg-white text-navy shadow-sm' : 'text-gray-500'}`}>
                <Image size={16} /> Upload Image
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
              {summarizeMode === 'text' ? (
                <textarea
                  value={summarizeText}
                  onChange={e => setSummarizeText(e.target.value)}
                  placeholder="Paste your lecture notes, textbook content, or any study material here..."
                  className="w-full h-48 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-navy placeholder-gray-400 outline-none focus:border-indigo-premium transition resize-none text-sm"
                />
              ) : (
                <div>
                  {summarizeImage ? (
                    <div className="space-y-3">
                      <img src={summarizeImage} alt="Notes to summarize" className="w-full max-h-48 object-cover rounded-xl border border-gray-200" />
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-500 truncate">{summarizeImageName}</p>
                        <button onClick={() => { setSummarizeImage(null); setSummarizeImageName('') }}
                          className="text-gray-400 hover:text-red-500 transition"><X size={18} /></button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => imageRef.current?.click()}
                      className="w-full h-40 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-indigo-premium/50 hover:text-indigo-premium transition">
                      <Camera size={28} />
                      <span className="text-sm font-medium">Take a photo or upload image</span>
                      <span className="text-xs">Handwritten notes, whiteboard, textbook page</span>
                    </button>
                  )}
                </div>
              )}

              <button onClick={handleSummarize} disabled={summarizeLoading}
                className="w-full bg-gradient-to-r from-indigo-premium to-purple-premium text-white font-bold py-3.5 rounded-xl hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2">
                {summarizeLoading ? (
                  <><Loader size={20} className="animate-spin" /> Summarizing...</>
                ) : (
                  <><Sparkles size={20} /> Generate Summary</>
                )}
              </button>
            </div>

            {/* Summary result */}
            <AnimatePresence>
              {summary && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-2xl border border-indigo-premium/30 p-6 space-y-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles size={18} className="text-indigo-premium" />
                    <h3 className="font-sora font-bold text-navy">Summary</h3>
                  </div>
                  <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">{summary}</p>
                  <div className="flex gap-3 flex-wrap">
                    <button onClick={saveSummaryAsNote}
                      className="flex items-center gap-1.5 bg-indigo-premium text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-purple-premium transition">
                      <Plus size={15} /> Save to Notes
                    </button>
                    <button onClick={() => setSummary('')}
                      className="flex items-center gap-1.5 border border-gray-200 text-navy px-4 py-2 rounded-xl text-sm font-semibold hover:bg-gray-50 transition">
                      <X size={15} /> Clear
                    </button>
                    <button onClick={() => navigate('/sage')}
                      className="flex items-center gap-1.5 bg-gradient-to-r from-brand-blue/10 to-purple-500/10 text-indigo-premium px-4 py-2 rounded-xl text-sm font-semibold hover:opacity-80 transition">
                      🧠 Ask SAGE more
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  )
}
