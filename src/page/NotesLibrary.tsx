import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Trash2, Plus, Search, Edit2, X, Save, Camera,
  Image as ImageIcon, Loader, Sparkles, Copy, Download,
} from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  loadAccess, checkAccess, consumeCredit, freeCreditsRemaining,
  isUnlimitedPlan, type AccessInfo, emptyAccess,
} from '../lib/access'
import { useAuth } from '../lib/AuthContext'
import { buildStudentContext, formatContextForAI } from '../lib/studentContext'
import StudyChat from '../components/StudyChat'

interface Note {
  id: string
  title: string
  content: string
  date: string
  course?: string
  images?: string[]
}

type CameraMode = null | 'notes-attach' | 'notes-generate' | 'summarize'

const openDB = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const req = indexedDB.open('studia-notes', 1)
    req.onupgradeneeded = (e: any) => e.target.result.createObjectStore('images')
    req.onsuccess = (e: any) => resolve(e.target.result)
    req.onerror = () => reject(req.error)
  })

const saveImage = async (id: string, dataUrl: string) => {
  try { const db = await openDB(); db.transaction('images', 'readwrite').objectStore('images').put(dataUrl, id) } catch {}
}

const getImage = async (id: string): Promise<string | null> => {
  try {
    const db = await openDB()
    return new Promise((resolve) => {
      const req = db.transaction('images').objectStore('images').get(id)
      req.onsuccess = () => resolve(req.result || null)
      req.onerror = () => resolve(null)
    })
  } catch { return null }
}

const deleteImage = async (id: string) => {
  try { const db = await openDB(); db.transaction('images', 'readwrite').objectStore('images').delete(id) } catch {}
}

