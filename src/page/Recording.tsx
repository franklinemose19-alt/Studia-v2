import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, Square, Play, Pause, Trash2, Download, ArrowLeft, Loader, FileText, BookOpen, Phone, Lock } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { getSupabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/AuthContext'
import { loadAccess, checkAccess, consumeCredit, grantLiteBonusCredit, freeCreditsRemaining, isUnlimitedPlan, type AccessInfo, emptyAccess } from '../lib/access'
import SmartInkNotes from '../components/SmartInkNotes'
import { getTierFromPlan, type SmartInkNote } from '../lib/smartInk'

interface Recording {
  id: string
  name: string
  duration: number
  timestamp: Date
  blob?: Blob
  course?: string
  unit?: string
  storageUrl?: string
  transcript?: string
  notes?: string
  structuredNotes?: SmartInkNote
  isProcessing?: boolean
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

interface CoverageData {
  covered: number
  total: number
  topics: string[]
  unitName: string
}

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

const getSupportedMimeType = (): string => {
  const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/ogg', 'audio/mp4']
  return types.find((t) => MediaRecorder.isTypeSupported(t)) || ''
}

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

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

export default function RecordingPage() {
  const navigate = useNavigate()
  const { userId } = useAuth()

  const [isRecording, setIsRecording] = useState(false)
  const [recordings, setRecordings] = useState<Recording[]>([])
  const [duration, setDuration] = useState(0)
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const [units, setUnits] = useState<Unit[]>([])
  const [selectedCourse, setSelectedCourse] = useState('')
  const [selectedUnit, setSelectedUnit] = useState('')

  const [showCoverageResult, setShowCoverageResult] = useState(false)
  const [coverageData, setCoverageData] = useState<CoverageData>({ covered: 0, total: 0, topics: [], unitName: '' })

  const [uploadStatus, setUploadStatus] = useState<string>('')

  const [access, setAccess] = useState<AccessInfo>(emptyAccess)
  const [accessLoaded, setAccessLoaded] = useState(false)
  const [showPaywall, setShowPaywall] = useState(false)
  const [liteDurationCap, setLiteDurationCap] = useState<number | null>(null)

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
  const liteCapRef = useRef<number | null>(null)
  const sessionSourceRef = useRef<'unlimited' | 'free' | 'lite' | null>(null)

  useEffect(() => {
    try { setUnits(JSON.parse(localStorage.getItem('units') || '[]')) } catch { setUnits([]) }
    try { setRecordings(JSON.parse(localStorage.getItem('recordingsMetadata') || '[]')) } catch { setRecordings([]) }

    const init = async () => {
      const a = await loadAccess(userId)
      setAccess(a)
      setAccessLoaded(true)
    }
    init()

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (audioContextRef.current) audioContextRef.current.close()
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
      if (litePollRef.current) clearInterval(litePollRef.current)
    }
  }, [])

  useEffect(() => {
    const metadata = recordings.map(({ blob, ...rest }) => rest)
    try { localStorage.setItem('recordingsMetadata', JSON.stringify(metadata)) } catch { /* storage full */ }
  }, [recordings])

  const courseNames = Array.from(new Set(units.map((u) => u.course))).filter(Boolean)
  const filteredUnits = units.filter((u) => u.course === selectedCourse)

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

  const transcribeAudio = async (blob: Blob): Promise<string | null> => {
    try {
      setUploadStatus('🎙️ Transcribing lecture...')
      const base64 = await blobToBase64(blob)
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audio: base64, mimeType: blob.type }),
      })
      if (!response.ok) {
        const err = await response.json()
        console.error('Whisper error:', err)
        return null
      }
      const data = await response.json()
      return data.text || null
    } catch (err) {
      console.error('Transcription failed:', err)
      return null
    }
  }

  const generateNotes = async (
    transcript: string,
    courseName?: string,
    unitName?: string
  ): Promise<{ notes: string | null; structuredNotes: SmartInkNote | undefined }> => {
    try {
      setUploadStatus('📝 Generating Smart Ink notes...')
      const response = await fetch('/api/generate-lecture-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript, courseName, unitName }),
      })
      if (!response.ok) {
        const err = await response.json()
        console.error('GPT error:', err)
        return { notes: null, structuredNotes: undefined }
      }
      const data = await response.json()
      return {
        notes: data.notes || null,
        structuredNotes: data.structured || undefined,
      }
    } catch (err) {
      console.error('Notes generation failed:', err)
      return { notes: null, structuredNotes: undefined }
    }
  }

  const handleStartClick = () => {
    if (units.length === 0) {
      alert('Please add a course and unit first — taking you there now.')
      navigate('/units?returnTo=recording')
      return
    }
    if (!selectedUnit) {
      alert('Please select a course and unit before recording.')
      return
    }
    const result = checkAccess(access, 'core')
    if (result.allowed) {
      sessionSourceRef.current = result.source
      liteCapRef.current = null
      setLiteDurationCap(null)
      startRecording()
      return
    }
    setLiteError('')
    setShowPaywall(true)
  }

  const payForLecture = async (tier: '1hr' | '2hr') => {
    if (!litePhone.trim()) { setLiteError('Enter your M-Pesa number'); return }
    setLiteError('')
    setLitePaying(true)
    try {
      const amount = tier === '1hr' ? 60 : 110
      const res = await fetch('/api/mpesa-stk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: formatPhone(litePhone),
          amount,
          planId: `lite-${tier}`,
          planName: `Lite (${tier === '1hr' ? 'up to 1 hour' : 'up to 2 hours'})`,
          userId: access.userId,
        }),
      })
      const data = await res.json()
      if (!data.success) {
        setLiteError(data.error || 'Payment failed. Please try again.')
        setLitePaying(false)
        return
      }
      pollLitePayment(data.transactionId, tier)
    } catch {
      setLiteError('Connection error. Please try again.')
      setLitePaying(false)
    }
  }

  const pollLitePayment = (transactionId: string, tier: '1hr' | '2hr') => {
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
          const cap = tier === '1hr' ? 3600 : 7200
          liteCapRef.current = cap
          setLiteDurationCap(cap)
          sessionSourceRef.current = null

          if (access.userId) {
            await grantLiteBonusCredit(access.userId, access.liteBonusCredits)
            setAccess((prev) => ({ ...prev, liteBonusCredits: prev.liteBonusCredits + 1 }))
          }
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
      } catch {
        // keep polling on transient errors
      }
    }, 3000)
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
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
      const mimeType = getSupportedMimeType()
      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data) }
      mediaRecorder.start(250)
      setIsRecording(true)
      setDuration(0)
      setUploadStatus('')
      timerRef.current = setInterval(() => {
        setDuration((d) => {
          const next = d + 1
          if (liteCapRef.current && next >= liteCapRef.current) {
            setTimeout(() => stopRecording(), 0)
          }
          return next
        })
      }, 1000)
      visualize()
    } catch {
      alert('Microphone access denied. Please allow microphone access and try again.')
    }
  }

  const stopRecording = () => {
    if (!mediaRecorderRef.current || !isRecording) return
    mediaRecorderRef.current.onstop = async () => {
      const mimeType = getSupportedMimeType()
      const blob = new Blob(audioChunksRef.current, { type: mimeType || 'audio/webm' })
      const now = new Date()
      const id = `rec-${Date.now()}`
      const courseName = selectedCourse || undefined
      const unitName = selectedUnit ? units.find((u) => u.id === selectedUnit)?.unitName : undefined

      const recording: Recording = {
        id, name: `Lecture ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`, duration, timestamp: now,
        blob, course: courseName, unit: unitName, isProcessing: true,
      }

      await saveBlob(id, blob)
      setRecordings((prev) => [recording, ...prev])

      if (selectedUnit) {
        const unit = units.find((u) => u.id === selectedUnit)
        if (unit && unit.topics.length > 0) {
          const covered = Math.floor(unit.topics.length * (0.6 + Math.random() * 0.2))
          const detectedTopics = unit.topics.slice(0, covered)
          const coveragePercent = Math.round((detectedTopics.length / unit.topics.length) * 100)
          setCoverageData({ covered: detectedTopics.length, total: unit.topics.length, topics: detectedTopics, unitName: unit.unitName })
          setShowCoverageResult(true)
          const updatedUnits = units.map((u) =>
            u.id === selectedUnit
              ? { ...u, totalLectures: u.totalLectures + 1, lecturesCovered: u.lecturesCovered + detectedTopics.length, coverage: coveragePercent }
              : u
          )
          setUnits(updatedUnits)
          localStorage.setItem('units', JSON.stringify(updatedUnits))
        }
      }

      const usedSource = sessionSourceRef.current
      if (usedSource === 'free' || usedSource === 'lite') {
        await consumeCredit(access, usedSource)
        setAccess((prev) => ({
          ...prev,
          freeCreditsUsed: usedSource === 'free' ? prev.freeCreditsUsed + 1 : prev.freeCreditsUsed,
          liteBonusCredits: usedSource === 'lite' ? Math.max(0, prev.liteBonusCredits - 1) : prev.liteBonusCredits,
        }))
      }
      sessionSourceRef.current = null
      liteCapRef.current = null
      setLiteDurationCap(null)

      const storageUrl = await uploadToSupabase(blob, id, userId || 'anonymous')
      const transcript = await transcribeAudio(blob)
      const { notes, structuredNotes } = transcript
        ? await generateNotes(transcript, courseName, unitName)
        : { notes: null, structuredNotes: undefined }

      setUploadStatus(notes ? '✅ Smart Ink notes ready!' : '⚠️ Could not generate notes')

      setRecordings((prev) => prev.map((r) =>
        r.id === id
          ? { ...r, storageUrl: storageUrl || undefined, transcript: transcript || undefined, notes: notes || undefined, structuredNotes, isProcessing: false }
          : r
      ))

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
    if (!blob) { alert('Recording not found. Please re-record.'); return }
    const url = URL.createObjectURL(blob)
    const audio = new Audio(url)
    currentAudioRef.current = audio
    audio.play()
    setPlayingId(recording.id)
    audio.onended = () => { setPlayingId(null); URL.revokeObjectURL(url) }
    audio.onerror = () => { setPlayingId(null); URL.revokeObjectURL(url); alert('Could not play recording.') }
  }

  const downloadRecording = async (recording: Recording) => {
    const blob = recording.blob || await getBlob(recording.id)
    if (!blob) { alert('File not found.'); return }
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${recording.name}.webm`
    a.click()
    URL.revokeObjectURL(url)
  }

  const deleteRecording = async (id: string) => {
    await deleteBlob(id)
    setRecordings((prev) => prev.filter((r) => r.id !== id))
    if (playingId === id) { currentAudioRef.current?.pause(); setPlayingId(null) }
  }

  const remaining = freeCreditsRemaining(access)
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
                  <span className="text-green-400">✨ Unlimited — {access.currentPlan} plan</span>
                ) : remaining > 0 ? (
                  <span className="text-brand-blue">🎓 {remaining} free AI credit{remaining !== 1 ? 's' : ''} left</span>
                ) : access.liteBonusCredits > 0 ? (
                  <span className="text-brand-blue">💳 {access.liteBonusCredits} bonus credit{access.liteBonusCredits !== 1 ? 's' : ''} available</span>
                ) : (
                  <span className="text-brand-blue">💳 Free credits used — pay per lecture or subscribe</span>
                )}
              </p>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-surface-elevated border border-white/5 rounded-2xl p-6 space-y-4">
              <h2 className="font-sora font-bold text-xl text-white">Recording Settings</h2>
              <div className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 rounded-xl p-4 border border-indigo-500/20">
                <p className="text-sm font-semibold text-white mb-2">🎙️ SmartCapture AI Active</p>
                <div className="grid grid-cols-2 gap-1 text-xs text-gray-400">
                  <p>✓ Echo cancellation</p>
                  <p>✓ Noise suppression</p>
                  <p>✓ Whisper transcription</p>
                  <p>✓ Smart Ink notes</p>
                </div>
              </div>

              {units.length === 0 ? (
                <div className="bg-surface-base rounded-xl p-5 text-center space-y-3">
                  <BookOpen size={32} className="mx-auto text-[#4A5568]" />
                  <p className="text-sm text-[#8B97B5]">No units yet. You'll need to add a course and unit before recording — just hit "Start Recording" and we'll take you there.</p>
                </div>
              ) : (
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
                      {filteredUnits.map((u) => <option key={u.id} value={u.id}>{u.unitName}</option>)}
                    </select>
                  </div>

                  <button onClick={() => navigate('/units')} className="w-full text-xs text-[#8B97B5] hover:text-white underline">
                    Need to add a new course or unit?
                  </button>
                </>
              )}
            </div>

            <div className="bg-surface-elevated border border-white/5 rounded-2xl p-6 space-y-6 flex flex-col">
              {showPaywall && !isRecording ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 py-4">
                  <Lock size={32} className="text-brand-blue" />
                  <div>
                    <p className="text-white font-semibold mb-1">Free credits used up</p>
                    <p className="text-sm text-[#8B97B5]">Pay per lecture, or subscribe for unlimited recordings.</p>
                  </div>

                  <div className="w-full space-y-3">
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 text-[#4A5568]" size={18} />
                      <input
                        type="tel"
                        placeholder="M-Pesa number (07XX...)"
                        value={litePhone}
                        onChange={(e) => setLitePhone(e.target.value)}
                        disabled={litePaying}
                        className="w-full bg-surface-base border border-white/10 rounded-xl pl-10 pr-3 py-2.5 text-white placeholder-[#4A5568] outline-none focus:border-brand-blue/40 text-sm disabled:opacity-50"
                      />
                    </div>

                    {liteError && <p className="text-xs text-red-400">{liteError}</p>}

                    <div className="flex gap-2">
                      <button onClick={() => payForLecture('1hr')} disabled={litePaying}
                        className="flex-1 bg-brand-blue text-white text-sm font-medium py-2.5 rounded-xl hover:bg-brand-blue/90 disabled:opacity-50 flex items-center justify-center gap-2">
                        {litePaying ? <Loader size={14} className="animate-spin" /> : null} KSh 60 · up to 1hr
                      </button>
                      <button onClick={() => payForLecture('2hr')} disabled={litePaying}
                        className="flex-1 bg-brand-blue text-white text-sm font-medium py-2.5 rounded-xl hover:bg-brand-blue/90 disabled:opacity-50 flex items-center justify-center gap-2">
                        {litePaying ? <Loader size={14} className="animate-spin" /> : null} KSh 110 · up to 2hr
                      </button>
                    </div>
                    <p className="text-[10px] text-[#8B97B5]">Includes a bonus AI credit for a quiz, summary, or AI Tools use afterward.</p>

                    <button onClick={() => navigate('/pricing')} className="w-full text-xs text-[#8B97B5] hover:text-white underline pt-1">
                      Or subscribe for unlimited recordings →
                    </button>
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
                    {liteDurationCap && isRecording && (
                      <p className="text-xs text-amber-400 mt-1">Capped at {formatTime(liteDurationCap)} for this paid lecture</p>
                    )}
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
                    <p className="text-[#8B97B5] text-sm">{coverageData.covered} of {coverageData.total} topics covered in {coverageData.unitName}</p>
                  </div>
                  <button onClick={() => setShowCoverageResult(false)} className="text-[#8B97B5] hover:text-white text-xl">✕</button>
                </div>
                <div className="flex items-center gap-4 mb-6">
                  <div className="flex-1 bg-surface-base rounded-full h-3">
                    <div className="bg-gradient-to-r from-brand-blue to-green-400 h-3 rounded-full transition-all duration-700"
                      style={{ width: `${Math.round((coverageData.covered / coverageData.total) * 100)}%` }} />
                  </div>
                  <span className="font-sora font-bold text-2xl text-brand-blue">
                    {Math.round((coverageData.covered / coverageData.total) * 100)}%
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
                        {units.find((u) => u.id === selectedUnit)?.topics
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
                          className="border-t border-white/5 p-6 bg-surface-base overflow-hidden">
                          <h4 className="font-sora font-bold text-white mb-4 flex items-center gap-2">
                            <FileText size={16} className="text-purple-400" />
                            Smart Ink Notes
                            {notesTier !== 'plain' && (
                              <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ml-auto ${
                                notesTier === 'semester' ? 'bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-indigo-300 border border-indigo-400/30'
                                : notesTier === 'pro' ? 'bg-brand-blue/15 text-brand-blue'
                                : 'bg-white/5 text-[#8B97B5]'
                              }`}>
                                {notesTier === 'semester' ? '3D · Full Color' : notesTier === 'pro' ? '2D · Pro Color' : 'Lite · Sketch'}
                              </span>
                            )}
                          </h4>
                          {recording.structuredNotes ? (
                            <SmartInkNotes note={recording.structuredNotes} tier={notesTier} />
                          ) : (
                            <div className="text-sm text-[#8B97B5] whitespace-pre-wrap leading-relaxed">{recording.notes}</div>
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
