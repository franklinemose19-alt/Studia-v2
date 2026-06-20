import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Camera, Image, X, Loader, Copy, Download,
  Zap, FileText, BookOpen, ChevronDown, ChevronUp, Check, Lock
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { loadAccess, checkAccess, consumeCredit, freeCreditsRemaining, isUnlimitedPlan, isPremiumPlan, type AccessInfo, emptyAccess } from '../lib/access'

type Tab = 'snapsolve' | 'pastpapers' | 'deepnotes'

interface SnapResult {
  question: string
  answer: string
  explanation: string
  revision_notes: string
  quiz: { question: string; options: string[]; answer: string }[]
}

interface PastPaperResult {
  paper_title: string
  questions: { number: string; question: string; model_answer: string; marks: string; key_points: string[] }[]
  common_themes: string[]
  exam_tips: string[]
  predicted_topics: string[]
}

interface DeepNotesResult {
  title: string
  subject: string
  overview: string
  deep_notes: { heading: string; content: string; examples: string[]; key_terms: string[] }[]
  summary: string
  revision_checklist: string[]
  further_reading: string[]
}

export default function AITools() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('snapsolve')
  const [image, setImage] = useState<string | null>(null)
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [showCamera, setShowCamera] = useState(false)
  const [result, setResult] = useState<SnapResult | PastPaperResult | DeepNotesResult | null>(null)
  const [copied, setCopied] = useState(false)
  const [expandedQ, setExpandedQ] = useState<string | null>(null)
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({})
  const [showAnswers, setShowAnswers] = useState<Record<number, boolean>>({})

  const [access, setAccess] = useState<AccessInfo>(emptyAccess)
  const [accessLoaded, setAccessLoaded] = useState(false)
  const [blockReason, setBlockReason] = useState<'no_credits' | 'needs_pro' | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    const init = async () => {
      const a = await loadAccess()
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
      alert('Camera access denied.')
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
    setImage(canvas.toDataURL('image/jpeg', 0.85))
    setResult(null)
    stopCamera()
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      setImage(ev.target?.result as string)
      setResult(null)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const clearAll = () => {
    setImage(null)
    setText('')
    setResult(null)
    setSelectedAnswers({})
    setShowAnswers({})
    setBlockReason(null)
  }

  const handleSubmit = async () => {
    if (!image && !text.trim()) {
      alert('Please upload an image or enter some text first.')
      return
    }

    const result_ = checkAccess(access, 'premium')
    if (!result_.allowed) {
      setBlockReason(result_.reason)
      return
    }
    setBlockReason(null)

    setLoading(true)
    setResult(null)

    try {
      const res = await fetch('/api/ai-tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: tab, image, text }),
      })
      const data = await res.json()
      if (data.result) {
        setResult(data.result)
        await consumeCredit(access, result_.source)
        setAccess((prev) => ({
          ...prev,
          freeCreditsUsed: result_.source === 'free' ? prev.freeCreditsUsed + 1 : prev.freeCreditsUsed,
          liteBonusCredits: result_.source === 'lite' ? Math.max(0, prev.liteBonusCredits - 1) : prev.liteBonusCredits,
        }))
      } else {
        alert('Error: ' + (data.error || 'Failed to process'))
      }
    } catch (err) {
      alert('Failed to connect. Check your internet and try again.')
    } finally {
      setLoading(false)
    }
  }

  const copyResult = () => {
    navigator.clipboard.writeText(JSON.stringify(result, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const downloadResult = () => {
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'text/plain' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${tab}-result.txt`
    a.click()
  }

  const tabs = [
    { id: 'snapsolve' as Tab, label: 'SnapSolve', icon: Zap, desc: 'Snap a question and get instant AI answers' },
    { id: 'pastpapers' as Tab, label: 'Past Papers', icon: FileText, desc: 'Upload past papers for model answers and predictions' },
    { id: 'deepnotes' as Tab, label: 'Deep Notes', icon: BookOpen, desc: 'Transform any notes into deep structured study material' },
  ]

  const currentTab = tabs.find((t) => t.id === tab)!
  const remaining = freeCreditsRemaining(access)

  const renderSnapSolve = (r: SnapResult) => (
    <div className="space-y-6">
      <div className="bg-surface-base border border-white/10 rounded-2xl p-6">
        <p className="text-xs text-brand-blue font-semibold mb-2 uppercase tracking-wider">Question Detected</p>
        <p className="text-white font-medium">{r.question}</p>
      </div>
      <div className="bg-gradient-to-br from-brand-blue/10 to-purple-500/10 border border-brand-blue/20 rounded-2xl p-6">
        <p className="text-xs text-brand-blue font-semibold mb-3 uppercase tracking-wider">Answer</p>
        <p className="text-white leading-relaxed whitespace-pre-wrap">{r.answer}</p>
      </div>
      <div className="bg-surface-base border border-white/10 rounded-2xl p-6">
        <p className="text-xs text-purple-400 font-semibold mb-3 uppercase tracking-wider">Explanation</p>
        <p className="text-[#8B97B5] leading-relaxed">{r.explanation}</p>
      </div>
      <div className="bg-surface-base border border-white/10 rounded-2xl p-6">
        <p className="text-xs text-green-400 font-semibold mb-3 uppercase tracking-wider">Revision Notes</p>
        <p className="text-[#8B97B5] leading-relaxed whitespace-pre-wrap">{r.revision_notes}</p>
      </div>
      {r.quiz && r.quiz.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs text-yellow-400 font-semibold uppercase tracking-wider">Quick Quiz</p>
          {r.quiz.map((q, i) => (
            <div key={i} className="bg-surface-base border border-white/10 rounded-2xl p-5">
              <p className="text-white font-medium mb-3">{i + 1}. {q.question}</p>
              <div className="grid grid-cols-2 gap-2 mb-3">
                {q.options.map((opt, j) => (
                  <button key={j} onClick={() => setSelectedAnswers((prev) => ({ ...prev, [i]: opt }))}
                    className={`text-left p-3 rounded-xl text-sm border transition-colors ${
                      selectedAnswers[i] === opt
                        ? showAnswers[i]
                          ? opt === q.answer ? 'bg-green-500/20 border-green-500/50 text-green-400' : 'bg-red-500/20 border-red-500/50 text-red-400'
                          : 'bg-brand-blue/20 border-brand-blue/50 text-brand-blue'
                        : 'bg-surface-elevated border-white/10 text-[#8B97B5] hover:border-white/30'
                    }`}>
                    {opt}
                  </button>
                ))}
              </div>
              <button onClick={() => setShowAnswers((prev) => ({ ...prev, [i]: true }))} className="text-xs text-brand-blue hover:text-brand-blue/80 transition-colors">
                {showAnswers[i] ? `✓ Answer: ${q.answer}` : 'Show Answer'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  const renderPastPapers = (r: PastPaperResult) => (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-brand-blue/10 to-purple-500/10 border border-brand-blue/20 rounded-2xl p-6">
        <p className="text-xs text-brand-blue font-semibold mb-1 uppercase tracking-wider">Paper</p>
        <p className="text-white font-sora font-bold text-xl">{r.paper_title}</p>
      </div>
      <div className="space-y-3">
        <p className="text-xs text-white font-semibold uppercase tracking-wider">Questions & Model Answers</p>
        {r.questions.map((q, i) => (
          <div key={i} className="bg-surface-base border border-white/10 rounded-2xl overflow-hidden">
            <button onClick={() => setExpandedQ(expandedQ === `q${i}` ? null : `q${i}`)} className="w-full flex items-center justify-between p-5 text-left">
              <div>
                <span className="text-brand-blue text-sm font-semibold">Q{q.number}</span>
                <p className="text-white font-medium mt-1">{q.question}</p>
                <span className="text-xs text-[#4A5568] mt-1 block">{q.marks} marks</span>
              </div>
              {expandedQ === `q${i}` ? <ChevronUp size={18} className="text-[#8B97B5] shrink-0" /> : <ChevronDown size={18} className="text-[#8B97B5] shrink-0" />}
            </button>
            <AnimatePresence>
              {expandedQ === `q${i}` && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t border-white/5">
                  <div className="p-5 space-y-4">
                    <div>
                      <p className="text-xs text-green-400 font-semibold mb-2 uppercase tracking-wider">Model Answer</p>
                      <p className="text-[#8B97B5] leading-relaxed whitespace-pre-wrap">{q.model_answer}</p>
                    </div>
                    {q.key_points.length > 0 && (
                      <div>
                        <p className="text-xs text-yellow-400 font-semibold mb-2 uppercase tracking-wider">Key Points</p>
                        <ul className="space-y-1">
                          {q.key_points.map((kp, j) => (
                            <li key={j} className="text-sm text-[#8B97B5] flex items-start gap-2">
                              <span className="text-yellow-400 mt-0.5">•</span> {kp}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-surface-base border border-white/10 rounded-2xl p-5">
          <p className="text-xs text-purple-400 font-semibold mb-3 uppercase tracking-wider">Common Themes</p>
          <ul className="space-y-2">{r.common_themes.map((t, i) => (<li key={i} className="text-sm text-[#8B97B5] flex items-start gap-2"><span className="text-purple-400">•</span> {t}</li>))}</ul>
        </div>
        <div className="bg-surface-base border border-white/10 rounded-2xl p-5">
          <p className="text-xs text-brand-blue font-semibold mb-3 uppercase tracking-wider">Exam Tips</p>
          <ul className="space-y-2">{r.exam_tips.map((t, i) => (<li key={i} className="text-sm text-[#8B97B5] flex items-start gap-2"><span className="text-brand-blue">•</span> {t}</li>))}</ul>
        </div>
        <div className="bg-surface-base border border-white/10 rounded-2xl p-5">
          <p className="text-xs text-green-400 font-semibold mb-3 uppercase tracking-wider">Predicted Topics</p>
          <ul className="space-y-2">{r.predicted_topics.map((t, i) => (<li key={i} className="text-sm text-[#8B97B5] flex items-start gap-2"><span className="text-green-400">•</span> {t}</li>))}</ul>
        </div>
      </div>
    </div>
  )

  const renderDeepNotes = (r: DeepNotesResult) => (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-brand-blue/10 to-purple-500/10 border border-brand-blue/20 rounded-2xl p-6">
        <p className="text-xs text-brand-blue font-semibold mb-1 uppercase tracking-wider">{r.subject}</p>
        <p className="text-white font-sora font-bold text-2xl mb-3">{r.title}</p>
        <p className="text-[#8B97B5] leading-relaxed">{r.overview}</p>
      </div>
      <div className="space-y-4">
        <p className="text-xs text-white font-semibold uppercase tracking-wider">Deep Study Notes</p>
        {r.deep_notes.map((section, i) => (
          <div key={i} className="bg-surface-base border border-white/10 rounded-2xl p-6 space-y-4">
            <p className="text-white font-sora font-bold text-lg">{section.heading}</p>
            <p className="text-[#8B97B5] leading-relaxed">{section.content}</p>
            {section.examples.length > 0 && (
              <div>
                <p className="text-xs text-yellow-400 font-semibold mb-2 uppercase tracking-wider">Examples</p>
                <ul className="space-y-1">{section.examples.map((ex, j) => (<li key={j} className="text-sm text-[#8B97B5] flex items-start gap-2"><span className="text-yellow-400">→</span> {ex}</li>))}</ul>
              </div>
            )}
            {section.key_terms.length > 0 && (
              <div>
                <p className="text-xs text-purple-400 font-semibold mb-2 uppercase tracking-wider">Key Terms</p>
                <div className="flex flex-wrap gap-2">{section.key_terms.map((term, j) => (<span key={j} className="text-xs bg-purple-500/10 text-purple-400 border border-purple-500/20 px-3 py-1 rounded-full">{term}</span>))}</div>
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-surface-base border border-white/10 rounded-2xl p-5">
          <p className="text-xs text-green-400 font-semibold mb-3 uppercase tracking-wider">Revision Checklist</p>
          <ul className="space-y-2">{r.revision_checklist.map((item, i) => (<li key={i} className="text-sm text-[#8B97B5] flex items-start gap-2"><Check size={14} className="text-green-400 mt-0.5 shrink-0" /> {item}</li>))}</ul>
        </div>
        <div className="bg-surface-base border border-white/10 rounded-2xl p-5">
          <p className="text-xs text-brand-blue font-semibold mb-3 uppercase tracking-wider">Further Reading</p>
          <ul className="space-y-2">{r.further_reading.map((item, i) => (<li key={i} className="text-sm text-[#8B97B5] flex items-start gap-2"><span className="text-brand-blue">→</span> {item}</li>))}</ul>
        </div>
      </div>
      <div className="bg-surface-base border border-white/10 rounded-2xl p-5">
        <p className="text-xs text-white font-semibold mb-3 uppercase tracking-wider">Summary</p>
        <p className="text-[#8B97B5] leading-relaxed">{r.summary}</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-surface-base">
      <AnimatePresence>
        {showCamera && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center gap-6 p-4">
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
            <h1 className="font-sora font-bold text-4xl text-white mb-2">AI Tools</h1>
            <p className="text-[#8B97B5]">SnapSolve, Past Papers, and Deep Notes — all in one place.</p>
            {accessLoaded && (
              <p className="text-sm mt-2">
                {isPremiumPlan(access) ? (
                  <span className="text-green-400">✨ Unlimited — {access.currentPlan} plan</span>
                ) : isUnlimitedPlan(access) ? (
                  <span className="text-amber-400">⚠️ AI Tools needs Pro or Semester — your {access.currentPlan} plan doesn't include it (unless you have free/bonus credits)</span>
                ) : remaining > 0 ? (
                  <span className="text-brand-blue">🎓 {remaining} free AI credit{remaining !== 1 ? 's' : ''} left</span>
                ) : access.liteBonusCredits > 0 ? (
                  <span className="text-brand-blue">💳 {access.liteBonusCredits} bonus credit{access.liteBonusCredits !== 1 ? 's' : ''} available</span>
                ) : (
                  <span className="text-brand-blue">💳 Free credits used — Pro or Semester unlocks AI Tools</span>
                )}
              </p>
            )}
          </div>

          {blockReason && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-6 flex items-start gap-4">
              <Lock size={24} className="text-amber-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-white font-semibold mb-1">
                  {blockReason === 'needs_pro' ? 'AI Tools needs Pro or Semester' : "You've used your free AI credits"}
                </p>
                <p className="text-sm text-[#8B97B5] mb-3">
                  {blockReason === 'needs_pro'
                    ? 'Your current plan covers Recording, Quiz, and Summarize — SnapSolve, Past Papers, and Deep Notes are reserved for Pro and Semester.'
                    : 'Subscribe to a plan to keep using AI Tools — or earn a bonus credit by paying for a Lite lecture in Recording.'}
                </p>
                <button onClick={() => navigate('/pricing')} className="bg-brand-blue text-white text-sm font-medium px-5 py-2.5 rounded-xl hover:bg-brand-blue/90">
                  See Plans
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            {tabs.map((t) => {
              const Icon = t.icon
              return (
                <button key={t.id} onClick={() => { setTab(t.id); clearAll() }}
                  className={`p-4 rounded-2xl border text-left transition-all ${
                    tab === t.id ? 'bg-brand-blue/10 border-brand-blue/40 text-white' : 'bg-surface-elevated border-white/5 text-[#8B97B5] hover:border-white/20'
                  }`}>
                  <Icon size={20} className={tab === t.id ? 'text-brand-blue mb-2' : 'text-[#4A5568] mb-2'} />
                  <p className="font-semibold text-sm">{t.label}</p>
                  <p className="text-xs text-[#4A5568] mt-1 hidden md:block">{t.desc}</p>
                </button>
              )
            })}
          </div>

          <div className="bg-surface-elevated border border-white/5 rounded-2xl p-6 space-y-4">
            <p className="text-white font-semibold">{currentTab.desc}</p>

            {image ? (
              <div className="relative rounded-xl overflow-hidden">
                <img src={image} alt="Uploaded" className="w-full max-h-72 object-cover rounded-xl" />
                <button onClick={() => setImage(null)} className="absolute top-2 right-2 bg-black/70 text-white rounded-full p-1 hover:bg-black">
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div className="border border-white/10 border-dashed rounded-xl p-8 flex flex-col items-center justify-center gap-4 text-[#4A5568]">
                <p className="text-sm text-center">Take a photo or upload an image</p>
                <div className="flex gap-3">
                  <button onClick={startCamera} className="flex items-center gap-2 bg-surface-base border border-white/10 text-white px-4 py-2 rounded-xl hover:border-brand-blue/40 text-sm transition-colors">
                    <Camera size={16} className="text-brand-blue" /> Camera
                  </button>
                  <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 bg-surface-base border border-white/10 text-white px-4 py-2 rounded-xl hover:border-brand-blue/40 text-sm transition-colors">
                    <Image size={16} className="text-brand-blue" /> Gallery
                  </button>
                </div>
              </div>
            )}

            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-xs text-[#4A5568]">OR</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={tab === 'snapsolve' ? 'Type or paste your question here...' : tab === 'pastpapers' ? 'Paste past paper questions here...' : 'Paste your notes here to expand into deep study material...'}
              className="w-full h-36 bg-surface-base border border-white/10 rounded-xl p-4 text-white placeholder-[#4A5568] outline-none focus:border-brand-blue/40 resize-none"
            />

            <button
              onClick={handleSubmit}
              disabled={loading || (!image && !text.trim())}
              className="w-full bg-brand-blue text-white font-medium py-3 rounded-xl hover:bg-brand-blue/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (<><Loader className="animate-spin" size={18} />{tab === 'snapsolve' ? 'Solving...' : tab === 'pastpapers' ? 'Analyzing paper...' : 'Generating deep notes...'}</>) : (
                <>{tab === 'snapsolve' ? '⚡ Solve Now' : tab === 'pastpapers' ? '📄 Analyze Paper' : '📚 Generate Deep Notes'}</>
              )}
            </button>
          </div>

          <AnimatePresence>
            {result && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-white font-sora font-bold text-xl">Results</p>
                  <div className="flex gap-2">
                    <button onClick={copyResult} className="flex items-center gap-2 bg-surface-elevated border border-white/10 text-[#8B97B5] px-4 py-2 rounded-xl hover:text-white text-sm transition-colors">
                      <Copy size={15} /> {copied ? 'Copied!' : 'Copy'}
                    </button>
                    <button onClick={downloadResult} className="flex items-center gap-2 bg-surface-elevated border border-white/10 text-[#8B97B5] px-4 py-2 rounded-xl hover:text-white text-sm transition-colors">
                      <Download size={15} /> Download
                    </button>
                  </div>
                </div>
                {tab === 'snapsolve' && renderSnapSolve(result as SnapResult)}
                {tab === 'pastpapers' && renderPastPapers(result as PastPaperResult)}
                {tab === 'deepnotes' && renderDeepNotes(result as DeepNotesResult)}
              </motion.div>
            )}
          </AnimatePresence>

        </motion.div>
      </div>
    </div>
  )
}
