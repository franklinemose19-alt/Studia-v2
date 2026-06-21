import { useAuth } from '../lib/AuthContext'
import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Trash2, Plus, Search, Edit2, X, Save, Camera, Image, Eye, Loader, Sparkles } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { loadAccess, checkAccess, consumeCredit, freeCreditsRemaining, isUnlimitedPlan, type AccessInfo, emptyAccess } from '../lib/access'

interface Note {
  id: string
  title: string
  content: string
  date: string
  course?: string
  images?: string[]
}

const openDB = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const req = indexedDB.open('studia-notes', 1)
    req.onupgradeneeded = (e: any) => e.target.result.createObjectStore('images')
    req.onsuccess = (e: any) => resolve(e.target.result)
    req.onerror = () => reject(req.error)
  })

const saveImage = async (id: string, dataUrl: string) => {
  try {
    const db = await openDB()
    db.transaction('images', 'readwrite').objectStore('images').put(dataUrl, id)
  } catch (err) {
    console.error('Failed to save image:', err)
  }
}

const getImage = async (id: string): Promise<string | null> => {
  try {
    const db = await openDB()
    return new Promise((resolve) => {
      const req = db.transaction('images').objectStore('images').get(id)
      req.onsuccess = () => resolve(req.result || null)
      req.onerror = () => resolve(null)
    })
  } catch {
    return null
  }
}

const deleteImage = async (id: string) => {
  try {
    const db = await openDB()
    db.transaction('images', 'readwrite').objectStore('images').delete(id)
  } catch (err) {
    console.error('Failed to delete image:', err)
  }
}

