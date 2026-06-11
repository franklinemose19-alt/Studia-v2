import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Plus, Trash2, Edit2, BookOpen } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface Unit {
  id: string
  course: string
  unitName: string
  topics: string[]
  totalLectures: number
  lecturesCovered: number
  coverage: number
  createdDate: string
}

export default function UnitManagement() {
  const navigate = useNavigate()
  const [units, setUnits] = useState<Unit[]>([])
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ course: '', unitName: '', topics: '' })

  useEffect(() => {
    const saved = localStorage.getItem('units')
    if (saved) {
      try {
        setUnits(JSON.parse(saved))
      } catch {
        setUnits([])
      }
    }
  }, [])

  useEffect(() => {
    if (units.length > 0) {
      localStorage.setItem('units', JSON.stringify(units))
    }
  }, [units])

  const addUnit = () => {
    if (!formData.course.trim() || !formData.unitName.trim() || !formData.topics.trim()) {
      alert('Please fill in all fields')
      return
    }

    const topics = formData.topics
      .split('\n')
      .map((t) => t.trim())
      .filter((t) => t.length > 0)

    if (topics.length === 0) {
      alert('Please add at least one topic')
      return
    }

    const newUnit: Unit = {
      id: `unit-${Date.now()}`,
      course: formData.course,
      unitName: formData.unitName,
      topics,
      totalLectures: 0,
      lecturesCovered: 0,
      coverage: 0,
      createdDate: new Date().toISOString(),
    }

    setUnits([...units, newUnit])
    setFormData({ course: '', unitName: '', topics: '' })
    setShowForm(false)
  }

  const deleteUnit = (id: string) => {
    setUnits(units.filter((u) => u.id !== id))
  }

  const groupedUnits = units.reduce(
    (acc, unit) => {
      if (!acc[unit.course]) acc[unit.course] = []
      acc[unit.course].push(unit)
      return acc
    },
    {} as { [key: string]: Unit[] }
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-surface-light to-white">
      <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-navy hover:text-indigo-premium transition"
          >
            <ArrowLeft size={20} />
            <span className="font-medium">Back</span>
          </button>
          <div className="flex items-center gap-1">
            <span className="font-sora font-bold text-lg text-navy">STUDIA</span>
            <sup className="text-indigo-premium text-xs">β</sup>
          </div>
          <div className="w-20" />
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
          {/* HEADER */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-sora font-bold text-5xl text-navy mb-2">Unit Management</h1>
              <p className="text-gray-600">Define your course units and syllabus topics.</p>
            </div>
            {!showForm && (
              <button
                onClick={() => setShowForm(true)}
                className="bg-indigo-premium text-white px-6 py-3 rounded-lg hover:bg-purple-premium transition flex items-center gap-2 font-medium"
              >
                <Plus size={20} />
                Add Unit
              </button>
            )}
          </div>

          {/* ADD UNIT FORM */}
          {showForm && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl border border-gray-200 p-8"
            >
              <h2 className="font-sora font-bold text-2xl text-navy mb-6">Create New Unit</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-navy mb-2">Course Name</label>
                  <input
                    type="text"
                    placeholder="e.g., Mathematics, Biology"
                    value={formData.course}
                    onChange={(e) => setFormData({ ...formData, course: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-navy placeholder-gray-400 outline-none focus:border-indigo-premium transition"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-navy mb-2">Unit Name</label>
                  <input
                    type="text"
                    placeholder="e.g., Unit 1: Algebra Basics"
                    value={formData.unitName}
                    onChange={(e) => setFormData({ ...formData, unitName: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-navy placeholder-gray-400 outline-none focus:border-indigo-premium transition"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-navy mb-2">Unit Topics (one per line)</label>
                  <textarea
                    placeholder="Topic 1&#10;Topic 2&#10;Topic 3&#10;..."
                    value={formData.topics}
                    onChange={(e) => setFormData({ ...formData, topics: e.target.value })}
                    className="w-full h-32 bg-gray-50 border border-gray-200 rounded-xl p-3 text-navy placeholder-gray-400 outline-none focus:border-indigo-premium transition resize-none"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={addUnit}
                    className="flex-1 bg-indigo-premium text-white font-semibold py-3 rounded-xl hover:bg-purple-premium transition"
                  >
                    Create Unit
                  </button>
                  <button
                    onClick={() => {
                      setShowForm(false)
                      setFormData({ course: '', unitName: '', topics: '' })
                    }}
                    className="flex-1 bg-gray-200 text-navy font-semibold py-3 rounded-xl hover:bg-gray-300 transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* UNITS BY COURSE */}
          {Object.entries(groupedUnits).length > 0 ? (
            <div className="space-y-8">
              {Object.entries(groupedUnits).map(([course, courseUnits]) => (
                <div key={course}>
                  <h2 className="font-sora font-bold text-2xl text-navy mb-4">{course}</h2>
                  <div className="space-y-3">
                    {courseUnits.map((unit, i) => (
                      <motion.div
                        key={unit.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="bg-white rounded-xl p-6 border border-gray-200 hover:border-indigo-premium/50 transition group"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <p className="font-sora font-bold text-lg text-navy">{unit.unitName}</p>
                            <p className="text-sm text-gray-600 mt-1">
                              {unit.topics.length} topics • Coverage: {unit.coverage}%
                            </p>
                          </div>
                          <button
                            onClick={() => deleteUnit(unit.id)}
                            className="p-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 opacity-0 group-hover:opacity-100 transition"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>

                        {/* Coverage bar */}
                        <div className="mb-4">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-gradient-to-r from-indigo-premium to-purple-premium h-2 rounded-full transition-all"
                              style={{ width: `${unit.coverage}%` }}
                            />
                          </div>
                        </div>

                        {/* Topics */}
                        <div className="flex flex-wrap gap-2">
                          {unit.topics.slice(0, 5).map((topic, j) => (
                            <span key={j} className="text-xs bg-gray-100 text-gray-700 px-3 py-1 rounded-full">
                              {topic}
                            </span>
                          ))}
                          {unit.topics.length > 5 && (
                            <span className="text-xs bg-gray-100 text-gray-700 px-3 py-1 rounded-full">
                              +{unit.topics.length - 5} more
                            </span>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl p-12 border border-gray-200 text-center"
            >
              <BookOpen className="mx-auto text-gray-300 mb-4" size={48} />
              <p className="text-navy font-semibold mb-2">No units created yet</p>
              <p className="text-gray-600">Add your first unit to start tracking lecture coverage!</p>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