export default function NotesPage() {
  const navigate = useNavigate()
  const { userId } = useAuth()
  const [searchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState<'notes' | 'summarize'>(
    searchParams.get('tab') === 'summarize' ? 'summarize' : 'notes'
  )

  // ── Access ──────────────────────────────────────────────────────────────
  const [access, setAccess] = useState<AccessInfo>(emptyAccess)
  const [accessLoaded, setAccessLoaded] = useState(false)

  // ── Shared camera ────────────────────────────────────────────────────────
  const [cameraMode, setCameraMode] = useState<CameraMode>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // ── Notes state ──────────────────────────────────────────────────────────
  const [notes, setNotes] = useState<Note[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({ title: '', content: '', course: '' })
  const [formImages, setFormImages] = useState<{ id: string; url: string }[]>([])
  const [noteImages, setNoteImages] = useState<Record<string, string[]>>({})
  const [generating, setGenerating] = useState(false)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const notesFileRef = useRef<HTMLInputElement>(null)
  const generateFileRef = useRef<HTMLInputElement>(null)

  // ── Summarize state ──────────────────────────────────────────────────────
  const [summarizeText, setSummarizeText] = useState('')
  const [summarizeImage, setSummarizeImage] = useState<string | null>(null)
  const [summary, setSummary] = useState('')
  const [summarizeLoading, setSummarizeLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [inputMode, setInputMode] = useState<'text' | 'image'>('text')
  const summarizeFileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const saved = localStorage.getItem('notes')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setNotes(parsed)
        parsed.forEach(async (note: Note) => {
          if (note.images?.length) {
            const urls: string[] = []
            for (const imgId of note.images) {
              const url = await getImage(imgId)
              if (url) urls.push(url)
            }
            setNoteImages(prev => ({ ...prev, [note.id]: urls }))
          }
        })
      } catch { setNotes([]) }
    }
    const initAccess = async () => {
      const a = await loadAccess(userId)
      setAccess(a)
      setAccessLoaded(true)
    }
    initAccess()
  }, [])

  useEffect(() => {
    if (notes.length > 0) localStorage.setItem('notes', JSON.stringify(notes))
  }, [notes])

  // ── Camera ───────────────────────────────────────────────────────────────
  const startCamera = async (mode: CameraMode) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      streamRef.current = stream
      setCameraMode(mode)
      setTimeout(() => { if (videoRef.current) videoRef.current.srcObject = stream }, 100)
    } catch { alert('Camera access denied. Please allow camera access and try again.') }
  }

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    setCameraMode(null)
  }

  const capturePhoto = async () => {
    if (!videoRef.current) return
    const canvas = document.createElement('canvas')
    canvas.width = videoRef.current.videoWidth
    canvas.height = videoRef.current.videoHeight
    canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
    const mode = cameraMode
    stopCamera()

    if (mode === 'notes-attach') {
      const imgId = `img-${Date.now()}`
      await saveImage(imgId, dataUrl)
      setFormImages(prev => [...prev, { id: imgId, url: dataUrl }])
    } else if (mode === 'notes-generate') {
      await generateFromImage(dataUrl)
    } else if (mode === 'summarize') {
      setSummarizeImage(dataUrl)
      setInputMode('image')
    }
  }

  // ── Notes AI generate ─────────────────────────────────────────────────────
  const generateFromImage = async (dataUrl: string) => {
    const result = checkAccess(access, 'core')
    if (!result.allowed) {
      alert("You've used your free AI credits. Subscribe to continue, or earn a bonus credit by paying for a Lite lecture.")
      return
    }
    setGenerating(true)
    try {
      const res = await fetch('/api/generate-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: dataUrl }),
      })
      const data = await res.json()
      if (data.title || data.content) {
        setFormData({ title: data.title || '', course: data.course || '', content: data.content || '' })
        const imgId = `img-${Date.now()}`
        await saveImage(imgId, dataUrl)
        setFormImages(prev => [...prev, { id: imgId, url: dataUrl }])
        setShowForm(true)
        await consumeCredit(access, result.source)
        setAccess(prev => ({
          ...prev,
          freeCreditsUsed: result.source === 'free' ? prev.freeCreditsUsed + 1 : prev.freeCreditsUsed,
          liteBonusCredits: result.source === 'lite' ? Math.max(0, prev.liteBonusCredits - 1) : prev.liteBonusCredits,
        }))
      } else {
        alert('Could not extract notes from image. Try a clearer photo.')
      }
    } catch { alert('Failed to generate notes. Check your connection.') }
    finally { setGenerating(false) }
  }

  const handleGenerateFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (ev) => { await generateFromImage(ev.target?.result as string) }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  // ── Notes CRUD ───────────────────────────────────────────────────────────
  const handleNotesFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    files.forEach(file => {
      const reader = new FileReader()
      reader.onload = async (ev) => {
        const dataUrl = ev.target?.result as string
        const imgId = `img-${Date.now()}-${Math.random().toString(36).slice(2)}`
        await saveImage(imgId, dataUrl)
        setFormImages(prev => [...prev, { id: imgId, url: dataUrl }])
      }
      reader.readAsDataURL(file)
    })
    e.target.value = ''
  }

  const removeFormImage = async (imgId: string) => {
    await deleteImage(imgId)
    setFormImages(prev => prev.filter(img => img.id !== imgId))
  }

  const addNote = () => {
    if (!formData.title.trim() || !formData.content.trim()) { alert('Please fill in title and content'); return }
    const imageIds = formImages.map(img => img.id)
    if (editingId) {
      setNotes(notes.map(n => n.id === editingId ? { ...n, ...formData, images: imageIds } : n))
      setNoteImages(prev => ({ ...prev, [editingId]: formImages.map(img => img.url) }))
      setEditingId(null)
    } else {
      const newNote: Note = { id: `note-${Date.now()}`, ...formData, date: new Date().toLocaleDateString(), images: imageIds }
      setNotes([newNote, ...notes])
      setNoteImages(prev => ({ ...prev, [newNote.id]: formImages.map(img => img.url) }))
    }
    setFormData({ title: '', content: '', course: '' })
    setFormImages([])
    setShowForm(false)
  }

  const deleteNote = async (id: string) => {
    const note = notes.find(n => n.id === id)
    if (note?.images) { for (const imgId of note.images) await deleteImage(imgId) }
    setNotes(notes.filter(n => n.id !== id))
  }

  const editNote = async (note: Note) => {
    setFormData({ title: note.title, content: note.content, course: note.course || '' })
    setEditingId(note.id)
    setShowForm(true)
    if (note.images?.length) {
      const loaded: { id: string; url: string }[] = []
      for (const imgId of note.images) { const url = await getImage(imgId); if (url) loaded.push({ id: imgId, url }) }
      setFormImages(loaded)
    } else { setFormImages([]) }
  }

  const cancelForm = () => {
    setEditingId(null)
    setFormData({ title: '', content: '', course: '' })
    setFormImages([])
    setShowForm(false)
    stopCamera()
  }

  const filteredNotes = notes.filter(n =>
    n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    n.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (n.course && n.course.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  // ── Summarize ─────────────────────────────────────────────────────────────
  const handleSummarizeFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => { setSummarizeImage(ev.target?.result as string); setInputMode('image') }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const generateSummary = async () => {
    if (inputMode === 'text' && !summarizeText.trim()) { alert('Please paste your notes'); return }
    if (inputMode === 'image' && !summarizeImage) { alert('Please capture or upload an image'); return }
    const result = checkAccess(access, 'core')
    if (!result.allowed) { alert("You've used your free AI credits. Subscribe to continue."); return }
    setSummarizeLoading(true)
    try {
      const body = inputMode === 'image' ? { image: summarizeImage } : { text: summarizeText }
      const res = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (data.summary) {
        setSummary(data.summary)
        await consumeCredit(access, result.source)
        setAccess(prev => ({
          ...prev,
          freeCreditsUsed: result.source === 'free' ? prev.freeCreditsUsed + 1 : prev.freeCreditsUsed,
          liteBonusCredits: result.source === 'lite' ? Math.max(0, prev.liteBonusCredits - 1) : prev.liteBonusCredits,
        }))
      } else { alert('Error: ' + (data.error || 'Failed to generate summary')) }
    } catch (err) { alert('Error: ' + (err instanceof Error ? err.message : 'Unknown error')) }
    finally { setSummarizeLoading(false) }
  }

  const copySummary = () => { navigator.clipboard.writeText(summary); setCopied(true); setTimeout(() => setCopied(false), 2000) }
  const downloadSummary = () => {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([summary], { type: 'text/plain' }))
    a.download = 'summary.txt'
    a.click()
  }

  const remaining = freeCreditsRemaining(access)
  const studentContextStr = formatContextForAI(buildStudentContext(access.currentPlan))
  const canSummarize = inputMode === 'text' ? summarizeText.trim().length > 0 : !!summarizeImage

  return (
    <div className="min-h-screen bg-surface-base">

      {/* Camera modal */}
      <AnimatePresence>
        {cameraMode && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center gap-6 p-4">
            <video ref={videoRef} autoPlay playsInline className="w-full max-w-lg rounded-2xl" />
            <div className="flex gap-4">
              <button onClick={capturePhoto} className="bg-brand-blue text-white px-8 py-3 rounded-xl font-medium hover:bg-brand-blue/90">📸 Capture</button>
              <button onClick={stopCamera} className="bg-white/10 text-white px-8 py-3 rounded-xl font-medium hover:bg-white/20">Cancel</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Image preview modal */}
      <AnimatePresence>
        {previewImage && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
            onClick={() => setPreviewImage(null)}>
            <button className="absolute top-4 right-4 text-white hover:text-brand-blue"><X size={28} /></button>
            <img src={previewImage} alt="Preview" className="max-w-full max-h-[90vh] rounded-xl object-contain" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Generating overlay */}
      <AnimatePresence>
        {generating && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 flex flex-col items-center justify-center gap-4 p-4">
            <Loader className="animate-spin text-brand-blue" size={32} />
            <p className="text-white font-medium">Reading your notes...</p>
            <p className="text-[#8B97B5] text-sm text-center max-w-xs">AI is extracting and structuring the content from your image</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Nav */}
      <nav className="border-b border-white/5 bg-surface-elevated/50 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-sm text-[#8B97B5] hover:text-white">
            <ArrowLeft size={16} /> Back
          </button>
          <div className="flex items-center gap-1">
            <span className="font-sora font-bold text-xl text-white">STUDIA</span>
            <sup className="text-brand-blue text-xs">β</sup>
          </div>
          <div className="w-16" />
        </div>
      </nav>

      {/* Tab bar — sticky below nav */}
      <div className="sticky top-16 z-10 bg-surface-base border-b border-white/5 px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto space-y-2">
          <div className="flex bg-surface-elevated rounded-xl p-1 gap-1 max-w-xs">
            <button
              onClick={() => setActiveTab('notes')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'notes' ? 'bg-brand-blue text-white' : 'text-[#8B97B5] hover:text-white'}`}
            >
              📝 My Notes
            </button>
            <button
              onClick={() => setActiveTab('summarize')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'summarize' ? 'bg-brand-blue text-white' : 'text-[#8B97B5] hover:text-white'}`}
            >
              ✨ Summarize
            </button>
          </div>
          {accessLoaded && (
            <p className="text-xs text-brand-blue">
              {isUnlimitedPlan(access) ? `✨ Unlimited — ${access.currentPlan} plan`
                : remaining > 0 ? `🎓 ${remaining} free AI credit${remaining !== 1 ? 's' : ''} left`
                : access.liteBonusCredits > 0 ? `💳 ${access.liteBonusCredits} bonus credit${access.liteBonusCredits !== 1 ? 's' : ''} available`
                : '💳 Free credits used — subscribe to continue'}
            </p>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">

        {/* ── MY NOTES TAB ──────────────────────────────────────────────── */}
        {activeTab === 'notes' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="font-sora font-bold text-3xl sm:text-4xl text-white">My Notes</h1>
                <p className="text-[#8B97B5] text-sm mt-1">Save, organize, and access all your lecture notes.</p>
              </div>
              {!showForm && (
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => startCamera('notes-generate')}
                    className="flex items-center gap-2 bg-purple-500/20 text-purple-400 border border-purple-500/30 px-3 py-2.5 rounded-xl hover:bg-purple-500/30 text-xs font-medium transition-colors">
                    <Camera size={15} /> Snap & Generate
                  </button>
                  <button onClick={() => generateFileRef.current?.click()}
                    className="flex items-center gap-2 bg-purple-500/20 text-purple-400 border border-purple-500/30 px-3 py-2.5 rounded-xl hover:bg-purple-500/30 text-xs font-medium transition-colors">
                    <Sparkles size={15} /> Upload & Generate
                  </button>
                  <input ref={generateFileRef} type="file" accept="image/*" className="hidden" onChange={handleGenerateFileUpload} />
                  <button onClick={() => setShowForm(true)}
                    className="bg-brand-blue text-white px-4 py-2.5 rounded-xl hover:bg-brand-blue/90 flex items-center gap-2 text-sm font-medium">
                    <Plus size={18} /> New Note
                  </button>
                </div>
              )}
            </div>

            {showForm && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="bg-surface-elevated border border-white/5 rounded-2xl p-5 sm:p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-sora font-bold text-lg text-white">{editingId ? 'Edit Note' : 'Create New Note'}</h2>
                  <button onClick={cancelForm} className="text-[#8B97B5] hover:text-white"><X size={22} /></button>
                </div>
                <input type="text" placeholder="Note title" value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-surface-base border border-white/10 rounded-xl p-3 text-white placeholder-[#4A5568] outline-none focus:border-brand-blue/40 text-base" />
                <input type="text" placeholder="Course name (optional)" value={formData.course}
                  onChange={e => setFormData({ ...formData, course: e.target.value })}
                  className="w-full bg-surface-base border border-white/10 rounded-xl p-3 text-white placeholder-[#4A5568] outline-none focus:border-brand-blue/40 text-base" />
                <textarea placeholder="Write your notes here..." value={formData.content}
                  onChange={e => setFormData({ ...formData, content: e.target.value })}
                  className="w-full h-40 bg-surface-base border border-white/10 rounded-xl p-3 text-white placeholder-[#4A5568] outline-none focus:border-brand-blue/40 resize-none text-base" />
                <div className="flex gap-2">
                  <button onClick={() => startCamera('notes-attach')}
                    className="flex-1 flex items-center justify-center gap-2 bg-surface-base border border-white/10 text-white py-3 rounded-xl hover:border-brand-blue/40 text-sm font-medium transition-colors">
                    <Camera size={17} className="text-brand-blue" /> Take Photo
                  </button>
                  <button onClick={() => notesFileRef.current?.click()}
                    className="flex-1 flex items-center justify-center gap-2 bg-surface-base border border-white/10 text-white py-3 rounded-xl hover:border-brand-blue/40 text-sm font-medium transition-colors">
                    <ImageIcon size={17} className="text-brand-blue" /> Upload Image
                  </button>
                  <input ref={notesFileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleNotesFileUpload} />
                </div>
                {formImages.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {formImages.map(img => (
                      <div key={img.id} className="relative group rounded-xl overflow-hidden aspect-square">
                        <img src={img.url} alt="Note" className="w-full h-full object-cover" />
                        <button onClick={() => removeFormImage(img.id)}
                          className="absolute top-1 right-1 bg-black/70 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <button onClick={addNote}
                  className="w-full bg-brand-blue text-white font-medium py-3.5 rounded-xl hover:bg-brand-blue/90 flex items-center justify-center gap-2">
                  <Save size={18} /> {editingId ? 'Update Note' : 'Save Note'}
                </button>
              </motion.div>
            )}

            {notes.length > 0 && (
              <div className="relative">
                <Search className="absolute left-4 top-3.5 text-[#4A5568]" size={18} />
                <input type="text" placeholder="Search notes..." value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-surface-elevated border border-white/10 rounded-xl p-3 pl-11 text-white placeholder-[#4A5568] outline-none focus:border-brand-blue/40" />
              </div>
            )}

            {filteredNotes.length > 0 ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredNotes.map((note, i) => (
                  <motion.div key={note.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                    className="bg-surface-elevated border border-white/5 rounded-2xl p-5 flex flex-col hover:border-brand-blue/30 transition-all group min-w-0 overflow-hidden">
                    {noteImages[note.id]?.length > 0 && (
                      <div className="grid grid-cols-3 gap-1.5 mb-3">
                        {noteImages[note.id].slice(0, 3).map((url, idx) => (
                          <div key={idx} className="relative rounded-lg overflow-hidden aspect-square cursor-pointer" onClick={() => setPreviewImage(url)}>
                            <img src={url} alt="Note" className="w-full h-full object-cover" />
                            {idx === 2 && noteImages[note.id].length > 3 && (
                              <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-xs font-bold">
                                +{noteImages[note.id].length - 3}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-sora font-bold text-white mb-1 break-words group-hover:text-brand-blue transition-colors">{note.title}</p>
                      {note.course && <p className="text-xs text-brand-blue mb-2 break-words">{note.course}</p>}
                      <p className="text-sm text-[#8B97B5] line-clamp-3 mb-3 break-words">{note.content}</p>
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-white/5">
                      <p className="text-xs text-[#4A5568]">{note.date}</p>
                      <div className="flex gap-1.5">
                        <button onClick={() => editNote(note)} className="p-2 rounded-lg bg-brand-blue/10 text-brand-blue hover:bg-brand-blue/20"><Edit2 size={15} /></button>
                        <button onClick={() => deleteNote(note.id)} className="p-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20"><Trash2 size={15} /></button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="bg-surface-elevated border border-white/5 rounded-2xl p-12 text-center">
                <p className="text-white font-medium mb-2">{notes.length === 0 ? 'No notes yet' : 'No notes match your search'}</p>
                <p className="text-[#8B97B5] text-sm">{notes.length === 0 ? 'Create a note manually or snap a photo to generate AI notes!' : 'Try a different search term.'}</p>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* ── SUMMARIZE TAB ──────────────────────────────────────────────── */}
        {activeTab === 'summarize' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-4xl">
            <div>
              <h1 className="font-sora font-bold text-3xl sm:text-4xl text-white">Summarize</h1>
              <p className="text-[#8B97B5] text-sm mt-1">Type, paste, snap a photo, or upload an image — get an AI summary instantly.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Input panel */}
              <div className="bg-surface-elevated border border-white/5 rounded-2xl p-5 space-y-4">
                <div className="flex bg-surface-base rounded-xl p-1 gap-1">
                  <button onClick={() => setInputMode('text')}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${inputMode === 'text' ? 'bg-brand-blue text-white' : 'text-[#8B97B5] hover:text-white'}`}>
                    ✏️ Type / Paste
                  </button>
                  <button onClick={() => setInputMode('image')}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${inputMode === 'image' ? 'bg-brand-blue text-white' : 'text-[#8B97B5] hover:text-white'}`}>
                    📷 Photo / Image
                  </button>
                </div>

                <AnimatePresence mode="wait">
                  {inputMode === 'text' ? (
                    <motion.div key="text" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <textarea value={summarizeText} onChange={e => setSummarizeText(e.target.value)}
                        placeholder="Paste your lecture notes here... The more detailed, the better the summary!"
                        className="w-full h-56 bg-surface-base border border-white/10 rounded-xl p-4 text-white placeholder-[#4A5568] outline-none focus:border-brand-blue/40 resize-none text-base" />
                    </motion.div>
                  ) : (
                    <motion.div key="image" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                      {summarizeImage ? (
                        <div className="relative rounded-xl overflow-hidden">
                          <img src={summarizeImage} alt="Upload" className="w-full h-56 object-cover rounded-xl" />
                          <button onClick={() => setSummarizeImage(null)}
                            className="absolute top-2 right-2 bg-black/70 text-white rounded-full p-1 hover:bg-black">
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <div className="h-56 bg-surface-base border border-white/10 border-dashed rounded-xl flex flex-col items-center justify-center gap-4 text-[#4A5568]">
                          <p className="text-sm">Snap or upload a photo of your notes</p>
                          <div className="flex gap-3">
                            <button onClick={() => startCamera('summarize')}
                              className="flex items-center gap-2 bg-surface-elevated border border-white/10 text-white px-4 py-2 rounded-xl hover:border-brand-blue/40 text-sm transition-colors">
                              <Camera size={16} className="text-brand-blue" /> Camera
                            </button>
                            <button onClick={() => summarizeFileRef.current?.click()}
                              className="flex items-center gap-2 bg-surface-elevated border border-white/10 text-white px-4 py-2 rounded-xl hover:border-brand-blue/40 text-sm transition-colors">
                              <ImageIcon size={16} className="text-brand-blue" /> Gallery
                            </button>
                          </div>
                        </div>
                      )}
                      {summarizeImage && (
                        <div className="flex gap-2">
                          <button onClick={() => startCamera('summarize')}
                            className="flex-1 flex items-center justify-center gap-2 bg-surface-base border border-white/10 text-white py-2 rounded-xl hover:border-brand-blue/40 text-sm transition-colors">
                            <Camera size={15} className="text-brand-blue" /> Retake
                          </button>
                          <button onClick={() => summarizeFileRef.current?.click()}
                            className="flex-1 flex items-center justify-center gap-2 bg-surface-base border border-white/10 text-white py-2 rounded-xl hover:border-brand-blue/40 text-sm transition-colors">
                            <ImageIcon size={15} className="text-brand-blue" /> Change
                          </button>
                        </div>
                      )}
                      <input ref={summarizeFileRef} type="file" accept="image/*" className="hidden" onChange={handleSummarizeFileUpload} />
                    </motion.div>
                  )}
                </AnimatePresence>

                <button onClick={generateSummary} disabled={summarizeLoading || !canSummarize}
                  className="w-full bg-brand-blue text-white font-medium py-3.5 rounded-xl hover:bg-brand-blue/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                  {summarizeLoading
                    ? (<><Loader className="w-4 h-4 animate-spin" />{inputMode === 'image' ? 'Reading image...' : 'Generating...'}</>)
                    : 'Generate Summary'}
                </button>
              </div>

              {/* Output panel */}
              <div className="bg-surface-elevated border border-white/5 rounded-2xl p-5 space-y-4">
                <label className="block text-sm font-medium text-white">Your Summary:</label>
                {summary ? (
                  <>
                    <div className="h-56 bg-surface-base border border-white/10 rounded-xl p-4 overflow-y-auto">
                      <p className="text-[#8B97B5] leading-relaxed whitespace-pre-wrap text-sm">{summary}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={copySummary}
                        className="flex-1 flex items-center justify-center gap-2 bg-brand-blue/10 text-brand-blue py-2.5 rounded-xl hover:bg-brand-blue/20 text-sm font-medium">
                        <Copy size={15} /> {copied ? 'Copied!' : 'Copy'}
                      </button>
                      <button onClick={downloadSummary}
                        className="flex-1 flex items-center justify-center gap-2 bg-brand-blue/10 text-brand-blue py-2.5 rounded-xl hover:bg-brand-blue/20 text-sm font-medium">
                        <Download size={15} /> Download
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="h-56 bg-surface-base border border-white/10 rounded-xl p-4 flex items-center justify-center text-[#4A5568] text-center text-sm">
                    Your summary will appear here...
                  </div>
                )}
              </div>
            </div>

            {summary && (
              <StudyChat
                documentContext={summary}
                studentContext={studentContextStr}
                mode="notes"
                placeholder="Ask about this summary..."
                welcomeMessage="I've summarized your notes! Ask me to go deeper on any point, explain something differently, or tell you what's likely to come up in exams. 📚"
              />
            )}
          </motion.div>
        )}
      </div>
    </div>
  )
}