export default function NotesLibrary() {
  const navigate = useNavigate()
  const [notes, setNotes] = useState<Note[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({ title: '', content: '', course: '' })
  const [formImages, setFormImages] = useState<{ id: string; url: string }[]>([])
  const [showCamera, setShowCamera] = useState(false)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [noteImages, setNoteImages] = useState<Record<string, string[]>>({})
  const [generating, setGenerating] = useState(false)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)

  const [access, setAccess] = useState<AccessInfo>(emptyAccess)
  const [accessLoaded, setAccessLoaded] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const generateInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem('notes')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setNotes(parsed)
        parsed.forEach(async (note: Note) => {
          if (note.images && note.images.length > 0) {
            const urls: string[] = []
            for (const imgId of note.images) {
              const url = await getImage(imgId)
              if (url) urls.push(url)
            }
            setNoteImages((prev) => ({ ...prev, [note.id]: urls }))
          }
        })
      } catch {
        setNotes([])
      }
    }

    const initAccess = async () => {
      const a = await loadAccess(userId)
      setAccess(a)
      setAccessLoaded(true)
    }
    initAccess()
  }, [])

  useEffect(() => {
    if (notes.length > 0) {
      localStorage.setItem('notes', JSON.stringify(notes))
    }
  }, [notes])

  const startCamera = async (mode: 'attach' | 'generate') => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      })
      streamRef.current = stream
      setShowCamera(mode)
      setTimeout(() => {
        if (videoRef.current) videoRef.current.srcObject = stream
      }, 100)
    } catch {
      alert('Camera access denied. Please allow camera access and try again.')
    }
  }

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setShowCamera(false)
  }

  const capturePhoto = async (mode: 'attach' | 'generate') => {
    if (!videoRef.current) return
    const canvas = document.createElement('canvas')
    canvas.width = videoRef.current.videoWidth
    canvas.height = videoRef.current.videoHeight
    canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
    stopCamera()

    if (mode === 'attach') {
      const imgId = `img-${Date.now()}`
      await saveImage(imgId, dataUrl)
      setFormImages((prev) => [...prev, { id: imgId, url: dataUrl }])
    } else {
      await generateNotesFromImage(dataUrl)
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    files.forEach((file) => {
      const reader = new FileReader()
      reader.onload = async (ev) => {
        const dataUrl = ev.target?.result as string
        const imgId = `img-${Date.now()}-${Math.random().toString(36).slice(2)}`
        await saveImage(imgId, dataUrl)
        setFormImages((prev) => [...prev, { id: imgId, url: dataUrl }])
      }
      reader.readAsDataURL(file)
    })
    e.target.value = ''
  }

  const handleGenerateUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result as string
      await generateNotesFromImage(dataUrl)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const removeFormImage = async (imgId: string) => {
    await deleteImage(imgId)
    setFormImages((prev) => prev.filter((img) => img.id !== imgId))
  }

  const generateNotesFromImage = async (dataUrl: string) => {
    const result = checkAccess(access, 'core')
    if (!result.allowed) {
      alert(
        result.reason === 'needs_pro'
          ? 'This feature needs a Pro or Semester plan.'
          : "You've used your free AI credits. Subscribe to continue, or earn a bonus credit by paying for a Lite lecture in Recording."
      )
      return
    }

    setGenerating(true)
    setCapturedImage(dataUrl)
    try {
      const res = await fetch('/api/generate-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: dataUrl }),
      })
      const data = await res.json()
      if (data.title || data.content) {
        setFormData({
          title: data.title || '',
          course: data.course || '',
          content: data.content || '',
        })
        const imgId = `img-${Date.now()}`
        await saveImage(imgId, dataUrl)
        setFormImages((prev) => [...prev, { id: imgId, url: dataUrl }])
        setShowForm(true)

        await consumeCredit(access, result.source)
        setAccess((prev) => ({
          ...prev,
          freeCreditsUsed: result.source === 'free' ? prev.freeCreditsUsed + 1 : prev.freeCreditsUsed,
          liteBonusCredits: result.source === 'lite' ? Math.max(0, prev.liteBonusCredits - 1) : prev.liteBonusCredits,
        }))
      } else {
        alert('Could not extract notes from image. Try a clearer photo.')
      }
    } catch (err) {
      alert('Failed to generate notes. Check your connection and try again.')
    } finally {
      setGenerating(false)
      setCapturedImage(null)
    }
  }

  const addNote = () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      alert('Please fill in title and content')
      return
    }

    const imageIds = formImages.map((img) => img.id)

    if (editingId) {
      setNotes(
        notes.map((n) =>
          n.id === editingId
            ? { ...n, title: formData.title, content: formData.content, course: formData.course, images: imageIds }
            : n
        )
      )
      setNoteImages((prev) => ({ ...prev, [editingId]: formImages.map((img) => img.url) }))
      setEditingId(null)
    } else {
      const newNote: Note = {
        id: `note-${Date.now()}`,
        title: formData.title,
        content: formData.content,
        course: formData.course,
        date: new Date().toLocaleDateString(),
        images: imageIds,
      }
      setNotes([newNote, ...notes])
      setNoteImages((prev) => ({ ...prev, [newNote.id]: formImages.map((img) => img.url) }))
    }

    setFormData({ title: '', content: '', course: '' })
    setFormImages([])
    setShowForm(false)
  }

  const deleteNote = async (id: string) => {
    const note = notes.find((n) => n.id === id)
    if (note?.images) {
      for (const imgId of note.images) await deleteImage(imgId)
    }
    setNotes(notes.filter((n) => n.id !== id))
  }

  const editNote = async (note: Note) => {
    setFormData({ title: note.title, content: note.content, course: note.course || '' })
    setEditingId(note.id)
    setShowForm(true)
    if (note.images && note.images.length > 0) {
      const loaded: { id: string; url: string }[] = []
      for (const imgId of note.images) {
        const url = await getImage(imgId)
        if (url) loaded.push({ id: imgId, url })
      }
      setFormImages(loaded)
    } else {
      setFormImages([])
    }
  }

  const cancelEdit = () => {
    setEditingId(null)
    setFormData({ title: '', content: '', course: '' })
    setFormImages([])
    setShowForm(false)
    stopCamera()
  }

  const filteredNotes = notes.filter(
    (n) =>
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (n.course && n.course.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const remaining = freeCreditsRemaining(access)

  return (
    <div className="min-h-screen bg-surface-base">

      <AnimatePresence>
        {generating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 flex flex-col items-center justify-center gap-6 p-4"
          >
            {capturedImage && (
              <img src={capturedImage} alt="Processing" className="w-48 h-48 object-cover rounded-2xl opacity-60" />
            )}
            <div className="flex items-center gap-3 text-white">
              <Loader className="animate-spin text-brand-blue" size={24} />
              <p className="text-lg font-medium">Reading your notes...</p>
            </div>
            <p className="text-[#8B97B5] text-sm text-center max-w-xs">
              AI is extracting and structuring the content from your image
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {previewImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
            onClick={() => setPreviewImage(null)}
          >
            <button className="absolute top-4 right-4 text-white hover:text-brand-blue">
              <X size={28} />
            </button>
            <img src={previewImage} alt="Preview" className="max-w-full max-h-[90vh] rounded-xl object-contain" />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCamera && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center gap-6 p-4"
          >
            <video ref={videoRef} autoPlay playsInline className="w-full max-w-lg rounded-2xl" />
            <div className="flex gap-4">
              <button
                onClick={() => capturePhoto(showCamera as 'attach' | 'generate')}
                className="bg-brand-blue text-white px-8 py-3 rounded-xl font-medium hover:bg-brand-blue/90"
              >
                📸 Capture
              </button>
              <button
                onClick={stopCamera}
                className="bg-white/10 text-white px-8 py-3 rounded-xl font-medium hover:bg-white/20"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <nav className="border-b border-white/5 bg-surface-elevated/50 backdrop-blur-md sticky top-0 z-10">
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

          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="font-sora font-bold text-4xl text-white mb-2">Notes Library</h1>
              <p className="text-[#8B97B5]">Save, organize, and access all your lecture notes.</p>
              {accessLoaded && (
                <p className="text-sm mt-2">
                  {isUnlimitedPlan(access) ? (
                    <span className="text-green-400">✨ Unlimited AI generation — {access.currentPlan} plan</span>
                  ) : remaining > 0 ? (
                    <span className="text-brand-blue">🎓 {remaining} free AI credit{remaining !== 1 ? 's' : ''} left for AI-generated notes</span>
                  ) : access.liteBonusCredits > 0 ? (
                    <span className="text-brand-blue">💳 {access.liteBonusCredits} bonus credit{access.liteBonusCredits !== 1 ? 's' : ''} available</span>
                  ) : (
                    <span className="text-brand-blue">💳 Free credits used — manual notes still free, AI generation needs a plan</span>
                  )}
                </p>
              )}
            </div>
            {!showForm && (
              <div className="flex gap-3 flex-wrap">
                <div className="flex gap-2">
                  <button
                    onClick={() => startCamera('generate')}
                    className="flex items-center gap-2 bg-purple-500/20 text-purple-400 border border-purple-500/30 px-4 py-3 rounded-xl hover:bg-purple-500/30 font-medium text-sm transition-colors"
                  >
                    <Camera size={18} />
                    Snap & Generate
                  </button>
                  <button
                    onClick={() => generateInputRef.current?.click()}
                    className="flex items-center gap-2 bg-purple-500/20 text-purple-400 border border-purple-500/30 px-4 py-3 rounded-xl hover:bg-purple-500/30 font-medium text-sm transition-colors"
                  >
                    <Sparkles size={18} />
                    Upload & Generate
                  </button>
                  <input
                    ref={generateInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleGenerateUpload}
                  />
                </div>
                <button
                  onClick={() => setShowForm(true)}
                  className="bg-brand-blue text-white px-6 py-3 rounded-xl hover:bg-brand-blue/90 flex items-center gap-2 font-medium"
                >
                  <Plus size={20} />
                  New Note
                </button>
              </div>
            )}
          </div>

          {showForm && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-surface-elevated border border-white/5 rounded-2xl p-6 space-y-4"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-sora font-bold text-xl text-white">
                  {editingId ? 'Edit Note' : 'Create New Note'}
                </h2>
                <button onClick={cancelEdit} className="text-[#8B97B5] hover:text-white">
                  <X size={24} />
                </button>
              </div>

              <input
                type="text"
                placeholder="Note title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full bg-surface-base border border-white/10 rounded-xl p-3 text-white placeholder-[#4A5568] outline-none focus:border-brand-blue/40"
              />

              <input
                type="text"
                placeholder="Course name (optional)"
                value={formData.course}
                onChange={(e) => setFormData({ ...formData, course: e.target.value })}
                className="w-full bg-surface-base border border-white/10 rounded-xl p-3 text-white placeholder-[#4A5568] outline-none focus:border-brand-blue/40"
              />

              <textarea
                placeholder="Write your notes here..."
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                className="w-full h-48 bg-surface-base border border-white/10 rounded-xl p-3 text-white placeholder-[#4A5568] outline-none focus:border-brand-blue/40 resize-none"
              />

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => startCamera('attach')}
                  className="flex-1 flex items-center justify-center gap-2 bg-surface-base border border-white/10 text-white py-3 rounded-xl hover:border-brand-blue/40 text-sm font-medium transition-colors"
                >
                  <Camera size={18} className="text-brand-blue" />
                  Take Photo
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 flex items-center justify-center gap-2 bg-surface-base border border-white/10 text-white py-3 rounded-xl hover:border-brand-blue/40 text-sm font-medium transition-colors"
                >
                  <Image size={18} className="text-brand-blue" />
                  Upload Image
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </div>

              {formImages.length > 0 && (
                <div className="grid grid-cols-3 gap-3">
                  {formImages.map((img) => (
                    <div key={img.id} className="relative group rounded-xl overflow-hidden aspect-square">
                      <img src={img.url} alt="Note" className="w-full h-full object-cover" />
                      <button
                        onClick={() => removeFormImage(img.id)}
                        className="absolute top-1 right-1 bg-black/70 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={addNote}
                className="w-full bg-brand-blue text-white font-medium py-3 rounded-xl hover:bg-brand-blue/90 flex items-center justify-center gap-2"
              >
                <Save size={20} />
                {editingId ? 'Update Note' : 'Save Note'}
              </button>
            </motion.div>
          )}

          {notes.length > 0 && (
            <div className="relative">
              <Search className="absolute left-4 top-3.5 text-[#4A5568]" size={20} />
              <input
                type="text"
                placeholder="Search notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-surface-elevated border border-white/10 rounded-xl p-3 pl-12 text-white placeholder-[#4A5568] outline-none focus:border-brand-blue/40"
              />
            </div>
          )}

          {filteredNotes.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredNotes.map((note, i) => (
                <motion.div
                  key={note.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-surface-elevated border border-white/5 rounded-2xl p-6 flex flex-col h-full hover:border-brand-blue/30 transition-all group"
                >
                  {noteImages[note.id] && noteImages[note.id].length > 0 && (
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      {noteImages[note.id].slice(0, 3).map((url, idx) => (
                        <div
                          key={idx}
                          className="relative rounded-lg overflow-hidden aspect-square cursor-pointer"
                          onClick={() => setPreviewImage(url)}
                        >
                          <img src={url} alt="Note" className="w-full h-full object-cover" />
                          {idx === 2 && noteImages[note.id].length > 3 && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-sm font-bold">
                              +{noteImages[note.id].length - 3}
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/20 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity">
                            <Eye size={16} className="text-white" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex-1">
                    <p className="font-sora font-bold text-white mb-1 group-hover:text-brand-blue transition-colors">
                      {note.title}
                    </p>
                    {note.course && <p className="text-xs text-brand-blue mb-3">{note.course}</p>}
                    <p className="text-sm text-[#8B97B5] line-clamp-3 mb-3">{note.content}</p>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-white/5">
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-[#4A5568]">{note.date}</p>
                      {note.images && note.images.length > 0 && (
                        <span className="text-xs text-brand-blue/70">📎 {note.images.length}</span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => editNote(note)}
                        className="p-2 rounded-lg bg-brand-blue/10 text-brand-blue hover:bg-brand-blue/20"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => deleteNote(note.id)}
                        className="p-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
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
              <p className="text-white font-medium mb-2">
                {notes.length === 0 ? 'No notes yet' : 'No notes match your search'}
              </p>
              <p className="text-[#8B97B5]">
                {notes.length === 0
                  ? 'Create a note manually or snap a photo to generate notes with AI!'
                  : 'Try a different search term.'}
              </p>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
