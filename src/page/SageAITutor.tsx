import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Brain, ArrowLeft, BookOpen, ChevronDown, ChevronUp, Camera, Send, Loader, CheckCircle, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { loadAccess, checkAccess, consumeCredit, isUnlimitedPlan, explorerLecturesRemaining, type AccessInfo, emptyAccess } from '../lib/access'
import { getAllRecordings, getLecturePacket, buildLecturePromptContext, type LecturePacket, type Recording } from '../lib/lectureContext'
import { buildStudentContext, formatContextForAI } from '../lib/studentContext'
import { detectIntent, getSubjectStructure } from '../lib/sageIntent'
import { toast } from '../lib/toast'
import ChatMessage from '../components/ChatMessage'
import FlashcardInline from '../components/sage/FlashcardInline'
import MockExamInline from '../components/sage/MockExamInline'
import DeepNotesInline from '../components/sage/DeepNotesInline'
import GapReportInline from '../components/sage/GapReportInline'
import CoachCardInline from '../components/sage/CoachCardInline'
import SnapSolveInline from '../components/sage/SnapSolveInline'
import UpgradeModal from '../components/UpgradeModal'

type ThreadKind = 'text' | 'flashcards' | 'mockexam' | 'deepnotes' | 'knowledgegap' | 'coach' | 'snapsolve'
interface ThreadItem { id: string; role: 'user' | 'assistant'; kind: ThreadKind; content?: string; image?: string; data?: any }

const SUGGESTIONS = ['Explain the key concepts', 'Quiz me on this', 'Make flashcards', 'What am I missing?', 'How am I doing?', 'Go deeper on this topic']

