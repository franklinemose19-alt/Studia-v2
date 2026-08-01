import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Brain, MessageCircle, BookOpen, CreditCard as FlashcardIcon,
  ClipboardList, FileText, Search, Volume2, VolumeX, Camera,
  Send, Loader, ArrowLeft, ChevronDown, ChevronUp, RefreshCw,
  Play, Pause, RotateCcw, RotateCw, Code2, AlertTriangle,
  CheckCircle, XCircle, Eye, Zap, Target, TrendingUp,
  ChevronLeft, ChevronRight, Clock, Star, Hash,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { getSupabase } from '../lib/supabaseClient'
import {
  loadAccess, checkAccess, isUnlimitedPlan, explorerLecturesRemaining,
  paidLecturesRemaining, type AccessInfo, emptyAccess,
} from '../lib/access'
import {
  getAllRecordings, getLecturePacket, buildLecturePromptContext,
  type LecturePacket, type Recording,
} from '../lib/lectureContext'
import { sageCache } from '../lib/sageCache'
import { buildStudentContext, formatContextForAI } from '../lib/studentContext'
import { toast } from '../lib/toast'

// ── Types ──────────────────────────────────────────────────────────────────

type Tab = 'chat' | 'deepnotes' | 'flashcards' | 'quiz' | 'pastpapers' | 'knowledgegap' | 'voice' | 'snapsolve' | 'devmode'

interface Message { role: 'user' | 'assistant'; content: string }

interface Flashcard {
  id: string
  front: string
  back: string
  topic: string
  difficulty: 'easy' | 'medium' | 'hard'
}

interface QuizQuestion {
  id: string
  question: string
  options: string[]
  correct: number
  explanation: string
  marks: number
  topic: string
  difficulty: string
}

interface MockExam {
  examTitle: string
  timeAllowed: string
  questions: QuizQuestion[]
  totalMarks: number
}

interface KnowledgeGap {
  knowledgeCoverage: number
  examReadiness: number
  understandingScore: number
  confidenceScore: number
  coveredConcepts: string[]
  missingConcepts: string[]
  weakAreas: string[]
  strongAreas: string[]
  recommendations: string[]
  studyNext: string
  examTips: string[]
  topicsMastered: string[]
  summary: string
}

interface DeepNotesSection {
  heading: string
  explanation: string
  simpleExplanation: string
  examples: string[]
  definitions: { term: string; definition: string }[]
  memoryTrick: string
  commonMistakes: string[]
  examTips: string[]
  relatedConcepts: string[]
  realWorldApplication: string
}

interface DeepNotesResult {
  title: string
  subject: string
  overview: string
  sections: DeepNotesSection[]
  formulasAndKeyFacts: string[]
  quickRevision: string[]
  predictedExamQuestions: string[]
}

const TABS: { id: Tab; label: string; icon: any; adminOnly?: boolean }[] = [
  { id: 'chat', label: 'AI Chat', icon: MessageCircle },
  { id: 'deepnotes', label: 'Deep Notes', icon: BookOpen },
  { id: 'flashcards', label: 'Flashcards', icon: FlashcardIcon },
  { id: 'quiz', label: 'Mock Exam', icon: ClipboardList },
  { id: 'pastpapers', label: 'Past Papers', icon: FileText },
  { id: 'knowledgegap', label: 'Knowledge Gap', icon: Search },
  { id: 'voice', label: 'Voice', icon: Volume2 },
  { id: 'snapsolve', label: 'SnapSolve', icon: Camera },
  { id: 'devmode', label: 'Dev Mode', icon: Code2, adminOnly: true },
]

