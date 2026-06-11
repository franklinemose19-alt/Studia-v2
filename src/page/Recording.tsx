import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Mic, Square, Play, Pause, Trash2, Download, ArrowLeft, Loader, Plus, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface Recording {
  id: string
  name: string
  duration: number
  timestamp: Date
  blob: Blob
  course?: string
  unit?: string
  topic?: string
  transcript?: string
  isTranscribing?: boolean
}

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

export default function Recording() {
  const navigate = useNavigate()
  const [isRecording, setIsRecording] = useState(false)
  const [recordings, setRecordings] = useState<Recording[]>([])
  const [duration, setDuration] = useState(0)
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [courses, setCourses] = useState<{ id: string; name: string; units: string[] }[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [showCourseForm, setShowCourseForm] = useState(false)
  const [newCourse, setNewCourse] = useState({ name: '', unit: '' })
  const [selectedCourse, setSelectedCourse] = useState('')
  const [selectedUnit, setSelectedUnit] = useState('')
  const [showCoverageResult, setShowCoverageResult] = useState(false)
  const [coverageData, setCoverageData] = useState({ covered: 0, total: 0, topics: [] as string[], unitName: '' })

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem('courses')
    if (saved) {
      try {
        setCourses(JSON.parse(saved))
      } catch {
        setCourses([])
      }
    }

    const savedUnits = localStorage.getItem('units')
    if (savedUnits) {
      try {
        setUnits(JSON.parse(savedUnits))
      } catch {
        setUnits([])
      }
    }

    const savedRecordings = localStorage.getItem('recordingsMetadata')
    if (savedRecordings) {
      try {
        setRecordings(JSON.parse(savedRecordings))
      } catch {
        setRecordings([])
      }
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (audioContextRef.current) audioContextRef.current.close()
    }
  }, [])

  useEffect(() => {
    if (courses.length > 0) {
      localStorage.setItem('courses', JSON.stringify(courses))
    }
  }, [courses])

  useEffect(() => {
    if (recordings.length > 0) {
      localStorage.setItem('recordingsMetadata', JSON.stringify(recordings))
    }
  }, [recordings])

  const addCourse = () => {
    if (!newCourse.name.trim()) {
      alert('Please enter a course name')
      return
    }

    const existing = courses.find((c) => c.name === newCourse.name)
    if (existing) {
      if (newCourse.unit.trim() && !existing.units.includes(newCourse.unit)) {
        setCourses(
          courses.map((c) =>
            c.id === existing.id ? { ...c, units: [...c.units, newCourse.unit] } : c
          )
        )
      }
    } else {
      setCourses([
        ...courses,
        {
          id: `course-${Date.now()}`,
          name: newCourse.name,
          units: newCourse.unit.trim() ? [newCourse.unit] : [],
        },
      ])
    }

    setNewCourse({ name: '', unit: '' })
    setShowCourseForm(false)
  }

  const simulateLectureAnalysis = (topics: string[]): string[] => {
    // Simulate AI detecting which topics were covered
    // In production: transcribe audio → send to AI → get topics
    const covered = Math.floor(topics.length * (0.6 + Math.random() * 0.2))
    return topics.slice(0, covered)
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })

      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      audioContextRef.current = audioContext

      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      analyserRef.current = analyser

      const highPass = audioContext.createBiquadFilter()
      highPass.type = 'highpass'
      highPass.frequency.value = 80

      const compressor = audioContext.createDynamicsCompressor()
      compressor.threshold.value = -50
      compressor.knee.value = 40
      compressor.ratio.value = 12
      compressor.attack.value = 0.003
      compressor.release.value = 0.25

      source.connect(highPass)
      highPass.connect(compressor)
      compressor.connect(analyser)

      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []
      mediaRecorder.ondataavailable = (e) => {
        audioChunksRef.current.push(e.data)
      }
      mediaRecorder.start()
      setIsRecording(true)
      setDuration(0)
      timerRef.current = setInterval(() => {
        setDuration((d) => d + 1)
      }, 1000)
      visualize()
    } catch (err) {
      alert('Microphone access denied')
    }
  }

  const trimSilence = async (audioBlob: Blob): Promise<Blob> => {
    const arrayBuffer = await audioBlob.arrayBuffer()
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
    const rawData = audioBuffer.getChannelData(0)

    const threshold = 0.01
    let start = 0
    let end = rawData.length

    for (let i = 0; i < rawData.length; i++) {
      if (Math.abs(rawData[i]) > threshold) {
        start = i
        break
      }
    }

    for (let i = rawData.length - 1; i >= 0; i--) {
      if (Math.abs(rawData[i]) > threshold) {
        end = i
        break
      }
    }

    const trimmed = rawData.slice(start, end)
    const newAudioBuffer = audioContext.createBuffer(1, trimmed.length, audioBuffer.sampleRate)
    newAudioBuffer.getChannelData(0).set(trimmed)

    return new Blob([trimmed], { type: 'audio/webm' })
  }

  const stopRecording = async () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.onstop = async () => {
        let blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })

        try {
          blob = await trimSilence(blob)
        } catch (err) {
          console.log('Silence trimming skipped')
        }

        const now = new Date()
        const recording: Recording = {
          id: `rec-${Date.now()}`,
          name: `Lecture ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`,
          duration,
          timestamp: now,
          blob,
          course: selectedCourse ? courses.find((c) => c.id === selectedCourse)?.name : undefined,
          unit: selectedUnit ? units.find((u) => u.id === selectedUnit)?.unitName : undefined,
        }
        setRecordings((prev) => [recording, ...prev])

        // Calculate coverage if unit selected
        if (selectedUnit) {
          const unit = units.find((u) => u.id === selectedUnit)
          if (unit) {
            const detectedTopics = simulateLectureAnalysis(unit.topics)
            const coveragePercent = Math.round((detectedTopics.length / unit.topics.length) * 100)

            setCoverageData({
              covered: detectedTopics.length,
              total: unit.topics.length,
              topics: detectedTopics,
              unitName: unit.unitName,
            })
            setShowCoverageResult(true)

            const updatedUnits = units.map((u) =>
              u.id === selectedUnit
                ? {
                    ...u,
                    totalLectures: u.totalLectures + 1,
                    lecturesCovered: u.lecturesCovered + detectedTopics.length,
                    coverage: coveragePercent,
                  }
                : u
            )
            setUnits(updatedUnits)
            localStorage.setItem('units', JSON.stringify(updatedUnits))
          }
        }
      }

      mediaRecorderRef.current.stop()
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop())
      setIsRecording(false)
      if (timerRef.current) clearInterval(timerRef.current)
      if (audioContextRef.current) audioContextRef.current.close()
    }
  }

  const visualize = () => {
    if (!analyserRef.current || !canvasRef.current || !isRecording) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const analyser = analyserRef.current
    const dataArray = new Uint8Array(analyser.frequencyBinCount)
    const draw = () => {
      requestAnimationFrame(draw)
      analyser.getByteFrequencyData(dataArray)
      ctx.fillStyle = '#080C18'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      const barWidth = (canvas.width / dataArray.length) * 2.5
      let x = 0
      for (let i = 0; i < dataArray.length; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height
        ctx.fillStyle = `hsl(${(i / dataArray.length) * 360}, 100%, 50%)`
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight)
        x += barWidth + 1
      }
    }
    draw()
  }

  const deleteRecording = (id: string) => {
    setRecordings((prev) => prev.filter((r) => r.id !== id))
  }

  const downloadRecording = (recording: Recording) => {
    const url = URL.createObjectURL(recording.blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${recording.name}.webm`
    a.click()
    URL.revokeObjectURL(url)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const selectedCourseData = courses.find((c) => c.id === selectedCourse)

  return (
    <div className="min-h-screen bg-surface-base">
      <nav className="border-b border-white/5 bg-surface-elevated/50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-sm text-[#8B97B5] hover:text-white transition-colors"
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

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
          <div>
            <h1 className="font-sora font-bold text-4xl text-white mb-2">Smart Recording</h1>
            <p className="text-[#8B97B5]">Auto-trim silence, track unit coverage, organize lectures.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-surface-elevated border border-white/5 rounded-2xl p-6 space-y-4">
              <h2 className="font-sora font-bold text-xl text-white">Recording Settings</h2>

              <div className="bg-gradient-to-r from-indigo-premium/10 to-purple-premium/10 rounded-xl p-4 border border-indigo-premium/20 mb-4">
                <p className="text-sm font-semibold text-white mb-2">🎙️ SmartCapture AI Active</p>
                <div className="space-y-1 text-xs text-gray-400">
                  <p>✓ Echo cancellation</p>
                  <p>✓ Noise suppression</p>
                  <p>✓ Auto gain control</p>
                  <p>✓ Classroom cleanup</p>
                </div>
              </div>

              <div>
                <label className="block text-sm text-white mb-2">Select Course</label>
                <select
                  value={selectedCourse}
                  onChange={(e) => {
                    setSelectedCourse(e.target.value)
                  }}
                  className="w-full bg-surface-base border border-white/10 rounded-xl p-3 text-white outline-none focus:border-brand-blue/40"
                >
                  <option value="">Choose a course...</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-white mb-2">Select Unit (for coverage tracking)</label>
                <select
                  value={selectedUnit}
                  onChange={(e) => setSelectedUnit(e.target.value)}
                  className="w-full bg-surface-base border border-white/10 rounded-xl p-3 text-white outline-none focus:border-brand-blue/40"
                >
                  <option value="">Choose a unit...</option>
                  {units.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.course} - {u.unitName}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => setShowCourseForm(!showCourseForm)}
                className="w-full bg-surface-base text-brand-blue border border-brand-blue/30 py-2 rounded-xl hover:bg-surface-base/80 text-sm font-medium flex items-center justify-center gap-2"
              >
                <Plus size={16} />
                {showCourseForm ? 'Cancel' : 'Add New Course'}
              </button>

              {showCourseForm && (
                <div className="space-y-3 p-4 bg-surface-base rounded-xl">
                  <input
                    type="text"
                    placeholder="Course name"
                    value={newCourse.name}
                    onChange={(e) => setNewCourse({ ...newCourse, name: e.target.value })}
                    className="w-full bg-surface-elevated border border-white/10 rounded-lg p-2 text-white placeholder-[#4A5568] outline-none focus:border-brand-blue/40 text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Unit (optional)"
                    value={newCourse.unit}
                    onChange={(e) => setNewCourse({ ...newCourse, unit: e.target.value })}
                    className="w-full bg-surface-elevated border border-white/10 rounded-lg p-2 text-white placeholder-[#4A5568] outline-none focus:border-brand-blue/40 text-sm"
                  />
                  <button
                    onClick={addCourse}
                    className="w-full bg-brand-blue text-white py-2 rounded-lg hover:bg-brand-blue/90 text-sm font-medium"
                  >
                    Add Course
                  </button>
                </div>
              )}
            </div>

            <div className="bg-surface-elevated border border-white/5 rounded-2xl p-6 space-y-6">
              <canvas ref={canvasRef} width={500} height={200} className="w-full h-48 bg-surface-base rounded-xl" />

              <div className="text-center">
                <p className="text-5xl font-mono font-bold text-brand-blue mb-4">{formatTime(duration)}</p>
                <p className="text-sm text-[#8B97B5]">
                  {isRecording ? 'Recording...' : recordings.length > 0 ? `${recordings.length} recording(s)` : 'Ready'}
                </p>
              </div>

              <div className="flex gap-4 justify-center">
                {!isRecording ? (
                  <button
                    onClick={startRecording}
                    className="inline-flex items-center gap-3 bg-brand-blue text-white font-semibold px-8 py-4 rounded-2xl hover:bg-brand-blue/90"
                  >
                    <Mic size={24} />
                    Start Recording
                  </button>
                ) : (
                  <button
                    onClick={stopRecording}
                    className="inline-flex items-center gap-3 bg-red-500 text-white font-semibold px-8 py-4 rounded-2xl animate-pulse"
                  >
                    <Square size={24} />
                    Stop Recording
                  </button>
                )}
              </div>
            </div>
          </div>

          {showCoverageResult && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-r from-brand-blue/10 to-purple-premium/10 rounded-2xl p-8 border border-brand-blue/20"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-sora font-bold text-2xl text-white mb-2">📊 Unit Coverage Analysis</h3>
                  <p className="text-[#8B97B5]">
                    You covered {coverageData.covered} out of {coverageData.total} topics in {coverageData.unitName}
                  </p>
                </div>
                <button onClick={() => setShowCoverageResult(false)} className="text-[#8B97B5] hover:text-white">
                  ✕
                </button>
              </div>

              <div className="mb-6">
                <div className="flex items-center gap-4 mb-3">
                  <div className="flex-1">
                    <div className="w-full bg-surface-base rounded-full h-3">
                      <div
                        className="bg-gradient-to-r from-brand-blue to-brand-green h-3 rounded-full transition-all"
                        style={{
                          width: `${Math.round((coverageData.covered / coverageData.total) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                  <p className="font-sora font-bold text-3xl text-brand-blue">
                    {Math.round((coverageData.covered / coverageData.total) * 100)}%
                  </p>
                </div>
                <p className="text-sm text-[#8B97B5]">Coverage of {coverageData.unitName}</p>
              </div>

              <div className="space-y-2">
                <p className="font-semibold text-white mb-3">✓ Topics Covered:</p>
                <div className="flex flex-wrap gap-2">
                  {coverageData.topics.map((topic, i) => (
                    <span key={i} className="bg-brand-green/20 text-brand-green px-3 py-1 rounded-full text-sm font-medium">
                      ✓ {topic}
                    </span>
                  ))}
                </div>
              </div>

              {coverageData.covered < coverageData.total && (
                <div className="mt-6 p-4 bg-warning/20 rounded-lg border border-warning/30">
                  <p className="text-sm text-warning font-semibold mb-2">Topics Still to Cover:</p>
                  <div className="flex flex-wrap gap-2">
                    {units
                      .find((u) => u.id === selectedUnit)
                      ?.topics.filter((t) => !coverageData.topics.includes(t))
                      .map((topic, i) => (
                        <span key={i} className="bg-warning/30 text-warning px-3 py-1 rounded-full text-sm">
                          ○ {topic}
                        </span>
                      ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {recordings.length > 0 && (
            <div className="space-y-4">
              <h2 className="font-sora font-bold text-2xl text-white">Your Recordings</h2>
              <div className="space-y-3">
                {recordings.map((recording) => (
                  <motion.div
                    key={recording.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-surface-elevated border border-white/5 rounded-2xl p-4"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex-1">
                        <p className="text-white font-medium">{recording.name}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <p className="text-xs text-[#8B97B5]">{formatTime(recording.duration)}</p>
                          {recording.course && (
                            <p className="text-xs text-brand-blue">
                              {recording.course}
                              {recording.unit && ` • ${recording.unit}`}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            if (playingId === recording.id) {
                              setPlayingId(null)
                            } else {
                              setPlayingId(recording.id)
                              const audio = new Audio(URL.createObjectURL(recording.blob))
                              audio.play()
                            }
                          }}
                          className="p-2 rounded-lg bg-brand-blue/10 text-brand-blue hover:bg-brand-blue/20"
                        >
                          {playingId === recording.id ? <Pause size={18} /> : <Play size={18} />}
                        </button>
                        <button
                          onClick={() => downloadRecording(recording)}
                          className="p-2 rounded-lg bg-brand-blue/10 text-brand-blue hover:bg-brand-blue/20"
                        >
                          <Download size={18} />
                        </button>
                        <button
                          onClick={() => deleteRecording(recording.id)}
                          className="p-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
