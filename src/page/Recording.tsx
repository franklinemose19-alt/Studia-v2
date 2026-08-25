import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, Square, Play, Pause, Trash2, Download, ArrowLeft, Loader, FileText, BookOpen, Phone, Lock, Brain, Plus, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { getSupabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/AuthContext'
import { loadAccess, checkAccess, totalMinutesAvailable, isUnlimitedPlan, type AccessInfo, emptyAccess } from '../lib/access'
import { authFetch } from '../lib/authFetch'
import SmartInkNotes from '../components/SmartInkNotes'
import { getTierFromPlan, type SmartInkNote } from '../lib/smartInk'
import { toast } from '../lib/toast'
import TimestampedScript from '../components/TimestampedScript'
import LanguageViewSwitcher from '../components/LanguageViewSwitcher'
import { loadCourses, saveCourses, onCoursesChanged, upsertCourseUnit, type Course } from '../lib/courseStore'

interface ScriptEntry { timestamp: number; heading: string; definition?: string; explanation: string; keyTerm?: string }

interface Recording {
  id: string; name: string; duration: number; timestamp: Date; blob?: Blob
  course?: string; unit?: string; storageUrl?: string; transcript?: string
  notes?: string; structuredNotes?: SmartInkNote; structuredScript?: ScriptEntry[]
  detectedLanguages?: string[]; isProcessing?: boolean
}

interface UnitCoverageRecord { lecturesRecorded: number; coveredTopics: string[] }
interface CoverageData { covered: number; total: number; topics: string[]; unitName: string }

const openDB = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const req = indexedDB.open('studia-recordings', 1)
    req.onupgradeneeded = (e: any) => e.target.result.createObjectStore('blobs')
    req.onsuccess = (e: any) => resolve(e.target.result)
    req.onerror = () => reject(req.error)
  })

const saveBlob = async (id: string, blob: Blob) => {
  try { const db = await openDB(); db.transaction('blobs', 'readwrite').objectStore('blobs').put(blob, id) }
  catch (err) { console.error('Failed to save blob:', err) }
}
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
  try { const db = await openDB(); db.transaction('blobs', 'readwrite').objectStore('blobs').delete(id) }
  catch (err) { console.error('Failed to delete blob:', err) }
}

const loadUnitCoverage = (): Record<string, UnitCoverageRecord> => {
  try { return JSON.parse(localStorage.getItem('unitCoverage') || '{}') } catch { return {} }
}
const saveUnitCoverage = (data: Record<string, UnitCoverageRecord>) => {
  try { localStorage.setItem('unitCoverage', JSON.stringify(data)) } catch {}
}
const topicMatchesConcept = (topic: string, conceptName: string): boolean => {
  const t = topic.toLowerCase().trim()
  const c = conceptName.toLowerCase().trim()
  return t.length > 2 && c.length > 2 && (t.includes(c) || c.includes(t))
}
const getSupportedMimeType = (): string => {
  const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/ogg', 'audio/mp4']
  return types.find((t) => MediaRecorder.isTypeSupported(t)) || ''
}
const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}
const formatMinutes = (mins: number) => mins < 1 ? `${Math.round(mins * 60)}s` : `${Math.round(mins)} min`
const formatPhone = (phone: string) => {
  let cleaned = phone.replace(/\D/g, '')
  if (cleaned.startsWith('0')) cleaned = '254' + cleaned.substring(1)
  else if (!cleaned.startsWith('254')) cleaned = '254' + cleaned
  return cleaned
}
const blobToBase64 = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string).split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })

const selectClass = "w-full bg-surface-base border border-white/10 rounded-xl p-3 text-white outline-none focus:border-brand-blue/40 text-sm [&>option]:bg-[#0d1526] [&>option]:text-white"
const inputClass = "w-full bg-surface-base border border-white/10 rounded-xl p-3 text-white placeholder-[#4A5568] outline-none focus:border-brand-blue/40 text-sm"

