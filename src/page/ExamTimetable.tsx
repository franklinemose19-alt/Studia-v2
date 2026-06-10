import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Upload, Loader, Check, Plus, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface Exam {
  id: string
  course: string
  date: string
  time: string
  duration: string
  selected: boolean
}

export default function ExamTimetable() {
  const navigate = useNavigate()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [exams, setExams] = useState<Exam[]>([])
  const [step, setStep] = useState<'upload' | 'parse' | 'review'>('upload')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (JPG, PNG, etc.)')
      return
    }

    setSelectedFile(file)
    const reader = new FileReader()
    reader.onload = (e) => {
      setPreview(e.target?.result as string)
      setStep('parse')
    }
    reader.readAsDataURL(file)
  }

  const parseTimeTable = async () => {
    if (!preview) return

    setLoading(true)
    try {
      const base64 = preview.split(',')[1]
      const res = await fetch('/api/parse-timetable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64 }),
      })

      const data = await res.json()

      if (data.exams && Array.isArray(data.exams)) {
        const parsedExams = data.exams.map((e: any, i: number) => ({
          id: `exam-${Date.now()}-${i}`,
          course: e.course || 'Unknown Course',
          date: e.date || '',
          time: e.time || '',
          duration: e.duration || '',
          selected: true,
        }))
        setExams(parsedExams)
        setStep('review')
      } else {
        alert('Could not extract exams from timetable. Try a clearer image.')
      }
    } catch (err) {
      alert('Error parsing timetable: ' + (err instanceof Error ? err.message : 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  const toggleExam = (id: string) => {
    setExams(exams.map((e) => (e.id === id ? { ...e, selected: !e.selected } : e)))
  }

  const saveExams = () => {
    const selectedExams = exams.filter((e) => e.selected)
    if (selectedExams.length === 0) {
      alert('Please select at least one exam')
      return
    }

    const saved = localStorage.getItem('exams')
    const existing = saved ? JSON.parse(saved) : []
    
    const newExams = selectedExams.map((e) => ({
      id: e.id,
      course: e.course,
      date: e.date,
      daysLeft: Math.ceil((new Date(e.date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)),
    }))

    localStorage.setItem('exams', JSON.stringify([...existing, ...newExams]))
    navigate('/exam-countdown')
  }

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

      <div className="max-w-4xl mx-auto px-6 py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
          <div>
            <h1 className="font-sora font-bold text-5xl text-navy mb-2">Upload Exam Timetable</h1>
            <p className="text-gray-600">Upload your school timetable and we'll automatically extract your exams.</p>
          </div>

          {step === 'upload' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl border-2 border-dashed border-indigo-premium/30 p-12 text-center hover:border-indigo-premium/60 transition cursor-pointer group"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                className="hidden"
              />
              
              <div className="w-20 h-20 rounded-full bg-indigo-premium/10 flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition">
                <Upload className="text-indigo-premium" size={40} />
              </div>
              
              <h3 className="font-sora font-bold text-2xl text-navy mb-2">Upload Exam Timetable</h3>
              <p className="text-gray-600 mb-4">Drag & drop or click to select a photo of your exam schedule</p>
              <p className="text-sm text-gray-500">Supports JPG, PNG, and other image formats</p>
            </motion.div>
          )}

          {step === 'parse' && preview && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="bg-white rounded-2xl p-6 border border-gray-200">
                <h2 className="font-sora font-bold text-xl text-navy mb-4">Preview</h2>
                <img src={preview} alt="Timetable" className="w-full h-auto rounded-lg" />
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setStep('upload')
                    setPreview('')
                    setSelectedFile(null)
                  }}
                  className="flex-1 bg-gray-200 text-navy font-semibold py-3 rounded-xl hover:bg-gray-300 transition"
                >
                  Choose Different Image
                </button>
                <button
                  onClick={parseTimeTable}
                  disabled={loading}
                  className="flex-1 bg-indigo-premium text-white font-semibold py-3 rounded-xl hover:bg-purple-premium transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader className="animate-spin" size={20} />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Check size={20} />
                      Extract Exams
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}

          {step === 'review' && exams.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="bg-gradient-to-r from-mint/10 to-light-blue/10 rounded-2xl p-6 border border-mint/20">
                <p className="text-gray-600 mb-1">Exams found</p>
                <p className="font-sora font-bold text-3xl text-navy">{exams.filter((e) => e.selected).length} exams</p>
              </div>

              <div className="space-y-3">
                <h2 className="font-sora font-bold text-xl text-navy">Select Your Exams</h2>
                {exams.map((exam, i) => (
                  <motion.div
                    key={exam.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="bg-white rounded-xl p-4 border border-gray-200 hover:border-indigo-premium/50 transition group"
                  >
                    <label className="flex items-start gap-4 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={exam.selected}
                        onChange={() => toggleExam(exam.id)}
                        className="w-5 h-5 rounded border-2 border-indigo-premium text-indigo-premium accent-indigo-premium mt-1"
                      />
                      <div className="flex-1">
                        <p className="font-sora font-bold text-navy mb-1">{exam.course}</p>
                        <p className="text-sm text-gray-600">
                          📅 {exam.date} at {exam.time}
                        </p>
                        {exam.duration && (
                          <p className="text-sm text-gray-500">⏱️ Duration: {exam.duration} minutes</p>
                        )}
                      </div>
                    </label>
                  </motion.div>
                ))}
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setStep('upload')}
                  className="flex-1 bg-gray-200 text-navy font-semibold py-3 rounded-xl hover:bg-gray-300 transition"
                >
                  Upload Different Timetable
                </button>
                <button
                  onClick={saveExams}
                  className="flex-1 bg-indigo-premium text-white font-semibold py-3 rounded-xl hover:bg-purple-premium transition flex items-center justify-center gap-2"
                >
                  <Plus size={20} />
                  Add Selected Exams
                </button>
              </div>
            </motion.div>
          )}

          {step === 'review' && exams.length === 0 && !loading && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-yellow-50 rounded-2xl p-8 border border-yellow-200 text-center"
            >
              <p className="text-yellow-800 mb-4">No exams could be extracted from the image.</p>
              <p className="text-yellow-700 mb-6">Try a clearer, well-lit photo of your timetable.</p>
              <button
                onClick={() => setStep('upload')}
                className="bg-yellow-600 text-white px-6 py-2 rounded-lg hover:bg-yellow-700 transition"
              >
                Try Again
              </button>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