const DIFF_COLORS = {
  easy: 'text-green-400 bg-green-500/10',
  medium: 'text-yellow-400 bg-yellow-500/10',
  hard: 'text-red-400 bg-red-500/10',
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function SageAITutor() {
  const navigate = useNavigate()
  const { userId } = useAuth()
  const fileRef = useRef<HTMLInputElement>(null)

  // Access control
  const [access, setAccess] = useState<AccessInfo>(emptyAccess)
  const [accessLoaded, setAccessLoaded] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  // Lecture context
  const [recordings, setRecordings] = useState<Recording[]>([])
  const [selectedLectureId, setSelectedLectureId] = useState<string>('')
  const [lecturePacket, setLecturePacket] = useState<LecturePacket | null>(null)
  const [showLectureSelector, setShowLectureSelector] = useState(false)

  // Tab state
  const [activeTab, setActiveTab] = useState<Tab>('chat')

  // Chat
  const [chatMessages, setChatMessages] = useState<Message[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  // Deep Notes
  const [deepNotes, setDeepNotes] = useState<DeepNotesResult | null>(null)
  const [deepNotesLoading, setDeepNotesLoading] = useState(false)
  const [expandedSection, setExpandedSection] = useState<number | null>(0)

  // Flashcards
  const [flashcards, setFlashcards] = useState<Flashcard[]>([])
  const [flashcardsLoading, setFlashcardsLoading] = useState(false)
  const [currentCard, setCurrentCard] = useState(0)
  const [cardFlipped, setCardFlipped] = useState(false)
  const [cardProgress, setCardProgress] = useState<Record<string, 'known' | 'learning' | null>>({})

  // Mock Exam
  const [mockExam, setMockExam] = useState<MockExam | null>(null)
  const [mockExamLoading, setMockExamLoading] = useState(false)
  const [examAnswers, setExamAnswers] = useState<Record<string, number>>({})
  const [examSubmitted, setExamSubmitted] = useState(false)
  const [examTimeLeft, setExamTimeLeft] = useState<number | null>(null)

  // Past Papers
  const [pastPaperImage, setPastPaperImage] = useState<string | null>(null)
  const [pastPaperText, setPastPaperText] = useState('')
  const [pastPaperResult, setPastPaperResult] = useState<any>(null)
  const [pastPaperLoading, setPastPaperLoading] = useState(false)

  // Knowledge Gap
  const [knowledgeGap, setKnowledgeGap] = useState<KnowledgeGap | null>(null)
  const [knowledgeGapLoading, setKnowledgeGapLoading] = useState(false)

  // Voice
  const [isReading, setIsReading] = useState(false)
  const [readingSpeed, setReadingSpeed] = useState(1.0)
  const [readingText, setReadingText] = useState<'notes' | 'summary'>('notes')
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)
  const [speechSupported] = useState(() => 'speechSynthesis' in window)

  // SnapSolve
  const [snapImage, setSnapImage] = useState<string | null>(null)
  const [snapText, setSnapText] = useState('')
  const [snapResult, setSnapResult] = useState<any>(null)
  const [snapLoading, setSnapLoading] = useState(false)
  const snapFileRef = useRef<HTMLInputElement>(null)

  // Dev Mode
  const [devMessages, setDevMessages] = useState<Message[]>([])
  const [devInput, setDevInput] = useState('')
  const [devLoading, setDevLoading] = useState(false)

  // ── Init ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const recs = getAllRecordings()
    setRecordings(recs)
    if (recs.length > 0 && !selectedLectureId) {
      // Auto-select most recent
      const sorted = [...recs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      setSelectedLectureId(sorted[0].id)
    }

    const initAccess = async () => {
      const a = await loadAccess(userId)
      setAccess(a)
      setAccessLoaded(true)
    }
    initAccess()

    // Check admin
    if (userId) {
      getSupabase().then(client => {
        client.from('users').select('is_admin').eq('auth_id', userId).maybeSingle()
          .then(({ data }) => setIsAdmin(!!data?.is_admin))
      })
    }
  }, [userId])

  useEffect(() => {
    if (selectedLectureId) {
      const packet = getLecturePacket(selectedLectureId)
      setLecturePacket(packet)
      // Clear previous results when lecture changes
      setDeepNotes(null)
      setFlashcards([])
      setMockExam(null)
      setKnowledgeGap(null)
      setExamAnswers({})
      setExamSubmitted(false)
    }
  }, [selectedLectureId])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  // Exam timer
  useEffect(() => {
    if (!mockExam || !examTimeLeft || examSubmitted) return
    if (examTimeLeft <= 0) { submitExam(); return }
    const t = setTimeout(() => setExamTimeLeft(prev => (prev || 0) - 1), 1000)
    return () => clearTimeout(t)
  }, [examTimeLeft, examSubmitted])

  // ── Helpers ─────────────────────────────────────────────────────────────

  const lectureContent = lecturePacket
    ? (lecturePacket.notes || '') + '\n\n' + (lecturePacket.transcript || '')
    : ''

  const studentCtx = formatContextForAI(buildStudentContext(access.currentPlan))

  const callSage = async (body: any) => {
    const res = await fetch('/api/ai-tools', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error || 'Request failed')
    }
    return res.json()
  }

  // ── Chat ────────────────────────────────────────────────────────────────

  const sendChat = async () => {
    if (!chatInput.trim() || chatLoading) return
    const userMsg: Message = { role: 'user', content: chatInput.trim() }
    const newMessages = [...chatMessages, userMsg]
    setChatMessages(newMessages)
    setChatInput('')
    setChatLoading(true)

    try {
      const data = await callSage({
        mode: 'chat',
        chatMessages: newMessages,
        documentContext: buildLecturePromptContext(lecturePacket),
        studentContext: studentCtx,
        chatMode: 'general',
      })
      setChatMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
    } catch (err: any) {
      toast.error('SAGE chat error: ' + (err.message || 'Please try again'))
    } finally {
      setChatLoading(false)
    }
  }

  // ── Deep Notes ──────────────────────────────────────────────────────────

  const generateDeepNotes = async () => {
    if (!lectureContent.trim()) { toast.error('Select a lecture with notes or transcript first'); return }
    const cacheKey = sageCache.get('deepnotes', lectureContent)
    if (cacheKey) { setDeepNotes(cacheKey); return }

    setDeepNotesLoading(true)
    try {
      const data = await callSage({
        mode: 'deepnotes',
        content: lectureContent,
        subject: lecturePacket?.subject || lecturePacket?.course,
      })
      setDeepNotes(data)
      sageCache.set('deepnotes', lectureContent, data)
    } catch (err: any) {
      toast.error('Failed to generate deep notes: ' + err.message)
    } finally {
      setDeepNotesLoading(false)
    }
  }

  // ── Flashcards ──────────────────────────────────────────────────────────

  const generateFlashcards = async () => {
    if (!lectureContent.trim()) { toast.error('Select a lecture with notes first'); return }
    const cached = sageCache.get('flashcards', lectureContent)
    if (cached) { setFlashcards(cached); setCurrentCard(0); setCardFlipped(false); return }

    setFlashcardsLoading(true)
    try {
      const data = await callSage({
        mode: 'flashcards',
        lectureContent,
        subject: lecturePacket?.subject,
      })
      setFlashcards(data.flashcards || [])
      sageCache.set('flashcards', lectureContent, data.flashcards)
      setCurrentCard(0)
      setCardFlipped(false)
    } catch (err: any) {
      toast.error('Failed to generate flashcards: ' + err.message)
    } finally {
      setFlashcardsLoading(false)
    }
  }

  const markCard = (status: 'known' | 'learning') => {
    const card = flashcards[currentCard]
    if (!card) return
    setCardProgress(prev => ({ ...prev, [card.id]: status }))
    if (currentCard < flashcards.length - 1) {
      setCurrentCard(prev => prev + 1)
      setCardFlipped(false)
    } else {
      toast.success('🎉 Deck complete! Check your progress below.')
    }
  }

  // ── Mock Exam ───────────────────────────────────────────────────────────

  const generateMockExam = async () => {
    if (!lectureContent.trim()) { toast.error('Select a lecture first'); return }
    const cached = sageCache.get('mockexam', lectureContent)
    if (cached) {
      setMockExam(cached)
      setExamAnswers({})
      setExamSubmitted(false)
      setExamTimeLeft(parseInt(cached.timeAllowed) * 60 || 600)
      return
    }

    setMockExamLoading(true)
    try {
      const data = await callSage({
        mode: 'mockexam',
        lectureContent,
        subject: lecturePacket?.subject,
        numQuestions: 10,
      })
      setMockExam(data)
      sageCache.set('mockexam', lectureContent, data)
      setExamAnswers({})
      setExamSubmitted(false)
      setExamTimeLeft(parseInt(data.timeAllowed) * 60 || 600)
    } catch (err: any) {
      toast.error('Failed to generate mock exam: ' + err.message)
    } finally {
      setMockExamLoading(false)
    }
  }

  const submitExam = () => {
    setExamSubmitted(true)
    setExamTimeLeft(null)
    const total = mockExam?.questions.length || 0
    const correct = mockExam?.questions.filter((q, i) => examAnswers[q.id] === q.correct).length || 0
    const pct = total > 0 ? Math.round((correct / total) * 100) : 0
    toast.success(`Exam complete! Score: ${correct}/${total} (${pct}%)`)

    // Save to quiz results
    try {
      const results = JSON.parse(localStorage.getItem('quizResults') || '[]')
      results.push({ score: correct, total, subject: lecturePacket?.course || 'General', date: new Date().toISOString(), source: 'mock_exam' })
      localStorage.setItem('quizResults', JSON.stringify(results))
    } catch {}
  }

  // ── Knowledge Gap ────────────────────────────────────────────────────────

  const analyzeKnowledgeGap = async () => {
    if (!lecturePacket?.transcript && !lecturePacket?.notes) { toast.error('Select a lecture with transcript or notes'); return }
    const cacheContent = (lecturePacket.transcript || '') + (lecturePacket.notes || '')
    const cached = sageCache.get('knowledgegap', cacheContent)
    if (cached) { setKnowledgeGap(cached); return }

    setKnowledgeGapLoading(true)
    try {
      const data = await callSage({
        mode: 'knowledgegap',
        transcript: lecturePacket.transcript,
        notes: lecturePacket.notes,
        subject: lecturePacket.subject,
      })
      setKnowledgeGap(data)
      sageCache.set('knowledgegap', cacheContent, data)
    } catch (err: any) {
      toast.error('Knowledge gap analysis failed: ' + err.message)
    } finally {
      setKnowledgeGapLoading(false)
    }
  }

  // ── Voice ─────────────────────────────────────────────────────────────

  const getVoiceText = () => {
    if (!lecturePacket) return ''
    if (readingText === 'notes') return lecturePacket.notes || lecturePacket.transcript || ''
    return lecturePacket.summary || lecturePacket.notes || ''
  }

  const startReading = () => {
    if (!speechSupported) { toast.error('Text-to-speech not supported in your browser'); return }
    const text = getVoiceText()
    if (!text.trim()) { toast.error('No text available to read for this lecture'); return }

    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = readingSpeed
    utterance.pitch = 1
    utterance.lang = 'en-US'
    utterance.onend = () => { setIsReading(false); toast.info('✓ Reading complete') }
    utterance.onerror = () => setIsReading(false)
    utteranceRef.current = utterance
    window.speechSynthesis.speak(utterance)
    setIsReading(true)
  }

  const pauseReading = () => {
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.pause()
      setIsReading(false)
    }
  }

  const resumeReading = () => {
    window.speechSynthesis.resume()
    setIsReading(true)
  }

  const stopReading = () => {
    window.speechSynthesis.cancel()
    setIsReading(false)
  }

  // ── SnapSolve ─────────────────────────────────────────────────────────

  const handleSnapFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setSnapImage(ev.target?.result as string)
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const solveSnap = async () => {
    if (!snapImage && !snapText.trim()) { toast.error('Add an image or type a question'); return }
    setSnapLoading(true)
    setSnapResult(null)
    try {
      const data = await callSage({ mode: 'snapsolve', image: snapImage, text: snapText })
      setSnapResult(data.result)
    } catch (err: any) {
      toast.error('SnapSolve failed: ' + err.message)
    } finally {
      setSnapLoading(false)
    }
  }

  // ── Past Papers ───────────────────────────────────────────────────────

  const handlePastPaperFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setPastPaperImage(ev.target?.result as string)
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const analyzePastPaper = async () => {
    if (!pastPaperImage && !pastPaperText.trim()) { toast.error('Upload a past paper or paste text'); return }
    setPastPaperLoading(true)
    try {
      const data = await callSage({ mode: 'pastpapers', image: pastPaperImage, text: pastPaperText })
      setPastPaperResult(data.result)
    } catch (err: any) {
      toast.error('Past paper analysis failed: ' + err.message)
    } finally {
      setPastPaperLoading(false)
    }
  }

  // ── Dev Mode ─────────────────────────────────────────────────────────

  const sendDevMessage = async () => {
    if (!devInput.trim() || devLoading) return
    const userMsg: Message = { role: 'user', content: devInput.trim() }
    const newMessages = [...devMessages, userMsg]
    setDevMessages(newMessages)
    setDevInput('')
    setDevLoading(true)

    try {
      const data = await callSage({ mode: 'devmode', chatMessages: newMessages, adminUserId: userId })
      setDevMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
    } catch (err: any) {
      toast.error(err.message || 'Dev mode error')
    } finally {
      setDevLoading(false)
    }
  }

  // ── Score display ─────────────────────────────────────────────────────

  const scoreColor = (score: number) =>
    score >= 75 ? 'text-green-400' : score >= 50 ? 'text-yellow-400' : 'text-red-400'

  const scoreBg = (score: number) =>
    score >= 75 ? 'from-green-500' : score >= 50 ? 'from-yellow-500' : 'from-red-500'

  const visibleTabs = TABS.filter(t => !t.adminOnly || isAdmin)

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-surface-base">

      {/* Hidden file inputs */}
      <input ref={snapFileRef} type="file" accept="image/*" className="hidden" onChange={handleSnapFile} />
      <input ref={fileRef} type="file" accept="image/*,.pdf" className="hidden" onChange={handlePastPaperFile} />

      {/* Nav */}
      <nav className="border-b border-white/5 bg-surface-elevated/50 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-sm text-[#8B97B5] hover:text-white">
            <ArrowLeft size={16} /> Back
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-blue to-purple-500 flex items-center justify-center">
              <Brain size={16} className="text-white" />
            </div>
            <span className="font-sora font-bold text-white">SAGE AI Tutor</span>
          </div>
          <div className="w-20" />
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* Lecture Selector */}
        <div className="bg-surface-elevated border border-white/5 rounded-2xl overflow-hidden">
          <button
            onClick={() => setShowLectureSelector(!showLectureSelector)}
            className="w-full px-5 py-4 flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-brand-blue/15 flex items-center justify-center shrink-0">
                <BookOpen size={15} className="text-brand-blue" />
              </div>
              <div className="min-w-0 text-left">
                {lecturePacket ? (
                  <>
                    <p className="text-sm font-semibold text-white truncate">{lecturePacket.name}</p>
                    <p className="text-xs text-[#8B97B5]">
                      {lecturePacket.course && `${lecturePacket.course} · `}
                      {lecturePacket.transcript ? '✓ Transcript' : ''}
                      {lecturePacket.notes ? ' ✓ Notes' : ''}
                      {!lecturePacket.transcript && !lecturePacket.notes ? 'No AI content yet' : ''}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-[#8B97B5]">Select a lecture for SAGE to work with</p>
                )}
              </div>
            </div>
            {showLectureSelector ? <ChevronUp size={16} className="text-[#8B97B5] shrink-0" /> : <ChevronDown size={16} className="text-[#8B97B5] shrink-0" />}
          </button>

          <AnimatePresence>
            {showLectureSelector && (
              <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                className="overflow-hidden border-t border-white/5">
                <div className="px-4 py-3 max-h-56 overflow-y-auto space-y-1">
                  {recordings.length === 0 ? (
                    <div className="py-6 text-center text-[#8B97B5] text-sm">
                      No recordings yet.{' '}
                      <button onClick={() => navigate('/recording')} className="text-brand-blue underline">
                        Record a lecture
                      </button>
                    </div>
                  ) : (
                    recordings.map(rec => (
                      <button key={rec.id}
                        onClick={() => { setSelectedLectureId(rec.id); setShowLectureSelector(false) }}
                        className={`w-full text-left px-3 py-2.5 rounded-xl transition-colors flex items-center gap-3 ${
                          selectedLectureId === rec.id ? 'bg-brand-blue/15 border border-brand-blue/30' : 'hover:bg-surface-base'
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white truncate">{rec.name}</p>
                          <p className="text-xs text-[#8B97B5]">
                            {rec.course && `${rec.course} · `}
                            {rec.notes ? '✓ Notes' : '— No notes'}
                            {rec.transcript ? ' ✓ Transcript' : ''}
                          </p>
                        </div>
                        {selectedLectureId === rec.id && <CheckCircle size={14} className="text-brand-blue shrink-0" />}
                      </button>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Access status */}
        {accessLoaded && (
          <div className="flex items-center gap-2 text-xs flex-wrap">
            {isUnlimitedPlan(access) ? (
              <span className="text-green-400">✨ {access.currentPlan} plan · Unlimited AI</span>
            ) : access.planLocked ? (
              <button onClick={() => navigate('/pricing')} className="text-red-400 hover:text-red-300">
                🔒 Explorer locked — upgrade to continue →
              </button>
            ) : (
              <span className="text-brand-blue">
                🎓 {explorerLecturesRemaining(access)} free AI credits remaining
                {access.liteBonusCredits > 0 && ` · ${access.liteBonusCredits} bonus credits`}
              </span>
            )}
            <span className="text-[#4A5568]">· Powered by GPT-5 mini</span>
          </div>
        )}

        {/* Tab navigation */}
        <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
          {visibleTabs.map(tab => {
            const Icon = tab.icon
            const active = activeTab === tab.id
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all shrink-0 ${
                  active
                    ? tab.adminOnly
                      ? 'bg-gradient-to-r from-orange-500/20 to-yellow-500/20 border border-orange-500/40 text-orange-300'
                      : 'bg-brand-blue/20 border border-brand-blue/40 text-brand-blue'
                    : 'text-[#8B97B5] hover:text-white hover:bg-surface-elevated'
                }`}
              >
                <Icon size={13} /> {tab.label}
                {tab.adminOnly && <span className="text-[9px] bg-orange-500/20 text-orange-400 px-1 rounded">ADMIN</span>}
              </button>
            )
          })}
        </div>

        {/* Tab content */}
        <div className="bg-surface-elevated border border-white/5 rounded-2xl overflow-hidden min-h-96">

          {/* ── AI CHAT ─────────────────────────────────────────────────── */}
          {activeTab === 'chat' && (
            <div className="flex flex-col h-[560px]">
              {chatMessages.length === 0 && (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-blue to-purple-500 flex items-center justify-center mb-4">
                    <Brain size={28} className="text-white" />
                  </div>
                  <p className="text-white font-sora font-bold text-lg mb-2">SAGE is ready to help</p>
                  <p className="text-[#8B97B5] text-sm max-w-sm mb-6">
                    {lecturePacket
                      ? `Ask me anything about "${lecturePacket.name}" — I've read the notes and transcript.`
                      : 'Ask me any academic question. Select a lecture above for more personalized help.'}
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {(lecturePacket
                      ? ['Explain the key concepts', 'What might appear in exams?', 'Give me examples', 'Simplify the hardest part']
                      : ['Help me understand photosynthesis', 'Explain Newton\'s laws', 'What is GDP?']
                    ).map(s => (
                      <button key={s} onClick={() => setChatInput(s)}
                        className="text-xs text-brand-blue border border-brand-blue/30 bg-brand-blue/5 px-3 py-1.5 rounded-full hover:bg-brand-blue/10 transition">
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} gap-2`}>
                    {msg.role === 'assistant' && (
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-blue to-purple-500 flex items-center justify-center shrink-0 mt-0.5">
                        <Brain size={12} className="text-white" />
                      </div>
                    )}
                    <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed break-words ${
                      msg.role === 'user'
                        ? 'bg-brand-blue text-white rounded-br-sm'
                        : 'bg-surface-base text-[#C5CCDE] rounded-bl-sm'
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-blue to-purple-500 flex items-center justify-center shrink-0">
                      <Brain size={12} className="text-white" />
                    </div>
                    <div className="bg-surface-base rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1.5">
                      {[0, 150, 300].map(d => (
                        <span key={d} className="w-1.5 h-1.5 bg-brand-blue rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                      ))}
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              <div className="border-t border-white/5 p-3 flex gap-2">
                <input value={chatInput} onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat() } }}
                  placeholder="Ask SAGE anything..."
                  disabled={chatLoading}
                  className="flex-1 bg-surface-base border border-white/10 rounded-xl px-3 py-2.5 text-white placeholder-[#4A5568] text-sm outline-none focus:border-brand-blue/40 disabled:opacity-50 min-w-0" />
                <button onClick={sendChat} disabled={chatLoading || !chatInput.trim()}
                  className="bg-brand-blue text-white p-2.5 rounded-xl hover:bg-brand-blue/90 disabled:opacity-50 transition shrink-0">
                  {chatLoading ? <Loader size={16} className="animate-spin" /> : <Send size={16} />}
                </button>
              </div>
            </div>
          )}

          {/* ── DEEP NOTES ───────────────────────────────────────────────── */}
          {activeTab === 'deepnotes' && (
            <div className="p-5 space-y-5">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h2 className="font-sora font-bold text-white text-lg">Deep Notes</h2>
                  <p className="text-[#8B97B5] text-xs mt-0.5">Enhanced explanations, examples, mnemonics, and exam tips</p>
                </div>
                <button onClick={generateDeepNotes} disabled={deepNotesLoading || !lectureContent.trim()}
                  className="flex items-center gap-2 bg-brand-blue text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-brand-blue/90 disabled:opacity-50 transition">
                  {deepNotesLoading ? <Loader size={15} className="animate-spin" /> : <Zap size={15} />}
                  {deepNotes ? 'Regenerate' : 'Generate Deep Notes'}
                </button>
              </div>

              {deepNotesLoading && (
                <div className="py-16 flex flex-col items-center gap-3 text-[#8B97B5]">
                  <Loader size={28} className="animate-spin text-brand-blue" />
                  <p className="text-sm">SAGE is enhancing your notes...</p>
                </div>
              )}

              {deepNotes && !deepNotesLoading && (
                <div className="space-y-4">
                  <div className="bg-surface-base rounded-xl p-4 border border-white/5">
                    <p className="font-sora font-bold text-white text-base mb-1">{deepNotes.title}</p>
                    <p className="text-[#8B97B5] text-sm">{deepNotes.overview}</p>
                  </div>

                  {deepNotes.sections?.map((section, i) => (
                    <div key={i} className="bg-surface-base rounded-xl border border-white/5 overflow-hidden">
                      <button
                        onClick={() => setExpandedSection(expandedSection === i ? null : i)}
                        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-white/3 transition"
                      >
                        <span className="font-semibold text-white text-sm">{section.heading}</span>
                        {expandedSection === i ? <ChevronUp size={15} className="text-[#8B97B5]" /> : <ChevronDown size={15} className="text-[#8B97B5]" />}
                      </button>
                      <AnimatePresence>
                        {expandedSection === i && (
                          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                            className="overflow-hidden border-t border-white/5">
                            <div className="p-4 space-y-3">
                              <div>
                                <p className="text-[10px] text-[#8B97B5] uppercase font-semibold mb-1">Explanation</p>
                                <p className="text-sm text-[#C5CCDE]">{section.explanation}</p>
                              </div>
                              {section.simpleExplanation && (
                                <div className="bg-blue-500/10 border-l-4 border-blue-400 rounded-r-lg p-3">
                                  <p className="text-[10px] text-blue-400 font-semibold mb-1">SIMPLE VERSION</p>
                                  <p className="text-xs text-[#C5CCDE]">{section.simpleExplanation}</p>
                                </div>
                              )}
                              {section.examples?.length > 0 && (
                                <div className="bg-green-500/10 border-l-4 border-green-400 rounded-r-lg p-3">
                                  <p className="text-[10px] text-green-400 font-semibold mb-1">EXAMPLES</p>
                                  {section.examples.map((ex, j) => <p key={j} className="text-xs text-[#C5CCDE]">• {ex}</p>)}
                                </div>
                              )}
                              {section.memoryTrick && (
                                <div className="bg-purple-500/10 border-l-4 border-purple-400 rounded-r-lg p-3">
                                  <p className="text-[10px] text-purple-400 font-semibold mb-1">🧠 MEMORY TRICK</p>
                                  <p className="text-xs text-[#C5CCDE]">{section.memoryTrick}</p>
                                </div>
                              )}
                              {section.examTips?.length > 0 && (
                                <div className="bg-yellow-500/10 border-l-4 border-yellow-400 rounded-r-lg p-3">
                                  <p className="text-[10px] text-yellow-400 font-semibold mb-1">⭐ EXAM TIPS</p>
                                  {section.examTips.map((tip, j) => <p key={j} className="text-xs text-yellow-100">• {tip}</p>)}
                                </div>
                              )}
                              {section.commonMistakes?.length > 0 && (
                                <div className="bg-red-500/10 border-l-4 border-red-400 rounded-r-lg p-3">
                                  <p className="text-[10px] text-red-400 font-semibold mb-1">⚠️ COMMON MISTAKES</p>
                                  {section.commonMistakes.map((m, j) => <p key={j} className="text-xs text-[#C5CCDE]">• {m}</p>)}
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}

                  {deepNotes.quickRevision?.length > 0 && (
                    <div className="bg-gradient-to-r from-brand-blue/10 to-purple-500/10 border border-brand-blue/20 rounded-xl p-4">
                      <p className="font-sora font-bold text-white text-sm mb-3">🖍️ Quick Revision</p>
                      <div className="space-y-1">
                        {deepNotes.quickRevision.map((p, i) => (
                          <p key={i} className="text-xs text-[#C5CCDE] flex gap-2">
                            <span className="text-brand-blue shrink-0">{i + 1}.</span> {p}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}

                  {deepNotes.predictedExamQuestions?.length > 0 && (
                    <div className="bg-surface-base border border-white/5 rounded-xl p-4">
                      <p className="font-sora font-bold text-white text-sm mb-3">🎯 Predicted Exam Questions</p>
                      {deepNotes.predictedExamQuestions.map((q, i) => (
                        <p key={i} className="text-xs text-[#8B97B5] flex gap-2 mb-1">
                          <span className="text-warning shrink-0">Q{i + 1}.</span> {q}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {!deepNotes && !deepNotesLoading && (
                <div className="py-16 text-center text-[#8B97B5]">
                  <BookOpen size={32} className="mx-auto mb-3 opacity-40" />
                  <p className="text-sm">Select a lecture and click Generate to create enhanced deep notes</p>
                </div>
              )}
            </div>
          )}

          {/* ── FLASHCARDS ───────────────────────────────────────────────── */}
          {activeTab === 'flashcards' && (
            <div className="p-5 space-y-5">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h2 className="font-sora font-bold text-white text-lg">Flashcards</h2>
                  <p className="text-[#8B97B5] text-xs">AI-generated from your lecture content</p>
                </div>
                <button onClick={generateFlashcards} disabled={flashcardsLoading || !lectureContent.trim()}
                  className="flex items-center gap-2 bg-brand-blue text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-brand-blue/90 disabled:opacity-50 transition">
                  {flashcardsLoading ? <Loader size={15} className="animate-spin" /> : <RefreshCw size={15} />}
                  {flashcards.length > 0 ? 'New Deck' : 'Generate Deck'}
                </button>
              </div>

              {flashcardsLoading && (
                <div className="py-16 flex flex-col items-center gap-3 text-[#8B97B5]">
                  <Loader size={28} className="animate-spin text-brand-blue" />
                  <p className="text-sm">SAGE is creating your flashcard deck...</p>
                </div>
              )}

              {flashcards.length > 0 && !flashcardsLoading && (
                <>
                  <div className="flex items-center justify-between text-xs text-[#8B97B5]">
                    <span>Card {currentCard + 1} of {flashcards.length}</span>
                    <div className="flex gap-2">
                      <span className="text-green-400">{Object.values(cardProgress).filter(v => v === 'known').length} known</span>
                      <span className="text-yellow-400">{Object.values(cardProgress).filter(v => v === 'learning').length} learning</span>
                    </div>
                  </div>

                  <div className="flex justify-center">
                    <div
                      onClick={() => setCardFlipped(!cardFlipped)}
                      className="w-full max-w-md h-56 cursor-pointer"
                      style={{ perspective: '1000px' }}
                    >
                      <motion.div
                        animate={{ rotateY: cardFlipped ? 180 : 0 }}
                        transition={{ duration: 0.4 }}
                        style={{ transformStyle: 'preserve-3d', position: 'relative', height: '100%' }}
                      >
                        {/* Front */}
                        <div style={{ backfaceVisibility: 'hidden' }}
                          className="absolute inset-0 bg-gradient-to-br from-brand-blue/20 to-purple-500/20 border-2 border-brand-blue/30 rounded-2xl p-6 flex flex-col items-center justify-center text-center">
                          <p className="text-[10px] text-brand-blue font-semibold uppercase tracking-wide mb-3">Question</p>
                          <p className="text-white font-semibold text-base leading-relaxed">{flashcards[currentCard]?.front}</p>
                          <p className="text-[#8B97B5] text-xs mt-4">Tap to reveal answer</p>
                        </div>
                        {/* Back */}
                        <div style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                          className="absolute inset-0 bg-gradient-to-br from-green-500/15 to-mint/15 border-2 border-mint/30 rounded-2xl p-6 flex flex-col items-center justify-center text-center">
                          <p className="text-[10px] text-mint font-semibold uppercase tracking-wide mb-3">Answer</p>
                          <p className="text-white text-sm leading-relaxed">{flashcards[currentCard]?.back}</p>
                        </div>
                      </motion.div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <button onClick={() => { if (currentCard > 0) { setCurrentCard(prev => prev - 1); setCardFlipped(false) } }}
                      disabled={currentCard === 0}
                      className="p-2.5 rounded-xl bg-surface-base border border-white/10 text-[#8B97B5] hover:text-white disabled:opacity-30 transition">
                      <ChevronLeft size={18} />
                    </button>

                    {cardFlipped ? (
                      <div className="flex gap-2 flex-1 justify-center">
                        <button onClick={() => markCard('learning')}
                          className="flex-1 max-w-[120px] bg-yellow-500/20 border border-yellow-500/40 text-yellow-300 py-2 rounded-xl text-xs font-semibold hover:bg-yellow-500/30 transition">
                          Still Learning
                        </button>
                        <button onClick={() => markCard('known')}
                          className="flex-1 max-w-[120px] bg-green-500/20 border border-green-500/40 text-green-300 py-2 rounded-xl text-xs font-semibold hover:bg-green-500/30 transition">
                          Got It! ✓
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => setCardFlipped(true)}
                        className="flex-1 max-w-[200px] bg-brand-blue text-white py-2 rounded-xl text-sm font-semibold hover:bg-brand-blue/90 transition">
                        Show Answer
                      </button>
                    )}

                    <button onClick={() => { if (currentCard < flashcards.length - 1) { setCurrentCard(prev => prev + 1); setCardFlipped(false) } }}
                      disabled={currentCard === flashcards.length - 1}
                      className="p-2.5 rounded-xl bg-surface-base border border-white/10 text-[#8B97B5] hover:text-white disabled:opacity-30 transition">
                      <ChevronRight size={18} />
                    </button>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-surface-base rounded-full h-1.5">
                    <div className="bg-brand-blue h-1.5 rounded-full transition-all"
                      style={{ width: `${((currentCard + 1) / flashcards.length) * 100}%` }} />
                  </div>
                </>
              )}

              {flashcards.length === 0 && !flashcardsLoading && (
                <div className="py-16 text-center text-[#8B97B5]">
                  <FlashcardIcon size={32} className="mx-auto mb-3 opacity-40" />
                  <p className="text-sm">Generate flashcards from your lecture notes</p>
                </div>
              )}
            </div>
          )}

          {/* ── MOCK EXAM ────────────────────────────────────────────────── */}
          {activeTab === 'quiz' && (
            <div className="p-5 space-y-5">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h2 className="font-sora font-bold text-white text-lg">Mock Exam</h2>
                  <p className="text-[#8B97B5] text-xs">University-style exam from your lecture</p>
                </div>
                {!mockExam ? (
                  <button onClick={generateMockExam} disabled={mockExamLoading || !lectureContent.trim()}
                    className="flex items-center gap-2 bg-brand-blue text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-brand-blue/90 disabled:opacity-50 transition">
                    {mockExamLoading ? <Loader size={15} className="animate-spin" /> : <ClipboardList size={15} />}
                    Generate Exam
                  </button>
                ) : !examSubmitted ? (
                  <div className="flex items-center gap-3">
                    {examTimeLeft !== null && (
                      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ${
                        examTimeLeft < 60 ? 'bg-red-500/20 text-red-400' : 'bg-surface-base text-[#8B97B5]'
                      }`}>
                        <Clock size={13} />
                        {Math.floor(examTimeLeft / 60)}:{String(examTimeLeft % 60).padStart(2, '0')}
                      </div>
                    )}
                    <button onClick={submitExam}
                      className="bg-brand-blue text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-brand-blue/90 transition">
                      Submit
                    </button>
                  </div>
                ) : (
                  <button onClick={() => { setMockExam(null); setExamAnswers({}); setExamSubmitted(false) }}
                    className="flex items-center gap-2 bg-surface-base border border-white/10 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-surface-elevated transition">
                    <RefreshCw size={14} /> New Exam
                  </button>
                )}
              </div>

              {mockExamLoading && (
                <div className="py-16 flex flex-col items-center gap-3 text-[#8B97B5]">
                  <Loader size={28} className="animate-spin text-brand-blue" />
                  <p className="text-sm">SAGE is generating your mock exam...</p>
                </div>
              )}

              {mockExam && !mockExamLoading && (
                <>
                  <div className="bg-surface-base border border-white/5 rounded-xl p-4">
                    <p className="font-sora font-bold text-white">{mockExam.examTitle}</p>
                    <p className="text-[#8B97B5] text-xs mt-1">Time: {mockExam.timeAllowed} minutes · Total: {mockExam.totalMarks} marks</p>
                  </div>

                  {examSubmitted && (
                    <div className="bg-gradient-to-r from-brand-blue/10 to-purple-500/10 border border-brand-blue/20 rounded-xl p-5 text-center">
                      <p className="font-sora font-bold text-2xl text-white mb-1">
                        {mockExam.questions.filter(q => examAnswers[q.id] === q.correct).length}/{mockExam.questions.length}
                      </p>
                      <p className="text-[#8B97B5] text-sm">
                        {Math.round((mockExam.questions.filter(q => examAnswers[q.id] === q.correct).length / mockExam.questions.length) * 100)}% — {
                          mockExam.questions.filter(q => examAnswers[q.id] === q.correct).length / mockExam.questions.length >= 0.7 ? 'Great work! 🎉' : 'Keep studying 📚'
                        }
                      </p>
                    </div>
                  )}

                  <div className="space-y-4">
                    {mockExam.questions.map((q, i) => {
                      const answered = examAnswers[q.id] !== undefined
                      const isCorrect = examAnswers[q.id] === q.correct
                      return (
                        <div key={q.id} className={`bg-surface-base rounded-xl border p-4 ${
                          examSubmitted
                            ? isCorrect ? 'border-green-500/40' : answered ? 'border-red-500/40' : 'border-white/5'
                            : 'border-white/5'
                        }`}>
                          <div className="flex items-start justify-between gap-2 mb-3">
                            <p className="text-sm text-white font-medium">Q{i + 1}. {q.question}</p>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 ${DIFF_COLORS[q.difficulty as keyof typeof DIFF_COLORS] || DIFF_COLORS.medium}`}>
                              {q.difficulty}
                            </span>
                          </div>
                          <div className="grid sm:grid-cols-2 gap-2">
                            {q.options.map((opt, j) => {
                              let cls = 'border-white/10 text-[#C5CCDE] hover:border-brand-blue/40'
                              if (examSubmitted) {
                                if (j === q.correct) cls = 'border-green-500/60 bg-green-500/10 text-green-300'
                                else if (examAnswers[q.id] === j) cls = 'border-red-500/60 bg-red-500/10 text-red-300'
                              } else if (examAnswers[q.id] === j) {
                                cls = 'border-brand-blue bg-brand-blue/10 text-brand-blue'
                              }
                              return (
                                <button key={j}
                                  onClick={() => !examSubmitted && setExamAnswers(prev => ({ ...prev, [q.id]: j }))}
                                  disabled={examSubmitted}
                                  className={`text-left px-3 py-2 rounded-lg border text-xs transition-all ${cls}`}
                                >
                                  {opt}
                                </button>
                              )
                            })}
                          </div>
                          {examSubmitted && q.explanation && (
                            <div className="mt-3 bg-surface-elevated rounded-lg p-3">
                              <p className="text-[10px] text-[#8B97B5] font-semibold mb-1">Explanation</p>
                              <p className="text-xs text-[#C5CCDE]">{q.explanation}</p>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </>
              )}

              {!mockExam && !mockExamLoading && (
                <div className="py-16 text-center text-[#8B97B5]">
                  <ClipboardList size={32} className="mx-auto mb-3 opacity-40" />
                  <p className="text-sm">Generate a university-style mock exam from your lecture</p>
                </div>
              )}
            </div>
          )}

          {/* ── PAST PAPERS ──────────────────────────────────────────────── */}
          {activeTab === 'pastpapers' && (
            <div className="p-5 space-y-5">
              <div>
                <h2 className="font-sora font-bold text-white text-lg">Past Papers</h2>
                <p className="text-[#8B97B5] text-xs">Upload a past paper — SAGE will extract questions and provide model answers</p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-white font-medium mb-2">Upload Image / Photo</p>
                  {pastPaperImage ? (
                    <div className="relative rounded-xl overflow-hidden">
                      <img src={pastPaperImage} alt="Past paper" className="w-full rounded-xl object-cover max-h-40" />
                      <button onClick={() => setPastPaperImage(null)}
                        className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1 hover:bg-black">
                        <XCircle size={16} />
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => fileRef.current?.click()}
                      className="w-full h-32 border-2 border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center gap-2 text-[#8B97B5] hover:border-brand-blue/40 hover:text-white transition">
                      <Camera size={22} />
                      <span className="text-xs">Upload photo or PDF</span>
                    </button>
                  )}
                </div>
                <div>
                  <p className="text-xs text-white font-medium mb-2">Or Paste Text</p>
                  <textarea value={pastPaperText} onChange={e => setPastPaperText(e.target.value)}
                    placeholder="Paste the past paper questions here..."
                    className="w-full h-32 bg-surface-base border border-white/10 rounded-xl p-3 text-white placeholder-[#4A5568] text-xs outline-none focus:border-brand-blue/40 resize-none" />
                </div>
              </div>

              <button onClick={analyzePastPaper}
                disabled={pastPaperLoading || (!pastPaperImage && !pastPaperText.trim())}
                className="w-full bg-brand-blue text-white py-3 rounded-xl font-semibold text-sm hover:bg-brand-blue/90 disabled:opacity-50 transition flex items-center justify-center gap-2">
                {pastPaperLoading ? <><Loader size={16} className="animate-spin" /> Analyzing...</> : '🎯 Analyze Past Paper'}
              </button>

              {pastPaperResult && !pastPaperLoading && (
                <div className="space-y-4">
                  <p className="font-sora font-bold text-white">{pastPaperResult.paper_title}</p>

                  {pastPaperResult.questions?.map((q: any, i: number) => (
                    <div key={i} className="bg-surface-base border border-white/5 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs bg-brand-blue/20 text-brand-blue px-2 py-0.5 rounded-full">Q{q.number}</span>
                        {q.marks && <span className="text-xs text-[#8B97B5]">{q.marks} marks</span>}
                      </div>
                      <p className="text-sm text-white font-medium mb-2">{q.question}</p>
                      <div className="bg-surface-elevated rounded-lg p-3">
                        <p className="text-[10px] text-mint font-semibold mb-1">MODEL ANSWER</p>
                        <p className="text-xs text-[#C5CCDE]">{q.model_answer}</p>
                      </div>
                      {q.key_points?.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {q.key_points.map((p: string, j: number) => (
                            <span key={j} className="text-[10px] bg-white/5 text-[#8B97B5] px-2 py-0.5 rounded-full">{p}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}

                  {pastPaperResult.exam_tips?.length > 0 && (
                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
                      <p className="text-yellow-400 font-semibold text-xs mb-2">⭐ Exam Tips</p>
                      {pastPaperResult.exam_tips.map((t: string, i: number) => (
                        <p key={i} className="text-xs text-yellow-100">• {t}</p>
                      ))}
                    </div>
                  )}

                  {pastPaperResult.predicted_topics?.length > 0 && (
                    <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4">
                      <p className="text-purple-400 font-semibold text-xs mb-2">🔮 Predicted Topics</p>
                      <div className="flex flex-wrap gap-1.5">
                        {pastPaperResult.predicted_topics.map((t: string, i: number) => (
                          <span key={i} className="text-[10px] bg-purple-500/20 text-purple-300 px-2.5 py-1 rounded-full">{t}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── KNOWLEDGE GAP ────────────────────────────────────────────── */}
          {activeTab === 'knowledgegap' && (
            <div className="p-5 space-y-5">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h2 className="font-sora font-bold text-white text-lg">Knowledge Gap Analysis</h2>
                  <p className="text-[#8B97B5] text-xs">Detects what you missed and how exam-ready you are</p>
                </div>
                <button onClick={analyzeKnowledgeGap}
                  disabled={knowledgeGapLoading || (!lecturePacket?.transcript && !lecturePacket?.notes)}
                  className="flex items-center gap-2 bg-brand-blue text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-brand-blue/90 disabled:opacity-50 transition">
                  {knowledgeGapLoading ? <Loader size={15} className="animate-spin" /> : <Search size={15} />}
                  Analyze
                </button>
              </div>

              {knowledgeGapLoading && (
                <div className="py-16 flex flex-col items-center gap-3 text-[#8B97B5]">
                  <Loader size={28} className="animate-spin text-brand-blue" />
                  <p className="text-sm">SAGE is analyzing your knowledge gaps...</p>
                </div>
              )}

              {knowledgeGap && !knowledgeGapLoading && (
                <div className="space-y-5">
                  {/* Score cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: 'Knowledge Coverage', value: knowledgeGap.knowledgeCoverage, icon: Target },
                      { label: 'Exam Readiness', value: knowledgeGap.examReadiness, icon: Star },
                      { label: 'Understanding', value: knowledgeGap.understandingScore, icon: Brain },
                      { label: 'Confidence', value: knowledgeGap.confidenceScore, icon: TrendingUp },
                    ].map((s, i) => (
                      <div key={i} className={`bg-gradient-to-br ${scoreBg(s.value)} to-transparent rounded-xl p-4 border border-white/10 text-center`}>
                        <s.icon size={16} className="mx-auto text-white/60 mb-2" />
                        <p className={`font-sora font-bold text-2xl ${scoreColor(s.value)}`}>{s.value}%</p>
                        <p className="text-[10px] text-white/60 mt-0.5">{s.label}</p>
                      </div>
                    ))}
                  </div>

                  <div className="bg-surface-base rounded-xl border border-white/5 p-4">
                    <p className="text-sm text-[#C5CCDE]">{knowledgeGap.summary}</p>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    {knowledgeGap.strongAreas?.length > 0 && (
                      <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
                        <p className="text-green-400 font-semibold text-xs mb-2">✓ Strong Areas</p>
                        {knowledgeGap.strongAreas.map((a, i) => <p key={i} className="text-xs text-[#C5CCDE]">• {a}</p>)}
                      </div>
                    )}
                    {knowledgeGap.weakAreas?.length > 0 && (
                      <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                        <p className="text-red-400 font-semibold text-xs mb-2">⚠️ Weak Areas</p>
                        {knowledgeGap.weakAreas.map((a, i) => <p key={i} className="text-xs text-[#C5CCDE]">• {a}</p>)}
                      </div>
                    )}
                  </div>

                  {knowledgeGap.missingConcepts?.length > 0 && (
                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
                      <p className="text-yellow-400 font-semibold text-xs mb-2">🔍 Missing Concepts</p>
                      <div className="flex flex-wrap gap-1.5">
                        {knowledgeGap.missingConcepts.map((c, i) => (
                          <span key={i} className="text-[10px] bg-yellow-500/20 text-yellow-300 px-2.5 py-1 rounded-full">{c}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="bg-gradient-to-r from-brand-blue/10 to-purple-500/10 border border-brand-blue/20 rounded-xl p-4">
                    <p className="text-white font-semibold text-sm mb-2">📚 Study Next: {knowledgeGap.studyNext}</p>
                    {knowledgeGap.recommendations?.map((r, i) => (
                      <p key={i} className="text-xs text-[#C5CCDE] mb-1">→ {r}</p>
                    ))}
                  </div>

                  {knowledgeGap.examTips?.length > 0 && (
                    <div className="bg-surface-base border border-white/5 rounded-xl p-4">
                      <p className="text-warning font-semibold text-xs mb-2">⭐ Exam Tips</p>
                      {knowledgeGap.examTips.map((t, i) => <p key={i} className="text-xs text-[#C5CCDE] mb-1">• {t}</p>)}
                    </div>
                  )}
                </div>
              )}

              {!knowledgeGap && !knowledgeGapLoading && (
                <div className="py-16 text-center text-[#8B97B5]">
                  <Search size={32} className="mx-auto mb-3 opacity-40" />
                  <p className="text-sm">Analyze what you know vs what you missed in this lecture</p>
                </div>
              )}
            </div>
          )}

          {/* ── VOICE ────────────────────────────────────────────────────── */}
          {activeTab === 'voice' && (
            <div className="p-5 space-y-5">
              <div>
                <h2 className="font-sora font-bold text-white text-lg">Voice Learning</h2>
                <p className="text-[#8B97B5] text-xs">Let SAGE read your notes aloud while you listen</p>
              </div>

              {!speechSupported && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                  <p className="text-red-400 text-sm">⚠️ Text-to-speech is not supported in your current browser. Try Chrome or Edge.</p>
                </div>
              )}

              {speechSupported && (
                <>
                  <div className="flex bg-surface-base rounded-xl p-1 gap-1">
                    <button onClick={() => { stopReading(); setReadingText('notes') }}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${readingText === 'notes' ? 'bg-brand-blue text-white' : 'text-[#8B97B5] hover:text-white'}`}>
                      📝 Notes
                    </button>
                    <button onClick={() => { stopReading(); setReadingText('summary') }}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${readingText === 'summary' ? 'bg-brand-blue text-white' : 'text-[#8B97B5] hover:text-white'}`}>
                      ✨ Summary
                    </button>
                  </div>

                  {/* Text preview */}
                  <div className="bg-surface-base border border-white/5 rounded-xl p-4 max-h-40 overflow-y-auto">
                    {getVoiceText() ? (
                      <p className="text-xs text-[#C5CCDE] leading-relaxed">{getVoiceText().slice(0, 600)}{getVoiceText().length > 600 ? '...' : ''}</p>
                    ) : (
                      <p className="text-xs text-[#4A5568]">No {readingText} available for this lecture. Record a lecture and generate notes first.</p>
                    )}
                  </div>

                  {/* Speed control */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-white font-medium">Reading Speed</p>
                      <p className="text-xs text-brand-blue font-bold">{readingSpeed}×</p>
                    </div>
                    <input type="range" min="0.5" max="2" step="0.25" value={readingSpeed}
                      onChange={e => { setReadingSpeed(parseFloat(e.target.value)); if (isReading) { stopReading() } }}
                      className="w-full accent-brand-blue" />
                    <div className="flex justify-between text-[10px] text-[#4A5568]">
                      <span>Slow 0.5×</span><span>Normal 1×</span><span>Fast 2×</span>
                    </div>
                  </div>

                  {/* Controls */}
                  <div className="flex items-center justify-center gap-3">
                    <button onClick={stopReading}
                      className="p-3 rounded-xl bg-surface-base border border-white/10 text-[#8B97B5] hover:text-white transition">
                      <RotateCcw size={20} />
                    </button>

                    {!isReading ? (
                      <button onClick={window.speechSynthesis.paused ? resumeReading : startReading}
                        disabled={!getVoiceText()}
                        className="flex items-center gap-2 bg-brand-blue text-white px-8 py-3.5 rounded-xl font-semibold text-sm hover:bg-brand-blue/90 disabled:opacity-50 transition">
                        <Play size={18} />
                        {window.speechSynthesis.paused ? 'Resume' : 'Start Reading'}
                      </button>
                    ) : (
                      <button onClick={pauseReading}
                        className="flex items-center gap-2 bg-warning text-white px-8 py-3.5 rounded-xl font-semibold text-sm hover:bg-warning/90 transition">
                        <Pause size={18} />
                        Pause
                      </button>
                    )}

                    <button onClick={() => { stopReading(); setTimeout(startReading, 100) }}
                      disabled={!getVoiceText()}
                      className="p-3 rounded-xl bg-surface-base border border-white/10 text-[#8B97B5] hover:text-white transition disabled:opacity-30">
                      <RotateCw size={20} />
                    </button>
                  </div>

                  {isReading && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="flex items-center justify-center gap-2 text-brand-blue text-sm">
                      <div className="flex gap-1">
                        {[0, 1, 2].map(i => (
                          <motion.div key={i} animate={{ scaleY: [1, 2, 1] }} transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.2 }}
                            className="w-1 h-4 bg-brand-blue rounded-full" />
                        ))}
                      </div>
                      Reading {readingText}...
                    </motion.div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── SNAPSOLVE ────────────────────────────────────────────────── */}
          {activeTab === 'snapsolve' && (
            <div className="p-5 space-y-5">
              <div>
                <h2 className="font-sora font-bold text-white text-lg">SnapSolve</h2>
                <p className="text-[#8B97B5] text-xs">Snap any question or whiteboard — SAGE answers instantly</p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  {snapImage ? (
                    <div className="relative rounded-xl overflow-hidden">
                      <img src={snapImage} alt="Question" className="w-full rounded-xl object-cover max-h-40" />
                      <button onClick={() => setSnapImage(null)}
                        className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1">
                        <XCircle size={16} />
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => snapFileRef.current?.click()}
                      className="w-full h-32 border-2 border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center gap-2 text-[#8B97B5] hover:border-brand-blue/40 hover:text-white transition">
                      <Camera size={22} />
                      <span className="text-xs">Snap or upload image</span>
                    </button>
                  )}
                </div>
                <div>
                  <p className="text-xs text-white font-medium mb-2">Or type a question</p>
                  <textarea value={snapText} onChange={e => setSnapText(e.target.value)}
                    placeholder="Type your question here..."
                    className="w-full h-32 bg-surface-base border border-white/10 rounded-xl p-3 text-white placeholder-[#4A5568] text-sm outline-none focus:border-brand-blue/40 resize-none" />
                </div>
              </div>

              <button onClick={solveSnap}
                disabled={snapLoading || (!snapImage && !snapText.trim())}
                className="w-full bg-brand-blue text-white py-3 rounded-xl font-semibold text-sm hover:bg-brand-blue/90 disabled:opacity-50 transition flex items-center justify-center gap-2">
                {snapLoading ? <><Loader size={16} className="animate-spin" /> Solving...</> : '⚡ Solve Now'}
              </button>

              {snapResult && !snapLoading && (
                <div className="space-y-4">
                  <div className="bg-surface-base border border-white/5 rounded-xl p-4">
                    <p className="text-[10px] text-[#8B97B5] font-semibold mb-1">QUESTION</p>
                    <p className="text-sm text-white">{snapResult.question}</p>
                  </div>
                  <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
                    <p className="text-[10px] text-green-400 font-semibold mb-1">ANSWER</p>
                    <p className="text-sm text-[#C5CCDE] whitespace-pre-wrap">{snapResult.answer}</p>
                  </div>
                  {snapResult.explanation && (
                    <div className="bg-brand-blue/10 border border-brand-blue/20 rounded-xl p-4">
                      <p className="text-[10px] text-brand-blue font-semibold mb-1">KEY CONCEPTS</p>
                      <p className="text-sm text-[#C5CCDE]">{snapResult.explanation}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── DEV MODE (admin only) ────────────────────────────────────── */}
          {activeTab === 'devmode' && isAdmin && (
            <div className="flex flex-col h-[560px] bg-surface-base/50">
              <div className="px-4 py-3 border-b border-white/5 bg-orange-500/5">
                <div className="flex items-center gap-2">
                  <Code2 size={14} className="text-orange-400" />
                  <span className="text-xs font-bold text-orange-400">SAGE DEVELOPER MODE — ADMIN ONLY</span>
                </div>
                <p className="text-[10px] text-[#8B97B5] mt-0.5">Code generation, SQL, Supabase, React/TypeScript, Vercel, M-Pesa, PWA help</p>
              </div>

              {devMessages.length === 0 && (
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                  <Code2 size={28} className="text-orange-400 mb-3" />
                  <p className="text-white font-semibold mb-2">Developer Assistant</p>
                  <p className="text-[#8B97B5] text-xs mb-4 max-w-sm">Ask me anything about building STUDIA — code, SQL, Supabase RLS, Vercel functions, TypeScript, M-Pesa integration.</p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {['Write SQL for a new table', 'Fix this TypeScript error', 'Write a Supabase RLS policy', 'Help with Vercel function', 'Debug M-Pesa callback'].map(s => (
                      <button key={s} onClick={() => setDevInput(s)}
                        className="text-xs text-orange-400 border border-orange-500/30 bg-orange-500/5 px-3 py-1.5 rounded-full hover:bg-orange-500/10 transition">
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {devMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} gap-2`}>
                    {msg.role === 'assistant' && (
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-500 to-yellow-500 flex items-center justify-center shrink-0 mt-0.5">
                        <Code2 size={12} className="text-white" />
                      </div>
                    )}
                    <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed break-words font-mono whitespace-pre-wrap ${
                      msg.role === 'user'
                        ? 'bg-orange-500/20 text-orange-100 rounded-br-sm'
                        : 'bg-surface-elevated text-[#C5CCDE] rounded-bl-sm border border-white/5'
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                ))}
                {devLoading && (
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-500 to-yellow-500 flex items-center justify-center shrink-0">
                      <Code2 size={12} className="text-white" />
                    </div>
                    <div className="bg-surface-elevated rounded-2xl px-4 py-3 flex gap-1.5 border border-white/5">
                      {[0, 150, 300].map(d => (
                        <span key={d} className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t border-white/5 p-3 flex gap-2">
                <input value={devInput} onChange={e => setDevInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendDevMessage() } }}
                  placeholder="Ask the dev assistant..."
                  disabled={devLoading}
                  className="flex-1 bg-surface-base border border-orange-500/20 rounded-xl px-3 py-2.5 text-white placeholder-[#4A5568] text-xs font-mono outline-none focus:border-orange-500/40 disabled:opacity-50 min-w-0" />
                <button onClick={sendDevMessage} disabled={devLoading || !devInput.trim()}
                  className="bg-orange-500 text-white p-2.5 rounded-xl hover:bg-orange-500/90 disabled:opacity-50 transition shrink-0">
                  {devLoading ? <Loader size={16} className="animate-spin" /> : <Send size={16} />}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
