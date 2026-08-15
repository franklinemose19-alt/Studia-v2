import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Plus, Trash2, BookOpen, ChevronDown,
  ChevronUp, Edit2, Check, X, GraduationCap,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { toast } from '../lib/toast'
import { loadCourses, saveCourses, onCoursesChanged, generateId, type Course, type Unit } from '../lib/courseStore'

export default function UnitManagement() {
  const navigate = useNavigate()
  const [courses, setCourses] = useState<Course[]>([])
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null)

  const [showAddCourse, setShowAddCourse] = useState(false)
  const [newCourseName, setNewCourseName] = useState('')
  const [newCourseCode, setNewCourseCode] = useState('')

  const [addingUnitFor, setAddingUnitFor] = useState<string | null>(null)
  const [newUnitName, setNewUnitName] = useState('')
  const [newTopicInput, setNewTopicInput] = useState('')
  const [newTopics, setNewTopics] = useState<string[]>([])

  const [editingCourseId, setEditingCourseId] = useState<string | null>(null)
  const [editCourseName, setEditCourseName] = useState('')

  useEffect(() => {
    setCourses(loadCourses())
    // Live sync — picks up changes made from Recording's quick-add form too,
    // and from another tab, without needing a page refresh.
    const unsubscribe = onCoursesChanged(() => setCourses(loadCourses()))
    return unsubscribe
  }, [])

  const addCourse = () => {
    if (!newCourseName.trim()) { toast.error('Please enter a course name'); return }
    const course: Course = {
      id: generateId(),
      name: newCourseName.trim(),
      code: newCourseCode.trim() || undefined,
      units: [],
      createdAt: new Date().toISOString(),
    }
    const updated = [...courses, course]
    setCourses(updated)
    saveCourses(updated)
    setNewCourseName('')
    setNewCourseCode('')
    setShowAddCourse(false)
    setExpandedCourse(course.id)
    toast.success(`"${course.name}" added!`)
  }

  const deleteCourse = (id: string) => {
    const updated = courses.filter(c => c.id !== id)
    setCourses(updated)
    saveCourses(updated)
    toast.info('Course removed')
  }

  const startEditCourse = (course: Course) => {
    setEditingCourseId(course.id)
    setEditCourseName(course.name)
  }

  const saveEditCourse = (id: string) => {
    if (!editCourseName.trim()) { toast.error('Course name cannot be empty'); return }
    const updated = courses.map(c => c.id === id ? { ...c, name: editCourseName.trim() } : c)
    setCourses(updated)
    saveCourses(updated)
    setEditingCourseId(null)
  }

  const addTopic = () => {
    if (!newTopicInput.trim()) return
    if (newTopics.includes(newTopicInput.trim())) { toast.error('Topic already added'); return }
    setNewTopics(prev => [...prev, newTopicInput.trim()])
    setNewTopicInput('')
  }

  const addUnit = (courseId: string) => {
    if (!newUnitName.trim()) { toast.error('Please enter a unit name'); return }
    const unit: Unit = {
      id: generateId(),
      name: newUnitName.trim(),
      topics: newTopics,
    }
    const updated = courses.map(c =>
      c.id === courseId ? { ...c, units: [...c.units, unit] } : c
    )
    setCourses(updated)
    saveCourses(updated)
    setAddingUnitFor(null)
    setNewUnitName('')
    setNewTopics([])
    setNewTopicInput('')
    toast.success(`Unit "${unit.name}" added!`)
  }

  const deleteUnit = (courseId: string, unitId: string) => {
    const updated = courses.map(c =>
      c.id === courseId ? { ...c, units: c.units.filter(u => u.id !== unitId) } : c
    )
    setCourses(updated)
    saveCourses(updated)
    toast.info('Unit removed')
  }

  const removeTopic = (topic: string) => {
    setNewTopics(prev => prev.filter(t => t !== topic))
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-surface-light to-white">
      <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-navy hover:text-indigo-premium transition">
            <ArrowLeft size={20} />
            <span className="hidden sm:inline font-medium">Back</span>
          </button>
          <span className="font-sora font-bold text-lg text-navy">Unit Management</span>
          <button
            onClick={() => { setShowAddCourse(true); setExpandedCourse(null) }}
            className="flex items-center gap-1.5 bg-indigo-premium text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-purple-premium transition"
          >
            <Plus size={16} /> Add Course
          </button>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        <div>
          <h1 className="font-sora font-bold text-3xl sm:text-4xl text-navy mb-2">Your Courses</h1>
          <p className="text-gray-500 text-sm">Add your university courses and units. STUDIA uses these to organise your lecture recordings and notes. Anything you add here also shows up instantly when recording — and vice versa.</p>
        </div>

        <AnimatePresence>
          {showAddCourse && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-sora font-bold text-lg text-navy">New Course</h2>
                <button onClick={() => setShowAddCourse(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={20} />
                </button>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-navy mb-2">Course Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Introduction to Biology"
                    value={newCourseName}
                    onChange={e => setNewCourseName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') addCourse() }}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-navy placeholder-gray-400 outline-none focus:border-indigo-premium transition text-base"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-navy mb-2">Course Code (optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. BIO101"
                    value={newCourseCode}
                    onChange={e => setNewCourseCode(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') addCourse() }}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-navy placeholder-gray-400 outline-none focus:border-indigo-premium transition text-base"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={addCourse} className="flex-1 bg-indigo-premium text-white font-semibold py-3 rounded-xl hover:bg-purple-premium transition">
                  Add Course
                </button>
                <button onClick={() => setShowAddCourse(false)} className="flex-1 bg-gray-100 text-navy font-semibold py-3 rounded-xl hover:bg-gray-200 transition">
                  Cancel
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {courses.length === 0 && !showAddCourse && (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center">
            <GraduationCap size={40} className="mx-auto text-gray-300 mb-4" />
            <p className="font-sora font-bold text-navy text-lg mb-2">No courses yet</p>
            <p className="text-gray-500 text-sm mb-6">Add your first course to start organising your study materials.</p>
            <button onClick={() => setShowAddCourse(true)}
              className="bg-indigo-premium text-white px-6 py-3 rounded-xl font-semibold hover:bg-purple-premium transition">
              Add Your First Course
            </button>
          </div>
        )}

        <div className="space-y-4">
          {courses.map(course => (
            <div key={course.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 flex items-center justify-between gap-3">
                <button onClick={() => setExpandedCourse(expandedCourse === course.id ? null : course.id)}
                  className="flex-1 flex items-center gap-3 text-left min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-premium to-purple-premium flex items-center justify-center shrink-0">
                    <BookOpen size={18} className="text-white" />
                  </div>
                  <div className="min-w-0">
                    {editingCourseId === course.id ? (
                      <input
                        value={editCourseName}
                        onChange={e => setEditCourseName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') saveEditCourse(course.id) }}
                        className="border border-indigo-premium rounded-lg px-3 py-1 text-navy outline-none text-sm font-semibold"
                        onClick={e => e.stopPropagation()}
                        autoFocus
                      />
                    ) : (
                      <p className="font-sora font-bold text-navy truncate">{course.name}</p>
                    )}
                    <p className="text-xs text-gray-400">
                      {course.code && `${course.code} · `}
                      {course.units.length} unit{course.units.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  {expandedCourse === course.id ? <ChevronUp size={18} className="text-gray-400 shrink-0" /> : <ChevronDown size={18} className="text-gray-400 shrink-0" />}
                </button>

                <div className="flex items-center gap-1 shrink-0">
                  {editingCourseId === course.id ? (
                    <>
                      <button onClick={() => saveEditCourse(course.id)} className="p-2 rounded-lg text-mint hover:bg-mint/10 transition"><Check size={16} /></button>
                      <button onClick={() => setEditingCourseId(null)} className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 transition"><X size={16} /></button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => startEditCourse(course)} className="p-2 rounded-lg text-gray-400 hover:text-indigo-premium hover:bg-indigo-premium/10 transition"><Edit2 size={15} /></button>
                      <button onClick={() => deleteCourse(course.id)} className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition"><Trash2 size={15} /></button>
                    </>
                  )}
                </div>
              </div>

              <AnimatePresence>
                {expandedCourse === course.id && (
                  <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                    className="overflow-hidden border-t border-gray-100">
                    <div className="px-5 py-4 space-y-3">

                      {course.units.length === 0 && addingUnitFor !== course.id && (
                        <p className="text-sm text-gray-400 text-center py-4">No units yet — add your first unit below.</p>
                      )}

                      {course.units.map(unit => (
                        <div key={unit.id} className="bg-gray-50 rounded-xl p-4 flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-navy text-sm">{unit.name}</p>
                            {unit.topics.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {unit.topics.map((topic, i) => (
                                  <span key={i} className="text-[10px] bg-indigo-premium/10 text-indigo-premium px-2 py-0.5 rounded-full">{topic}</span>
                                ))}
                              </div>
                            )}
                          </div>
                          <button onClick={() => deleteUnit(course.id, unit.id)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition shrink-0">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}

                      {addingUnitFor === course.id ? (
                        <div className="bg-indigo-premium/5 border border-indigo-premium/20 rounded-xl p-4 space-y-3">
                          <input
                            type="text"
                            placeholder="Unit name e.g. Unit 1: Cell Biology"
                            value={newUnitName}
                            onChange={e => setNewUnitName(e.target.value)}
                            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-navy placeholder-gray-400 outline-none focus:border-indigo-premium transition text-sm"
                          />

                          <div>
                            <label className="block text-xs font-medium text-navy mb-1.5">Topics (optional)</label>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                placeholder="e.g. Mitosis"
                                value={newTopicInput}
                                onChange={e => setNewTopicInput(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTopic() } }}
                                className="flex-1 bg-white border border-gray-200 rounded-xl px-3 py-2 text-navy placeholder-gray-400 outline-none focus:border-indigo-premium transition text-sm"
                              />
                              <button onClick={addTopic} className="bg-indigo-premium text-white px-3 py-2 rounded-xl text-sm font-semibold hover:bg-purple-premium transition">
                                + Add
                              </button>
                            </div>
                            {newTopics.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mt-2">
                                {newTopics.map((t, i) => (
                                  <span key={i} className="flex items-center gap-1 text-xs bg-indigo-premium/10 text-indigo-premium px-2.5 py-1 rounded-full">
                                    {t}
                                    <button onClick={() => removeTopic(t)} className="text-indigo-premium/60 hover:text-indigo-premium"><X size={10} /></button>
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="flex gap-2">
                            <button onClick={() => addUnit(course.id)}
                              className="flex-1 bg-indigo-premium text-white font-semibold py-2.5 rounded-xl hover:bg-purple-premium transition text-sm">
                              Save Unit
                            </button>
                            <button onClick={() => { setAddingUnitFor(null); setNewUnitName(''); setNewTopics([]); setNewTopicInput('') }}
                              className="flex-1 bg-gray-200 text-navy font-semibold py-2.5 rounded-xl hover:bg-gray-300 transition text-sm">
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setAddingUnitFor(course.id); setNewUnitName(''); setNewTopics([]) }}
                          className="w-full py-2.5 rounded-xl border-2 border-dashed border-gray-200 text-gray-400 hover:border-indigo-premium/40 hover:text-indigo-premium transition text-sm font-medium flex items-center justify-center gap-1.5"
                        >
                          <Plus size={16} /> Add Unit
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>

        {courses.length > 0 && (
          <div className="bg-indigo-premium/5 border border-indigo-premium/20 rounded-2xl p-5">
            <p className="text-sm text-indigo-premium font-semibold mb-1">💡 How STUDIA uses your units</p>
            <p className="text-xs text-gray-600">When you record a lecture, STUDIA asks you to select a course and unit. This helps SAGE AI Tutor understand what topic it's tutoring you on, and helps organise your notes and quiz history by subject.</p>
          </div>
        )}
      </div>
    </div>
  )
}
