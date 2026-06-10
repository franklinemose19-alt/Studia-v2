import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Trash2, Plus, Search, Edit2, X, Save } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface Note {
  id: string
  title: string
  content: string
  date: string
  course?: string
}

export default function NotesLibrary() {
  const navigate = useNavigate()
  const [notes, setNotes] = useState<Note[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({ title: '', content: '', course: '' })

  useEffect(() => {
    const saved = localStorage.getItem('notes')
    if (saved) {
      try {
        setNotes(JSON.parse(saved))
      } catch {
        setNotes([])
      }
    }
  }, [])

  useEffect(() => {
    if (notes.length > 0) {
      localStorage.setItem('notes', JSON.stringify(notes))
    }
  }, [notes])

  const addNote = () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      alert('Please fill in title and content')
      return
    }

    if (editingId) {
      setNotes(
        notes.map((n) =>
          n.id === editingId
            ? { ...n, title: formData.title, content: formData.content, course: formData.course }
            : n
        )
      )
      setEditingId(null)
    } else {
      const newNote: Note = {
        id: `note-${Date.now()}`,
        title: formData.title,
        content: formData.content,
        course: formData.course,
        date: new Date().toLocaleDateString(),
      }
      setNotes([newNote, ...notes])
    }

    setFormData({ title: '', content: '', course: '' })
    setShowForm(false)
  }

  const deleteNote = (id: string) => {
    setNotes(notes.filter((n) => n.id !== id))
  }

  const editNote = (note: Note) => {
    setFormData({ title: note.title, content: note.content, course: note.course || '' })
    setEditingId(note.id)
    setShowForm(true)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setFormData({ title: '', content: '', course: '' })
    setShowForm(false)
  }

  const filteredNotes = notes.filter(
    (n) =>
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (n.course && n.course.toLowerCase().includes(searchQuery.toLowerCase()))
  )

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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-sora font-bold text-4xl text-white mb-2">Notes Library</h1>
              <p className="text-[#8B97B5]">Save, organize, and access all your lecture notes.</p>
            </div>
            {!showForm && (
              <button
                onClick={() => setShowForm(true)}
                className="bg-brand-blue text-white px-6 py-3 rounded-xl hover:bg-brand-blue/90 flex items-center gap-2 font-medium"
              >
                <Plus size={20} />
                New Note
              </button>
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
                  <div className="flex-1">
                    <p className="font-sora font-bold text-white mb-1 group-hover:text-brand-blue transition-colors">
                      {note.title}
                    </p>
                    {note.course && <p className="text-xs text-brand-blue mb-3">{note.course}</p>}
                    <p className="text-sm text-[#8B97B5] line-clamp-3 mb-3">{note.content}</p>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-white/5">
                    <p className="text-xs text-[#4A5568]">{note.date}</p>
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
                {notes.length === 0 ? 'Create your first note to get started!' : 'Try a different search term.'}
              </p>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
