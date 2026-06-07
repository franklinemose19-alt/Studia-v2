import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Mic, Square, Play, Pause, Trash2, Download, ArrowLeft, Loader } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface Recording {
  id: string
  name: string
  duration: number
  timestamp: Date
  blob: Blob
  transcript?: string
  isTranscribing?: boolean
}

export default function Recording() {
  const navigate = useNavigate()
  const [isRecording, setIsRecording] = useState(false)
  const [recordings, setRecordings] = useState<Recording[]>([])
  const [duration, setDuration] = useState(0)
  const [playingId, setPlayingId] = useState<string | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (audioContextRef.current) audioContextRef.current.close()
    }
  }, [])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      audioContextRef.current = audioContext
      const analyser = audioContext.createAnalyser()
      analyserRef.current = analyser
      const source = audioContext.createMediaStreamSource(stream)
      source.connect(analyser)
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

  const stopRecording = async () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        const now = new Date()
        const recording: Recording = {
          id: `rec-${Date.now()}`,
          name: `Lecture ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`,
          duration,
          timestamp: now,
          blob,
          isTranscribing: true,
        }
        setRecordings((prev) => [recording, ...prev])

        // Transcribe
        try {
          const reader = new FileReader()
          reader.onload = async () => {
            const base64 = (reader.result as string).split(',')[1]
            const res = await fetch('/api/transcribe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ audio: base64 }),
            })
            const data = await res.json()
            if (data.text) {
              setRecordings((prev) =>
                prev.map((r) =>
                  r.id === recording.id
                    ? { ...r, transcript: data.text, isTranscribing: false }
                    : r
                )
              )
            } else {
              setRecordings((prev) =>
                prev.map((r) =>
                  r.id === recording.id
                    ? { ...r, transcript: 'Transcription failed', isTranscribing: false }
                    : r
                )
              )
            }
          }
          reader.readAsDataURL(blob)
        } catch (err) {
          console.error('Transcription failed:', err)
          setRecordings((prev) =>
            prev.map((r) =>
              r.id === recording.id
                ? { ...r, transcript: 'Error transcribing', isTranscribing: false }
                : r
            )
          )
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
            <h1 className="font-sora font-bold text-4xl text-white mb-2">Record Lecture</h1>
            <p className="text-[#8B97B5]">Record and we'll transcribe automatically.</p>
          </div>

          <div className="bg-surface-elevated border border-white/5 rounded-3xl p-8 space-y-6">
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

          {recordings.length > 0 && (
            <div className="space-y-4">
              <h2 className="font-sora font-bold text-2xl text-white">Recordings</h2>
              <div className="space-y-3">
                {recordings.map((recording) => (
                  <motion.div
                    key={recording.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-surface-elevated border border-white/5 rounded-2xl p-4"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-white font-medium">{recording.name}</p>
                        <p className="text-xs text-[#8B97B5]">{formatTime(recording.duration)}</p>
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

                    {recording.isTranscribing && (
                      <div className="flex items-center gap-2 text-sm text-[#8B97B5]">
                        <Loader className="w-4 h-4 animate-spin" />
                        Transcribing...
                      </div>
                    )}

                    {recording.transcript && !recording.isTranscribing && (
                      <div className="mt-4 pt-4 border-t border-white/5">
                        <p className="text-xs text-white font-medium mb-2">Transcript:</p>
                        <p className="text-sm text-[#8B97B5] leading-relaxed">{recording.transcript}</p>
                      </div>
                    )}
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
