import { useAuth } from '../lib/AuthContext'
import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Loader, Copy, Download, Camera, Image, X, Lock } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { loadAccess, checkAccess, consumeCredit, freeCreditsRemaining, isUnlimitedPlan, type AccessInfo, emptyAccess } from '../lib/access'

export default function Summarize() {
  const navigate = useNavigate()
  const { userId } = useAuth()
  const [notes, setNotes] = useState('')
  const [summary, setSummary] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [showCamera, setShowCamera] = useState(false)
  const [inputMode, setInputMode] = useState<'text' | 'image'>('text')

  const [access, setAccess] = useState<AccessInfo>(emptyAccess)
  const [accessLoaded, setAccessLoaded] = useState(false)
  const [blocked, setBlocked] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    const init = async () => {
      const a = await loadAccess(userId)
      setAccess(a)
      setAccessLoaded(true)
    }
    init()
  }, [])

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      streamRef.current = stream
      setShowCamera(true)
      setTimeout(() => { if (videoRef.current) videoRef.current.srcObject = stream }, 100)
    } catch {
      alert('Camera access denied. Please allow camera access and try again.')
    }
  }

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setShowCamera(false)
  }

  const capturePhoto = () => {
    if (!videoRef.current) return
    const canvas = document.createElement('canvas')
    canvas.width = videoRef.current.videoWidth
    canvas.height = videoRef.current.videoHeight
    canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
    setUploadedImage(dataUrl)
    setInputMode('image')
    stopCamera()
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      setUploadedImage(ev.target?.result as string)
      setInputMode('image')
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const clearImage = () => {
    setUploadedImage(null)
    setInputMode('text')
  }

  const generateSummary = async () => {
    if (inputMode === 'text' && !notes.trim()) {
      alert('Please paste your lecture notes or upload an image')
      return
    }
    if (inputMode === 'image' && !uploadedImage) {
      alert('Please capture or upload an image first')
      return
    }

    const result = checkAccess(access, 'core')
    if (!result.allowed) { setBlocked(true); return }

    setLoading(true)
    try {
      const body = inputMode === 'image' ? { image: uploadedImage } : { text: notes }
      const res = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (data.summary) {
        setSummary(data.summary)
        await consumeCredit(access, result.source)
        setAccess((prev) => ({
          ...prev,
          freeCreditsUsed: result.source === 'free' ? prev.freeCreditsUsed + 1 : prev.freeCreditsUsed,
          liteBonusCredits: result.source === 'lite' ? Math.max(0, prev.liteBonusCredits - 1) : prev.liteBonusCredits,
        }))
      } else {
        alert('Error: ' + (data.error || 'Failed to generate summary'))
      }
    } catch (err) {
      alert('Error: ' + (err instanceof Error ? err.message : 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  const downloadSummary = () => {
    const element = document.createElement('a')
    const file = new Blob([summary], { type: 'text/plain' })
    element.href = URL.createObjectURL(file)
    element.download = 'summary.txt'
    element.click()
  }

  const copySummary = () => {
    navigator.clipboard.writeText(summary)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const canSubmit = inputMode === 'text' ? notes.trim().length > 0 : !!uploadedImage
  const remaining = freeCreditsRemaining(access)

  return (
    <div className="min-h-screen bg-surface-base">
      <AnimatePresence>
        {showCamera && (
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

      <nav className="border-b border-white/5 bg-surface-elevated/50 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-sm text-[#8B97B5] hover:text-white">
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
            <h1 className="font-sora font-bold text-4xl text-white mb-2">Summarize Lecture Notes</h1>
            <p className="text-[#8B97B5]">Type, paste, snap a photo, or upload an image — get an AI summary instantly.</p>
            {accessLoaded && (
              <p className="text-sm mt-2">
                {isUnlimitedPlan(access) ? (
                  <span className="text-green-400">✨ Unlimited — {access.currentPlan} plan</span>
                ) : remaining > 0 ? (
                  <span className="text-brand-blue">🎓 {remaining} free AI credit{remaining !== 1 ? 's' : ''} left</span>
                ) : access.liteBonusCredits > 0 ? (
                  <span className="text-brand-blue">💳 {access.liteBonusCredits} bonus credit{access.liteBonusCredits !== 1 ? 's' : ''} available</span>
                ) : (
                  <span className="text-brand-blue">💳 Free credits used — subscribe to continue</span>
                )}
              </p>
            )}
          </div>

          {blocked ? (
            <div className="bg-surface-elevated border border-white/5 rounded-2xl p-12 text-center space-y-4">
              <Lock size={32} className="mx-auto text-brand-blue" />
              <p className="text-white font-semibold">You've used your free AI credits</p>
              <p className="text-sm text-[#8B97B5]">Subscribe to a plan to keep summarizing notes — or record a Lite-paid lecture to earn a bonus credit.</p>
              <button onClick={() => navigate('/pricing')} className="bg-brand-blue text-white font-medium px-6 py-3 rounded-xl hover:bg-brand-blue/90">
                See Plans
              </button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-surface-elevated border border-white/5 rounded-2xl p-6 space-y-4">
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
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Paste your lecture notes here... The more detailed, the better the summary!"
                        className="w-full h-64 bg-surface-base border border-white/10 rounded-xl p-4 text-white placeholder-[#4A5568] outline-none focus:border-brand-blue/40 resize-none"
                      />
                    </motion.div>
                  ) : (
                    <motion.div key="image" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                      {uploadedImage ? (
                        <div className="relative rounded-xl overflow-hidden">
                          <img src={uploadedImage} alt="Uploaded notes" className="w-full h-64 object-cover rounded-xl" />
                          <button onClick={clearImage} className="absolute top-2 right-2 bg-black/70 text-white rounded-full p-1 hover:bg-black">
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <div className="h-64 bg-surface-base border border-white/10 border-dashed rounded-xl flex flex-col items-center justify-center gap-4 text-[#4A5568]">
                          <p className="text-sm">Snap or upload a photo of your notes</p>
                          <div className="flex gap-3">
                            <button onClick={startCamera} className="flex items-center gap-2 bg-surface-elevated border border-white/10 text-white px-4 py-2 rounded-xl hover:border-brand-blue/40 text-sm transition-colors">
                              <Camera size={16} className="text-brand-blue" /> Camera
                            </button>
                            <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 bg-surface-elevated border border-white/10 text-white px-4 py-2 rounded-xl hover:border-brand-blue/40 text-sm transition-colors">
                              <Image size={16} className="text-brand-blue" /> Gallery
                            </button>
                          </div>
                        </div>
                      )}

                      {uploadedImage && (
                        <div className="flex gap-3">
                          <button onClick={startCamera} className="flex-1 flex items-center justify-center gap-2 bg-surface-base border border-white/10 text-white py-2 rounded-xl hover:border-brand-blue/40 text-sm transition-colors">
                            <Camera size={15} className="text-brand-blue" /> Retake
                          </button>
                          <button onClick={() => fileInputRef.current?.click()} className="flex-1 flex items-center justify-center gap-2 bg-surface-base border border-white/10 text-white py-2 rounded-xl hover:border-brand-blue/40 text-sm transition-colors">
                            <Image size={15} className="text-brand-blue" /> Change
                          </button>
                        </div>
                      )}

                      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                    </motion.div>
                  )}
                </AnimatePresence>

                <button
                  onClick={generateSummary}
                  disabled={loading || !canSubmit}
                  className="w-full bg-brand-blue text-white font-medium py-3 rounded-xl hover:bg-brand-blue/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (<><Loader className="w-4 h-4 animate-spin" />{inputMode === 'image' ? 'Reading image...' : 'Generating...'}</>) : 'Generate Summary'}
                </button>
              </div>

              <div className="bg-surface-elevated border border-white/5 rounded-2xl p-6 space-y-4">
                <label className="block text-sm font-medium text-white">Your Summary:</label>
                {summary ? (
                  <>
                    <div className="h-64 bg-surface-base border border-white/10 rounded-xl p-4 overflow-y-auto">
                      <p className="text-[#8B97B5] leading-relaxed whitespace-pre-wrap text-sm">{summary}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={copySummary} className="flex-1 flex items-center justify-center gap-2 bg-brand-blue/10 text-brand-blue py-2 rounded-xl hover:bg-brand-blue/20 text-sm font-medium">
                        <Copy size={16} /> {copied ? 'Copied!' : 'Copy'}
                      </button>
                      <button onClick={downloadSummary} className="flex-1 flex items-center justify-center gap-2 bg-brand-blue/10 text-brand-blue py-2 rounded-xl hover:bg-brand-blue/20 text-sm font-medium">
                        <Download size={16} /> Download
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="h-64 bg-surface-base border border-white/10 rounded-xl p-4 flex items-center justify-center text-[#4A5568] text-center">
                    <p>Your summary will appear here...</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