export default function RecordingPage() {
  const navigate = useNavigate()
  const { userId } = useAuth()

  const [isRecording, setIsRecording] = useState(false)
  const [recordings, setRecordings] = useState<Recording[]>([])
  const [duration, setDuration] = useState(0)
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const [courses, setCourses] = useState<Course[]>([])
  const [selectedCourse, setSelectedCourse] = useState('')
  const [selectedUnit, setSelectedUnit] = useState('')

  const [showAddForm, setShowAddForm] = useState(false)
  const [newCourseName, setNewCourseName] = useState('')
  const [newUnitName, setNewUnitName] = useState('')
  const [newTopicsInput, setNewTopicsInput] = useState('')

  const [showCoverageResult, setShowCoverageResult] = useState(false)
  const [coverageData, setCoverageData] = useState<CoverageData>({ covered: 0, total: 0, topics: [], unitName: '' })
  const [uploadStatus, setUploadStatus] = useState<string>('')

  const [access, setAccess] = useState<AccessInfo>(emptyAccess)
  const [accessLoaded, setAccessLoaded] = useState(false)
  const [showPaywall, setShowPaywall] = useState(false)

  const [litePhone, setLitePhone] = useState('')
  const [litePaying, setLitePaying] = useState(false)
  const [liteError, setLiteError] = useState('')

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const animFrameRef = useRef<number | null>(null)
  const currentAudioRef = useRef<HTMLAudioElement | null>(null)
  const litePollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const loaded = loadCourses()
    setCourses(loaded)
    if (loaded.length === 0) setShowAddForm(true)
    const unsubscribe = onCoursesChanged(() => setCourses(loadCourses()))
    return () => { unsubscribe() }
  }, [])

  useEffect(() => {
    try { setRecordings(JSON.parse(localStorage.getItem('recordingsMetadata') || '[]')) } catch { setRecordings([]) }
    let cancelled = false
    const init = async () => {
      const a = await loadAccess(userId)
      if (!cancelled) { setAccess(a); setAccessLoaded(true) }
    }
    init()
    return () => {
      cancelled = true
      if (timerRef.current) clearInterval(timerRef.current)
      if (audioContextRef.current) audioContextRef.current.close()
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
      if (litePollRef.current) clearInterval(litePollRef.current)
    }
  }, [userId])

  useEffect(() => {
    const metadata = recordings.map(({ blob, ...rest }) => rest)
    try { localStorage.setItem('recordingsMetadata', JSON.stringify(metadata)) } catch {}
  }, [recordings])

  const courseNames = courses.map(c => c.name)
  const selectedCourseObj = courses.find(c => c.name === selectedCourse)
  const filteredUnits = selectedCourseObj?.units || []

  const handleQuickAddCourseUnit = () => {
    const courseName = newCourseName.trim()
    const unitName = newUnitName.trim()
    if (!courseName) { toast.error('Enter a course name'); return }
    if (!unitName) { toast.error('Enter a unit name'); return }
    const topics = newTopicsInput.split(',').map(t => t.trim()).filter(Boolean)
    const { courses: updatedCourses, unitId } = upsertCourseUnit(courses, courseName, unitName, topics)
    setCourses(updatedCourses)
    saveCourses(updatedCourses)
    setSelectedCourse(courseName)
    setSelectedUnit(unitId)
    setNewCourseName(''); setNewUnitName(''); setNewTopicsInput('')
    setShowAddForm(false)
    toast.success(`"${courseName}" ready — you can record now.`)
  }

  const visualize = () => {
    if (!analyserRef.current || !canvasRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const analyser = analyserRef.current
    const dataArray = new Uint8Array(analyser.frequencyBinCount)
    const draw = () => {
      animFrameRef.current = requestAnimationFrame(draw)
      analyser.getByteFrequencyData(dataArray)
      ctx.fillStyle = '#080C18'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      const barWidth = (canvas.width / dataArray.length) * 2.5
      let x = 0
      for (let i = 0; i < dataArray.length; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height
        ctx.fillStyle = `hsl(${210 + (i / dataArray.length) * 60}, 80%, 60%)`
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight)
        x += barWidth + 1
      }
    }
    draw()
  }
  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (ctx) { ctx.fillStyle = '#080C18'; ctx.fillRect(0, 0, canvas.width, canvas.height) }
  }

  const uploadToSupabase = async (blob: Blob, recordingId: string, uid: string): Promise<string | null> => {
    try {
      setUploadStatus('☁️ Uploading to cloud...')
      const client = await getSupabase()
      const ext = blob.type.includes('mp4') ? 'mp4' : blob.type.includes('ogg') ? 'ogg' : 'webm'
      const path = `${uid}/${recordingId}.${ext}`
      const { error } = await client.storage.from('recordings').upload(path, blob, { contentType: blob.type, upsert: true })
      if (error) { console.error('Upload error:', error); return null }
      const { data } = client.storage.from('recordings').getPublicUrl(path)
      setUploadStatus('✅ Uploaded!')
      return data.publicUrl
    } catch (err) {
      console.error('Upload failed:', err)
      setUploadStatus('⚠️ Upload failed')
      return null
    }
  }

  // Charged server-side, atomically, minute-accurate — see api/transcribe.js.
  // clientDurationSeconds is sent only as the server's PRE-FLIGHT estimate
  // (cheap rejection before an AI call, and the honest fallback if the
  // transcription model doesn't return its own duration); the server
  // always trues up against whatever real duration it can determine.
  const transcribeAudio = async (blob: Blob, recordedSeconds: number): Promise<{ transcript: string | null; segments: any[]; exhausted: boolean; minutesCharged: number; creditWarning: string | null }> => {
    try {
      setUploadStatus('🎙️ Transcribing lecture...')
      const base64 = await blobToBase64(blob)
      const response = await authFetch('/api/transcribe', {
        method: 'POST',
        body: JSON.stringify({ audio: base64, mimeType: blob.type, clientDurationSeconds: recordedSeconds }),
      })
      if (!response.ok) {
        const err = await response.json()
        if (response.status === 402) {
          toast.error(err.error)
          setAccess(await loadAccess(userId))
          return { transcript: null, segments: [], exhausted: true, minutesCharged: 0, creditWarning: null }
        }
        if (response.status === 401) { toast.error('Session expired — please sign in again.'); return { transcript: null, segments: [], exhausted: false, minutesCharged: 0, creditWarning: null } }
        if (response.status === 429) toast.error(err.error || 'Too many requests — please wait a moment.')
        console.error('Transcribe error:', err)
        return { transcript: null, segments: [], exhausted: false, minutesCharged: 0, creditWarning: null }
      }
      const data = await response.json()
      if (data.creditWarning) toast.info(data.creditWarning)
      return { transcript: data.transcript || null, segments: data.segments || [], exhausted: false, minutesCharged: data.minutesCharged || 0, creditWarning: data.creditWarning || null }
    } catch (err) {
      console.error('Transcription failed:', err)
      return { transcript: null, segments: [], exhausted: false, minutesCharged: 0, creditWarning: null }
    }
  }

  const generateNotes = async (transcript: string, segments: any[], courseName?: string, unitName?: string) => {
    try {
      setUploadStatus('📝 Generating Smart Ink notes...')
      const response = await authFetch('/api/generate-lecture-notes', {
        method: 'POST',
        body: JSON.stringify({ transcript, segments, courseName, unitName }),
      })
      if (!response.ok) {
        const err = await response.json()
        console.error('Notes error:', err)
        if (response.status === 429) toast.error(err.error || 'Too many requests — please wait a moment.')
        return { notes: null, structuredNotes: undefined, structuredScript: [], detectedLanguages: [] }
      }
      const data = await response.json()
      return { notes: data.notes || null, structuredNotes: data.structured || undefined, structuredScript: data.structuredScript || [], detectedLanguages: data.detectedLanguages || [] }
    } catch (err) {
      console.error('Notes generation failed:', err)
      return { notes: null, structuredNotes: undefined, structuredScript: [], detectedLanguages: [] }
    }
  }

  const runKnowledgeMapExtraction = async (notesText: string, courseName: string | undefined, unitId: string | undefined, recordingId: string, recordingLabel: string) => {
    if (!notesText.trim()) return
    try {
      const res = await authFetch('/api/ai-tools', {
        method: 'POST',
        body: JSON.stringify({ mode: 'extract_concepts', lectureContent: notesText, subject: courseName, courseName, sourceLabel: recordingLabel, sourceId: recordingId }),
      })
      if (!res.ok) return
      const data = await res.json()
      const conceptNames: string[] = (data.concepts || []).map((c: any) => c.name).filter(Boolean)

      if (unitId && conceptNames.length > 0) {
        const unit = filteredUnits.find(u => u.id === unitId) || courses.flatMap(c => c.units).find(u => u.id === unitId)
        if (unit && unit.topics.length > 0) {
          const coverage = loadUnitCoverage()
          const existing = coverage[unitId] || { lecturesRecorded: 0, coveredTopics: [] }
          const newlyCovered = unit.topics.filter(topic => !existing.coveredTopics.includes(topic) && conceptNames.some(name => topicMatchesConcept(topic, name)))
          const updated: UnitCoverageRecord = { lecturesRecorded: existing.lecturesRecorded + 1, coveredTopics: [...existing.coveredTopics, ...newlyCovered] }
          coverage[unitId] = updated
          saveUnitCoverage(coverage)
          setCoverageData({ covered: updated.coveredTopics.length, total: unit.topics.length, topics: updated.coveredTopics, unitName: unit.name })
          setShowCoverageResult(true)
        }
      }
      if (data.prerequisiteWarnings?.length > 0) {
        const names = data.prerequisiteWarnings.map((w: any) => w.concept).join(', ')
        toast.info(`This lecture builds on ${names} — you're still building mastery there. Check your Knowledge Map for a refresher.`)
      }
    } catch (err) { console.error('Knowledge map extraction failed (non-critical):', err) }
  }

  const handleStartClick = () => {
    if (!selectedUnit) { toast.error('Add or select a course and unit above before recording.'); setShowAddForm(true); return }
    // Optimistic pre-check only — the server independently re-verifies and
    // trues up against the real duration once transcription completes.
    const result = checkAccess(access, 'core')
    if (result.allowed) { startRecording(); return }
    setLiteError('')
    setShowPaywall(true)
  }

  const payForMinutes = async (plan: 'achiever' | 'achiever-plus') => {
    if (!litePhone.trim()) { setLiteError('Enter your M-Pesa number'); return }
    setLiteError('')
    setLitePaying(true)
    try {
      const amount = plan === 'achiever' ? 45 : 69
      const minutes = plan === 'achiever' ? 45 : 90
      const res = await fetch('/api/mpesa-stk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: formatPhone(litePhone), amount, planId: plan, planName: plan === 'achiever' ? `Achiever (${minutes} min)` : `Achiever+ (${minutes} min)`, userId: access.userId }),
      })
      const data = await res.json()
      if (!data.success) {
        setLiteError(data.error || 'Payment failed. Please try again.')
        toast.error(data.error || 'Payment failed. Please try again.')
        setLitePaying(false)
        return
      }
      pollPayment(data.transactionId)
    } catch {
      setLiteError('Connection error. Please try again.')
      setLitePaying(false)
    }
  }

  const pollPayment = (transactionId: string) => {
    let attempts = 0
    litePollRef.current = setInterval(async () => {
      attempts++
      try {
        const res = await fetch(`/api/mpesa-stk?transactionId=${transactionId}`)
        const data = await res.json()
        if (data.status === 'completed') {
          clearInterval(litePollRef.current!)
          setLitePaying(false)
          setShowPaywall(false)
          if (access.userId) setAccess(await loadAccess(access.userId))
          toast.success('Payment confirmed! Minutes added.')
          startRecording()
        } else if (data.status === 'failed') {
          clearInterval(litePollRef.current!)
          setLitePaying(false)
          setLiteError('Payment was not completed. Please try again.')
        } else if (attempts >= 20) {
          clearInterval(litePollRef.current!)
          setLitePaying(false)
          setLiteError('Still waiting for confirmation. If you completed the M-Pesa prompt, try recording again shortly.')
        }
      } catch {}
    }, 3000)
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } })
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      audioContextRef.current = audioContext
      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      analyserRef.current = analyser
      const highPass = audioContext.createBiquadFilter()
      highPass.type = 'highpass'; highPass.frequency.value = 80
      const compressor = audioContext.createDynamicsCompressor()
      compressor.threshold.value = -50; compressor.knee.value = 40; compressor.ratio.value = 12; compressor.attack.value = 0.003; compressor.release.value = 0.25
      source.connect(highPass); highPass.connect(compressor); compressor.connect(analyser)
      const mimeType = getSupportedMimeType()
      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data) }
      mediaRecorder.start(250)
      setIsRecording(true); setDuration(0); setUploadStatus('')
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000)
      visualize()
    } catch {
      toast.error('Microphone access denied. Please allow microphone access and try again.')
    }
  }

  const stopRecording = () => {
    if (!mediaRecorderRef.current || !isRecording) return
    const recordedSeconds = duration
    mediaRecorderRef.current.onstop = async () => {
      const mimeType = getSupportedMimeType()
      const blob = new Blob(audioChunksRef.current, { type: mimeType || 'audio/webm' })
      const now = new Date()
      const id = `rec-${Date.now()}`
      const courseName = selectedCourse || undefined
      const unitObj = filteredUnits.find((u) => u.id === selectedUnit)
      const unitName = unitObj?.name

      const recording: Recording = { id, name: `Lecture ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`, duration: recordedSeconds, timestamp: now, blob, course: courseName, unit: unitName, isProcessing: true }
      await saveBlob(id, blob)
      setRecordings((prev) => [recording, ...prev])

      const storageUrl = await uploadToSupabase(blob, id, userId || 'anonymous')
      const { transcript, segments, exhausted } = await transcribeAudio(blob, recordedSeconds)

      if (exhausted) {
        setRecordings((prev) => prev.map((r) => r.id === id ? { ...r, isProcessing: false } : r))
        clearCanvas()
        return
      }

      const { notes, structuredNotes, structuredScript, detectedLanguages } = transcript
        ? await generateNotes(transcript, segments, courseName, unitName)
        : { notes: null, structuredNotes: undefined, structuredScript: [], detectedLanguages: [] }

      setUploadStatus(notes ? '✅ Smart Ink notes ready!' : '⚠️ Could not generate notes')
      setRecordings((prev) => prev.map((r) => r.id === id ? { ...r, storageUrl: storageUrl || undefined, transcript: transcript || undefined, notes: notes || undefined, structuredNotes, structuredScript, detectedLanguages, isProcessing: false } : r))

      setAccess(await loadAccess(userId))

      if (notes) runKnowledgeMapExtraction(notes, courseName, selectedUnit || undefined, id, recording.name)
      clearCanvas()
    }
    mediaRecorderRef.current.stop()
    mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop())
    setIsRecording(false)
    if (timerRef.current) clearInterval(timerRef.current)
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    if (audioContextRef.current) audioContextRef.current.close()
  }

  const playRecording = async (recording: Recording) => {
    if (currentAudioRef.current) { currentAudioRef.current.pause(); currentAudioRef.current = null }
    if (playingId === recording.id) { setPlayingId(null); return }
    let blob = recording.blob || await getBlob(recording.id)
    if (!blob) { toast.error('Recording not found. Please re-record.'); return }
    const url = URL.createObjectURL(blob)
    const audio = new Audio(url)
    currentAudioRef.current = audio
    audio.play()
    setPlayingId(recording.id)
    audio.onended = () => { setPlayingId(null); URL.revokeObjectURL(url) }
    audio.onerror = () => { setPlayingId(null); URL.revokeObjectURL(url); toast.error('Could not play recording.') }
  }

  const downloadRecording = async (recording: Recording) => {
    const blob = recording.blob || await getBlob(recording.id)
    if (!blob) { toast.error('File not found on this device.'); return }
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `${recording.name}.webm`; a.click()
    URL.revokeObjectURL(url)
  }

  const deleteRecording = async (id: string) => {
    await deleteBlob(id)
    setRecordings((prev) => prev.filter((r) => r.id !== id))
    if (playingId === id) { currentAudioRef.current?.pause(); setPlayingId(null) }
  }

  const minutesLeft = totalMinutesAvailable(access)
  const explorerLeft = Math.max(0, 3 - (access.freeCreditsUsed || 0))
  const notesTier = getTierFromPlan(access.currentPlan, access.subscriptionStatus)

  return (
    <div className="min-h-screen bg-surface-base">
      <nav className="border-b border-white/5 bg-surface-elevated/50 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-sm text-[#8B97B5] hover:text-white transition-colors">
            <ArrowLeft size={16} /> Back
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
            <p className="text-[#8B97B5]">Record lectures, get AI-generated Smart Ink notes automatically.</p>
            {accessLoaded && (
              <p className="text-sm mt-2">
                {isUnlimitedPlan(access) ? (
                  <span className="text-green-400">✨ {access.currentPlan} plan · {formatMinutes(minutesLeft)} remaining this period</span>
                ) : minutesLeft > 0 ? (
                  <span className="text-brand-blue">💳 {formatMinutes(minutesLeft)} of AI processing time available</span>
                ) : explorerLeft > 0 ? (
                  <span className="text-brand-blue">🎓 {explorerLeft} free AI lecture{explorerLeft !== 1 ? 's' : ''} left</span>
                ) : (
                  <span className="text-brand-blue">💳 No minutes left — buy a pack or subscribe</span>
                )}
              </p>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-surface-elevated border border-white/5 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-sora font-bold text-xl text-white">Course & Unit</h2>
                {courses.length > 0 && !showAddForm && (
                  <button onClick={() => setShowAddForm(true)} className="flex items-center gap-1 text-xs text-brand-blue hover:text-brand-blue/80 font-medium">
                    <Plus size={13} /> Add new
                  </button>
                )}
              </div>

              <div className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 rounded-xl p-4 border border-indigo-500/20">
                <p className="text-sm font-semibold text-white mb-2">🎙️ SmartCapture AI Active</p>
                <div className="grid grid-cols-2 gap-1 text-xs text-gray-400">
                  <p>✓ Echo cancellation</p><p>✓ Noise suppression</p>
                  <p>✓ Kiswahili + English</p><p>✓ Smart Ink notes</p>
                </div>
              </div>

              <AnimatePresence>
                {showAddForm && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                    <div className="bg-surface-base rounded-xl p-4 space-y-3 border border-white/10">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-white">{courses.length === 0 ? 'Add your first course' : 'Add a course or unit'}</p>
                        {courses.length > 0 && <button onClick={() => setShowAddForm(false)} className="text-[#8B97B5] hover:text-white"><X size={16} /></button>}
                      </div>
                      <input type="text" placeholder="Course name, e.g. Biology 201" value={newCourseName} onChange={(e) => setNewCourseName(e.target.value)} className={inputClass} list="existing-course-names" />
                      <datalist id="existing-course-names">{courseNames.map(name => <option key={name} value={name} />)}</datalist>
                      <input type="text" placeholder="Unit name, e.g. Cell Biology" value={newUnitName} onChange={(e) => setNewUnitName(e.target.value)} className={inputClass} />
                      <input type="text" placeholder="Topics, comma-separated (optional)" value={newTopicsInput} onChange={(e) => setNewTopicsInput(e.target.value)} className={inputClass} />
                      <button onClick={handleQuickAddCourseUnit} className="w-full bg-brand-blue text-white font-semibold py-2.5 rounded-xl hover:bg-brand-blue/90 transition text-sm">Save & Select</button>
                      <p className="text-[10px] text-[#8B97B5]">Typing an existing course name adds this unit to it instead of duplicating it.</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {courses.length > 0 && !showAddForm && (
                <>
                  <div>
                    <label className="block text-sm text-white mb-2">Select Course</label>
                    <select value={selectedCourse} onChange={(e) => { setSelectedCourse(e.target.value); setSelectedUnit('') }} className={selectClass}>
                      <option value="">Choose a course…</option>
                      {courseNames.map((name) => <option key={name} value={name}>{name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-white mb-2">Select Unit <span className="text-[#8B97B5]">(for coverage tracking)</span></label>
                    <select value={selectedUnit} onChange={(e) => setSelectedUnit(e.target.value)} className={selectClass} disabled={!selectedCourse}>
                      <option value="">Choose a unit…</option>
                      {filteredUnits.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                  </div>
                  <button onClick={() => navigate('/units')} className="w-full text-xs text-[#8B97B5] hover:text-white underline">Manage full topic lists in Unit Management →</button>
                </>
              )}
            </div>

            <div className="bg-surface-elevated border border-white/5 rounded-2xl p-6 space-y-6 flex flex-col">
              {showPaywall && !isRecording ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 py-4">
                  <Lock size={32} className="text-brand-blue" />
                  <div>
                    <p className="text-white font-semibold mb-1">Out of AI minutes</p>
                    <p className="text-sm text-[#8B97B5]">Buy a minutes pack, or subscribe for the full STUDIA experience.</p>
                  </div>
                  <div className="w-full space-y-3">
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 text-[#4A5568]" size={18} />
                      <input type="tel" placeholder="M-Pesa number (07XX...)" value={litePhone} onChange={(e) => setLitePhone(e.target.value)} disabled={litePaying}
                        className="w-full bg-surface-base border border-white/10 rounded-xl pl-10 pr-3 py-2.5 text-white placeholder-[#4A5568] outline-none focus:border-brand-blue/40 text-sm disabled:opacity-50" />
                    </div>
                    {liteError && <p className="text-xs text-red-400">{liteError}</p>}
                    <div className="flex gap-2">
                      <button onClick={() => payForMinutes('achiever')} disabled={litePaying}
                        className="flex-1 bg-brand-blue text-white text-sm font-medium py-2.5 rounded-xl hover:bg-brand-blue/90 disabled:opacity-50 flex items-center justify-center gap-2">
                        {litePaying ? <Loader size={14} className="animate-spin" /> : null} KSh 45 · 45 min
                      </button>
                      <button onClick={() => payForMinutes('achiever-plus')} disabled={litePaying}
                        className="flex-1 bg-brand-blue text-white text-sm font-medium py-2.5 rounded-xl hover:bg-brand-blue/90 disabled:opacity-50 flex items-center justify-center gap-2">
                        {litePaying ? <Loader size={14} className="animate-spin" /> : null} KSh 69 · 90 min
                      </button>
                    </div>
                    <p className="text-[10px] text-[#8B97B5]">Includes recording, transcription, and Smart Ink notes. Subscribe for SAGE, quizzes, and more.</p>
                    <button onClick={() => navigate('/pricing')} className="w-full text-xs text-[#8B97B5] hover:text-white underline pt-1">Or subscribe for more features →</button>
                  </div>
                </div>
              ) : (
                <>
                  <canvas ref={canvasRef} width={500} height={200} className="w-full h-48 bg-surface-base rounded-xl" />
                  <div className="text-center flex-1 flex flex-col items-center justify-center">
                    <p className="text-5xl font-mono font-bold text-brand-blue mb-2">{formatTime(duration)}</p>
                    <p className="text-sm text-[#8B97B5]">
                      {isRecording ? '● Recording…' : recordings.length > 0 ? `${recordings.length} recording${recordings.length !== 1 ? 's' : ''} saved` : 'Ready to record'}
                    </p>
                    {uploadStatus && <p className="text-xs text-brand-blue mt-2 animate-pulse">{uploadStatus}</p>}
                  </div>
                  <div className="flex justify-center">
                    {!isRecording ? (
                      <button onClick={handleStartClick} disabled={!accessLoaded} className="inline-flex items-center gap-3 bg-brand-blue text-white font-semibold px-8 py-4 rounded-2xl hover:bg-brand-blue/90 transition-colors disabled:opacity-50">
                        <Mic size={22} /> Start Recording
                      </button>
                    ) : (
                      <button onClick={stopRecording} className="inline-flex items-center gap-3 bg-red-500 text-white font-semibold px-8 py-4 rounded-2xl animate-pulse">
                        <Square size={22} /> Stop Recording
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          <AnimatePresence>
            {showCoverageResult && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                className="bg-gradient-to-r from-brand-blue/10 to-purple-500/10 rounded-2xl p-8 border border-brand-blue/20">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h3 className="font-sora font-bold text-2xl text-white mb-1">📊 Unit Coverage Analysis</h3>
                    <p className="text-[#8B97B5] text-sm">{coverageData.covered} of {coverageData.total} topics covered in {coverageData.unitName}, based on your recorded lectures so far.</p>
                  </div>
                  <button onClick={() => setShowCoverageResult(false)} className="text-[#8B97B5] hover:text-white text-xl">✕</button>
                </div>
                <div className="flex items-center gap-4 mb-6">
                  <div className="flex-1 bg-surface-base rounded-full h-3">
                    <div className="bg-gradient-to-r from-brand-blue to-green-400 h-3 rounded-full transition-all duration-700"
                      style={{ width: `${coverageData.total > 0 ? Math.round((coverageData.covered / coverageData.total) * 100) : 0}%` }} />
                  </div>
                  <span className="font-sora font-bold text-2xl text-brand-blue">
                    {coverageData.total > 0 ? Math.round((coverageData.covered / coverageData.total) * 100) : 0}%
                  </span>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="font-semibold text-white text-sm mb-2">✓ Topics Covered</p>
                    <div className="flex flex-wrap gap-2">
                      {coverageData.topics.map((topic, i) => (
                        <span key={i} className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-xs font-medium">✓ {topic}</span>
                      ))}
                    </div>
                  </div>
                  {coverageData.covered < coverageData.total && (
                    <div className="p-4 bg-yellow-500/10 rounded-xl border border-yellow-500/20">
                      <p className="text-sm text-yellow-400 font-semibold mb-2">Topics Still to Cover</p>
                      <div className="flex flex-wrap gap-2">
                        {filteredUnits.find((u) => u.id === selectedUnit)?.topics
                          .filter((t) => !coverageData.topics.includes(t))
                          .map((topic, i) => (
                            <span key={i} className="bg-yellow-500/20 text-yellow-400 px-3 py-1 rounded-full text-xs">○ {topic}</span>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {recordings.length > 0 && (
            <div className="space-y-4">
              <h2 className="font-sora font-bold text-2xl text-white">Your Recordings</h2>
              <div className="space-y-3">
                {recordings.map((recording) => (
                  <motion.div key={recording.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className="bg-surface-elevated border border-white/5 rounded-2xl overflow-hidden">
                    <div className="p-4 flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium truncate">{recording.name}</p>
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          <span className="text-xs text-[#8B97B5] font-mono">{formatTime(recording.duration)}</span>
                          {recording.course && (
                            <span className="text-xs text-brand-blue">{recording.course}{recording.unit && ` · ${recording.unit}`}</span>
                          )}
                          {recording.isProcessing && (
                            <span className="text-xs text-purple-400 flex items-center gap-1">
                              <Loader size={10} className="animate-spin" /> Processing…
                            </span>
                          )}
                          {recording.notes && !recording.isProcessing && (
                            <span className="text-xs text-green-400">✓ Smart Ink ready</span>
                          )}
                          {recording.detectedLanguages && recording.detectedLanguages.length > 1 && (
                            <span className="text-xs text-purple-300">🌍 {recording.detectedLanguages.join(' + ')}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        {recording.notes && (
                          <button onClick={() => setExpandedId(expandedId === recording.id ? null : recording.id)}
                            className="p-2 rounded-lg bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 transition-colors" title="View Notes">
                            <FileText size={18} />
                          </button>
                        )}
                        <button onClick={() => playRecording(recording)} className="p-2 rounded-lg bg-brand-blue/10 text-brand-blue hover:bg-brand-blue/20 transition-colors">
                          {playingId === recording.id ? <Pause size={18} /> : <Play size={18} />}
                        </button>
                        <button onClick={() => downloadRecording(recording)} className="p-2 rounded-lg bg-brand-blue/10 text-brand-blue hover:bg-brand-blue/20 transition-colors">
                          <Download size={18} />
                        </button>
                        <button onClick={() => deleteRecording(recording.id)} className="p-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>

                    <AnimatePresence>
                      {expandedId === recording.id && recording.notes && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                          className="border-t border-white/5 p-6 bg-surface-base overflow-hidden space-y-6">

                          <div>
                            <h4 className="font-sora font-bold text-white mb-4 flex items-center gap-2">
                              <FileText size={16} className="text-purple-400" />
                              Smart Ink Notes
                              {notesTier !== 'plain' && (
                                <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ml-auto ${
                                  notesTier === 'semester' ? 'bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-indigo-300 border border-indigo-400/30'
                                  : notesTier === 'pro' ? 'bg-brand-blue/15 text-brand-blue'
                                  : 'bg-white/5 text-[#8B97B5]'
                                }`}>
                                  {notesTier === 'semester' ? 'Premium · Full Color' : notesTier === 'pro' ? '2D · Pro Color' : 'Lite · Sketch'}
                                </span>
                              )}
                            </h4>
                            {recording.structuredNotes ? (
                              <SmartInkNotes note={recording.structuredNotes} tier={notesTier} />
                            ) : (
                              <div className="text-sm text-[#8B97B5] whitespace-pre-wrap leading-relaxed">{recording.notes}</div>
                            )}
                          </div>

                          {recording.structuredScript && recording.structuredScript.length > 0 && (
                            <div>
                              <h4 className="font-sora font-bold text-white mb-3 text-sm">Timestamped Script — tap to jump to that moment</h4>
                              <TimestampedScript script={recording.structuredScript} recordingId={recording.id} />
                            </div>
                          )}

                          {recording.notes && (
                            <div>
                              <h4 className="font-sora font-bold text-white mb-3 text-sm">Read In Another Language</h4>
                              <LanguageViewSwitcher originalText={recording.notes} userId={userId} />
                            </div>
                          )}

                          {recording.notes && (
                            <button onClick={() => navigate('/sage')}
                              className="flex items-center gap-1.5 bg-indigo-premium/10 text-brand-blue px-4 py-2 rounded-xl text-xs font-semibold hover:bg-indigo-premium/20 transition">
                              <Brain size={14} /> Ask SAGE about this lecture
                            </button>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
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