export default function SageAITutor() {
  const navigate = useNavigate()
  const { userId } = useAuth()
  const fileRef = useRef<HTMLInputElement>(null)
  const threadEndRef = useRef<HTMLDivElement>(null)

  const [access, setAccess] = useState<AccessInfo>(emptyAccess)
  const [accessLoaded, setAccessLoaded] = useState(false)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [upgradeReason, setUpgradeReason] = useState<'explorer_locked' | 'no_lectures_left' | 'needs_premium'>('explorer_locked')

  const [recordings, setRecordings] = useState<Recording[]>([])
  const [selectedLectureId, setSelectedLectureId] = useState('')
  const [lecturePacket, setLecturePacket] = useState<LecturePacket | null>(null)
  const [showLectureSelector, setShowLectureSelector] = useState(false)

  const [thread, setThread] = useState<ThreadItem[]>([])
  const [composerText, setComposerText] = useState('')
  const [composerImage, setComposerImage] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    const recs = getAllRecordings()
    setRecordings(recs)
    if (recs.length > 0) {
      const sorted = [...recs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      setSelectedLectureId(sorted[0].id)
    }
    loadAccess(userId).then(a => { setAccess(a); setAccessLoaded(true) })
  }, [userId])

  useEffect(() => {
    if (!selectedLectureId) { setLecturePacket(null); return }
    setLecturePacket(getLecturePacket(selectedLectureId))
  }, [selectedLectureId])

  useEffect(() => { threadEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [thread, sending])

  const lectureContent = lecturePacket ? (lecturePacket.notes || '') + '\n\n' + (lecturePacket.transcript || '') : ''
  const studentCtx = formatContextForAI(buildStudentContext(access.currentPlan))

  const callSage = async (body: any) => {
    const res = await fetch('/api/ai-tools', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, userId }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
      throw new Error(err.error || 'Request failed')
    }
    return res.json()
  }

  const handleImageAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setComposerImage(ev.target?.result as string)
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const handleSend = async () => {
    const text = composerText.trim()
    if (!text && !composerImage) return
    if (sending) return

    const intent = detectIntent(text, !!composerImage)
    const needsCredit = intent !== 'chat'
    let accessResult: ReturnType<typeof checkAccess> | null = null

    if (needsCredit) {
      accessResult = checkAccess(access, 'core')
      if (!accessResult.allowed) {
        setUpgradeReason(access.planLocked ? 'explorer_locked' : 'no_lectures_left')
        setShowUpgradeModal(true)
        return
      }
    } else if (access.planLocked) {
      setUpgradeReason('explorer_locked')
      setShowUpgradeModal(true)
      return
    }

    const userItem: ThreadItem = { id: `u-${Date.now()}`, role: 'user', kind: 'text', content: text || '📷 Image attached', image: composerImage || undefined }
    setThread(prev => [...prev, userItem])
    setComposerText('')
    const imageForRequest = composerImage
    setComposerImage(null)
    setSending(true)

    try {
      let assistantItem: ThreadItem

      if (intent === 'snapsolve') {
        const data = await callSage({ mode: 'snapsolve', image: imageForRequest, text, documentContext: buildLecturePromptContext(lecturePacket) })
        assistantItem = { id: `a-${Date.now()}`, role: 'assistant', kind: 'snapsolve', data: data.result }

      } else if (intent === 'flashcards') {
        assistantItem = !lectureContent.trim()
          ? { id: `a-${Date.now()}`, role: 'assistant', kind: 'text', content: "I'll need a lecture with notes to build flashcards from — select one above, or ask me a specific question instead." }
          : { id: `a-${Date.now()}`, role: 'assistant', kind: 'flashcards', data: (await callSage({ mode: 'flashcards', lectureContent, subject: lecturePacket?.course })).flashcards }

      } else if (intent === 'mockexam') {
        assistantItem = !lectureContent.trim()
          ? { id: `a-${Date.now()}`, role: 'assistant', kind: 'text', content: "I'll need a lecture with notes or a transcript to build a mock exam — select one above first." }
          : { id: `a-${Date.now()}`, role: 'assistant', kind: 'mockexam', data: await callSage({ mode: 'mockexam', lectureContent, subject: lecturePacket?.course, numQuestions: 8 }) }

      } else if (intent === 'deepnotes') {
        assistantItem = !lectureContent.trim()
          ? { id: `a-${Date.now()}`, role: 'assistant', kind: 'text', content: "Select a lecture with notes first — I'll expand them into deep notes." }
          : { id: `a-${Date.now()}`, role: 'assistant', kind: 'deepnotes', data: await callSage({ mode: 'deepnotes', content: lectureContent, subject: lecturePacket?.course }) }

      } else if (intent === 'knowledgegap') {
        assistantItem = (!lecturePacket?.transcript && !lecturePacket?.notes)
          ? { id: `a-${Date.now()}`, role: 'assistant', kind: 'text', content: "Select a lecture with notes or a transcript first — I'll check what you might be missing." }
          : { id: `a-${Date.now()}`, role: 'assistant', kind: 'knowledgegap', data: await callSage({ mode: 'knowledgegap', transcript: lecturePacket!.transcript, notes: lecturePacket!.notes, subject: lecturePacket!.course }) }

      } else if (intent === 'coach') {
        assistantItem = { id: `a-${Date.now()}`, role: 'assistant', kind: 'coach', data: await callSage({ mode: 'coach', studentContext: studentCtx, question: text }) }

      } else {
        const history = thread.filter(t => t.kind === 'text').slice(-8).map(t => ({ role: t.role, content: t.content || '' }))
        const data = await callSage({
          mode: 'chat',
          chatMessages: [...history, { role: 'user', content: text }],
          documentContext: buildLecturePromptContext(lecturePacket),
          studentContext: studentCtx,
          chatMode: 'general',
          subjectStructure: getSubjectStructure(lecturePacket?.course || text),
        })
        assistantItem = { id: `a-${Date.now()}`, role: 'assistant', kind: 'text', content: data.reply }
      }

      setThread(prev => [...prev, assistantItem])

      if (needsCredit && accessResult?.allowed) {
        await consumeCredit(access, accessResult.source)
        setAccess(await loadAccess(userId))
      }
    } catch (err: any) {
      toast.error(err.message || 'SAGE had trouble responding — try again.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface-base flex flex-col">
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageAttach} />

      <UpgradeModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} reason={upgradeReason} currentPlan={access.currentPlan} />

      <nav className="border-b border-white/5 bg-surface-elevated/50 backdrop-blur-md sticky top-0 z-10 shrink-0">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-sm text-[#8B97B5] hover:text-white">
            <ArrowLeft size={16} /> Back
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-blue to-purple-500 flex items-center justify-center">
              <Brain size={16} className="text-white" />
            </div>
            <span className="font-sora font-bold text-white">SAGE AI Tutor</span>
          </div>
          <div className="w-16" />
        </div>
      </nav>

      <div className="max-w-3xl mx-auto w-full px-4 pt-3 shrink-0">
        <div className="bg-surface-elevated border border-white/5 rounded-2xl overflow-hidden">
          <button onClick={() => setShowLectureSelector(!showLectureSelector)} className="w-full px-4 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-brand-blue/15 flex items-center justify-center shrink-0"><BookOpen size={13} className="text-brand-blue" /></div>
              <div className="min-w-0 text-left">
                {lecturePacket ? (
                  <>
                    <p className="text-xs font-semibold text-white truncate">{lecturePacket.name}</p>
                    <p className="text-[10px] text-[#8B97B5]">
                      {lecturePacket.course && `${lecturePacket.course} · `}
                      {lecturePacket.transcript ? '✓ Transcript ' : ''}{lecturePacket.notes ? '✓ Notes' : ''}
                      {!lecturePacket.transcript && !lecturePacket.notes ? 'No AI content yet' : ''}
                    </p>
                  </>
                ) : <p className="text-xs text-[#8B97B5]">No lecture selected — SAGE will still help generally</p>}
              </div>
            </div>
            {showLectureSelector ? <ChevronUp size={14} className="text-[#8B97B5] shrink-0" /> : <ChevronDown size={14} className="text-[#8B97B5] shrink-0" />}
          </button>
          <AnimatePresence>
            {showLectureSelector && (
              <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden border-t border-white/5">
                <div className="px-3 py-2 max-h-48 overflow-y-auto space-y-1">
                  {recordings.length === 0 ? (
                    <div className="py-4 text-center text-[#8B97B5] text-xs">No recordings yet. <button onClick={() => navigate('/recording')} className="text-brand-blue underline">Record a lecture</button></div>
                  ) : recordings.map(rec => (
                    <button key={rec.id} onClick={() => { setSelectedLectureId(rec.id); setShowLectureSelector(false) }}
                      className={`w-full text-left px-3 py-2 rounded-xl transition flex items-center gap-2 ${selectedLectureId === rec.id ? 'bg-brand-blue/15 border border-brand-blue/30' : 'hover:bg-surface-base'}`}>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-white truncate">{rec.name}</p>
                        <p className="text-[10px] text-[#8B97B5]">{rec.course && `${rec.course} · `}{rec.notes ? '✓ Notes' : '— No notes'}</p>
                      </div>
                      {selectedLectureId === rec.id && <CheckCircle size={12} className="text-brand-blue shrink-0" />}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {accessLoaded && (
          <p className="text-[11px] text-brand-blue mt-2 px-1">
            {isUnlimitedPlan(access)
              ? `✨ ${access.currentPlan} plan · unlimited chat, metered generation`
              : access.planLocked
              ? <>🔒 Locked — <button onClick={() => navigate('/pricing')} className="text-red-400 underline">upgrade to continue →</button></>
              : `🎓 ${explorerLecturesRemaining(access)} AI credits remaining · chat is free`}
          </p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-4 space-y-4">
          {thread.length === 0 && (
            <div className="flex flex-col items-center justify-center text-center py-10">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-blue to-purple-500 flex items-center justify-center mb-4"><Brain size={28} className="text-white" /></div>
              <p className="text-white font-sora font-bold text-lg mb-2">One tutor, everything built in</p>
              <p className="text-[#8B97B5] text-sm max-w-sm mb-6">Ask a question, request a quiz, flashcards, deep notes, or a progress check — SAGE figures out what you need. Snap a photo for anything, including work outside your lectures.</p>
              <div className="flex flex-wrap gap-2 justify-center max-w-md">
                {SUGGESTIONS.map(s => (
                  <button key={s} onClick={() => setComposerText(s)} className="text-xs text-brand-blue border border-brand-blue/30 bg-brand-blue/5 px-3 py-1.5 rounded-full hover:bg-brand-blue/10 transition">{s}</button>
                ))}
              </div>
            </div>
          )}

          {thread.map(item => (
            <div key={item.id} className={`flex ${item.role === 'user' ? 'justify-end' : 'justify-start'} gap-2`}>
              {item.role === 'assistant' && (
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-blue to-purple-500 flex items-center justify-center shrink-0 mt-0.5"><Brain size={12} className="text-white" /></div>
              )}
              <div className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm break-words ${item.role === 'user' ? 'bg-brand-blue text-white rounded-br-sm' : 'bg-surface-elevated border border-white/5 text-[#C5CCDE] rounded-bl-sm'}`}>
                {item.image && <img src={item.image} alt="Attached" className="rounded-lg mb-2 max-h-40 object-cover" />}
                {item.kind === 'text' && item.content && <ChatMessage content={item.content} />}
                {item.kind === 'flashcards' && <FlashcardInline cards={item.data} />}
                {item.kind === 'mockexam' && <MockExamInline exam={item.data} />}
                {item.kind === 'deepnotes' && <DeepNotesInline notes={item.data} />}
                {item.kind === 'knowledgegap' && <GapReportInline data={item.data} />}
                {item.kind === 'coach' && <CoachCardInline data={item.data} />}
                {item.kind === 'snapsolve' && <SnapSolveInline result={item.data} />}
              </div>
            </div>
          ))}

          {sending && (
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-blue to-purple-500 flex items-center justify-center shrink-0"><Brain size={12} className="text-white" /></div>
              <div className="bg-surface-elevated border border-white/5 rounded-2xl px-4 py-3 flex gap-1.5">
                {[0, 150, 300].map(d => <span key={d} className="w-1.5 h-1.5 bg-brand-blue rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />)}
              </div>
            </div>
          )}
          <div ref={threadEndRef} />
        </div>
      </div>

      <div className="border-t border-white/5 bg-surface-elevated/80 backdrop-blur-md shrink-0 pb-[72px]">
        <div className="max-w-3xl mx-auto px-4 py-3">
          {composerImage && (
            <div className="relative inline-block mb-2">
              <img src={composerImage} alt="Attached" className="h-16 rounded-lg border border-white/10" />
              <button onClick={() => setComposerImage(null)} className="absolute -top-1.5 -right-1.5 bg-black/70 text-white rounded-full p-0.5"><X size={12} /></button>
            </div>
          )}
          <div className="flex items-end gap-2">
            <button onClick={() => fileRef.current?.click()} disabled={sending} className="p-2.5 rounded-xl bg-surface-base border border-white/10 text-[#8B97B5] hover:text-white transition disabled:opacity-50 shrink-0"><Camera size={18} /></button>
            <textarea value={composerText} onChange={e => setComposerText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
              placeholder="Ask anything — SAGE handles the rest..." disabled={sending} rows={1}
              className="flex-1 bg-surface-base border border-white/10 rounded-xl px-3 py-2.5 text-white placeholder-[#4A5568] text-sm outline-none focus:border-brand-blue/40 disabled:opacity-50 resize-none min-w-0 max-h-24" />
            <button onClick={handleSend} disabled={sending || (!composerText.trim() && !composerImage)} className="bg-brand-blue text-white p-2.5 rounded-xl hover:bg-brand-blue/90 disabled:opacity-50 transition shrink-0">
              {sending ? <Loader size={18} className="animate-spin" /> : <Send size={18} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
