import { useState, useEffect, useRef } from 'react'
import { Brain, ArrowLeft, Menu, Plus, ArrowUp, BookOpen, ChevronDown, ChevronUp, CheckCircle, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuth } from '../lib/AuthContext'
import { loadAccess, checkAccess, consumeCredit, type AccessInfo, emptyAccess } from '../lib/access'
import { getAllRecordings, getLecturePacket, buildLecturePromptContext, type LecturePacket, type Recording } from '../lib/lectureContext'
import { buildStudentContext, formatContextForAI } from '../lib/studentContext'
import { detectIntent, getSubjectStructure, type SageIntent } from '../lib/sageIntent'
import { sageCache } from '../lib/sageCache'
import {
  listConversations, createConversation, renameConversation, deleteConversation,
  loadMessages, saveMessage, generateTitle, type SageConversation,
} from '../lib/sageConversations'
import { toast } from '../lib/toast'
import ChatMessage from '../components/ChatMessage'
import UpgradeModal from '../components/UpgradeModal'
import SageSidebar from '../components/sage/SageSidebar'
import SageToolsMenu, { type SageTool } from '../components/sage/SageToolsMenu'
import FlashcardInline from '../components/sage/FlashcardInline'
import MockExamInline from '../components/sage/MockExamInline'
import DeepNotesInline from '../components/sage/DeepNotesInline'
import GapReportInline from '../components/sage/GapReportInline'
import CoachCardInline from '../components/sage/CoachCardInline'
import SnapSolveInline from '../components/sage/SnapSolveInline'
import PastPapersInline from '../components/sage/PastPapersInline'
import KnowledgeRecallInline from '../components/sage/KnowledgeRecallInline'
type ThreadKind = 'text' | 'flashcards' | 'mockexam' | 'deepnotes' | 'knowledgegap' | 'coach' | 'snapsolve' | 'pastpapers'
interface ThreadItem { id: string; role: 'user' | 'assistant'; kind: ThreadKind; content?: string; image?: string; data?: any }

const SUGGESTIONS = ['Explain the key concepts', 'Quiz me on this', 'Make flashcards', 'What am I missing?', 'How am I doing?']

function summarizeForStorage(kind: ThreadKind, data: any): string {
  switch (kind) {
    case 'flashcards': return `Generated ${data?.length || 0} flashcards`
    case 'mockexam': return `Generated exam: ${data?.examTitle || 'Mock Exam'}`
    case 'deepnotes': return `Deep notes: ${data?.title || 'Untitled'}`
    case 'knowledgegap': return `Knowledge gap check — ${data?.examReadiness ?? '?'}% exam ready`
    case 'coach': return data?.message || 'Study coach check-in'
    case 'snapsolve': return `Answered: ${data?.question || 'a question'}`
    case 'pastpapers': return `Analyzed past paper: ${data?.paper_title || 'document'}`
    default: return ''
  }
}

export default function SageAITutor() {
  const navigate = useNavigate()
  const { userId } = useAuth()

  const cameraInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const pdfInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const threadEndRef = useRef<HTMLDivElement>(null)

  const [access, setAccess] = useState<AccessInfo>(emptyAccess)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [upgradeReason, setUpgradeReason] = useState<'explorer_locked' | 'no_lectures_left' | 'needs_premium'>('explorer_locked')

  const [recordings, setRecordings] = useState<Recording[]>([])
  const [selectedLectureId, setSelectedLectureId] = useState('')
  const [lecturePacket, setLecturePacket] = useState<LecturePacket | null>(null)
  const [showLectureSelector, setShowLectureSelector] = useState(false)

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [toolsMenuOpen, setToolsMenuOpen] = useState(false)
  const [conversations, setConversations] = useState<SageConversation[]>([])
  const [conversationsLoading, setConversationsLoading] = useState(true)
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null)
  const [threadLoading, setThreadLoading] = useState(false)

  const [thread, setThread] = useState<ThreadItem[]>([])
  const [composerText, setComposerText] = useState('')
  const [composerImage, setComposerImage] = useState<string | null>(null)
  const [composerPdf, setComposerPdf] = useState<string | null>(null)
  const [composerPdfName, setComposerPdfName] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (!userId) return
    const init = async () => {
      const [a, convos] = await Promise.all([loadAccess(userId), listConversations(userId)])
      setAccess(a)
      setConversations(convos)
      setConversationsLoading(false)
      if (convos.length > 0) await handleSelectConversation(convos[0].id)
    }
    init()

    const recs = getAllRecordings()
    setRecordings(recs)
    if (recs.length > 0) {
      const sorted = [...recs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      setSelectedLectureId(sorted[0].id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  useEffect(() => {
    if (!selectedLectureId) { setLecturePacket(null); return }
    setLecturePacket(getLecturePacket(selectedLectureId))
  }, [selectedLectureId])

  useEffect(() => { threadEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [thread, sending])
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }, [composerText])

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

  const runGatedGeneration = async <T,>(opts: { cacheKind?: string; cacheContent?: string; apiCall: () => Promise<T> }): Promise<{ data: T | null; blocked: boolean }> => {
    if (opts.cacheKind && opts.cacheContent) {
      const cached = sageCache.get(opts.cacheKind, opts.cacheContent)
      if (cached) return { data: cached, blocked: false }
    }
    const result = checkAccess(access, 'core')
    if (!result.allowed) {
      setUpgradeReason(access.planLocked ? 'explorer_locked' : 'no_lectures_left')
      setShowUpgradeModal(true)
      return { data: null, blocked: true }
    }
    const data = await opts.apiCall()
    if (opts.cacheKind && opts.cacheContent) sageCache.set(opts.cacheKind, opts.cacheContent, data)
    await consumeCredit(access, result.source)
    setAccess(await loadAccess(userId))
    return { data, blocked: false }
  }

  const handleSelectConversation = async (id: number) => {
    if (id === activeConversationId) return
    setThreadLoading(true)
    try {
      const rows = await loadMessages(id)
      const items: ThreadItem[] = rows.map(r => ({
        id: `db-${r.id}`,
        role: r.role,
        kind: (r.metadata?.kind as ThreadKind) || 'text',
        content: r.content || undefined,
        data: r.metadata?.data,
      }))
      setThread(items)
      setActiveConversationId(id)
    } catch {
      toast.error('Could not load that conversation')
    } finally {
      setThreadLoading(false)
    }
  }

  const handleNewChat = () => {
    setThread([])
    setActiveConversationId(null)
    setComposerText('')
    setComposerImage(null)
    setComposerPdf(null)
  }

  const handleRenameConversation = async (id: number, title: string) => {
    const ok = await renameConversation(id, title)
    if (ok) setConversations(prev => prev.map(c => c.id === id ? { ...c, title } : c))
  }

  const handleDeleteConversation = async (id: number) => {
    const ok = await deleteConversation(id)
    if (ok) {
      setConversations(prev => prev.filter(c => c.id !== id))
      if (activeConversationId === id) { setThread([]); setActiveConversationId(null) }
      toast.success('Conversation deleted')
    } else {
      toast.error('Could not delete conversation')
    }
  }

  const runTurn = async (
    displayText: string,
    opts: { intent?: SageIntent; image?: string | null; pdfBase64?: string | null; pdfName?: string } = {}
  ) => {
    if (sending) return
    if (access.planLocked) {
      setUpgradeReason('explorer_locked')
      setShowUpgradeModal(true)
      return
    }

    const hasImage = !!opts.image
    const hasPdf = !!opts.pdfBase64
    const text = displayText.trim()
    if (!text && !hasImage && !hasPdf) return

    const intent: SageIntent = opts.intent || (hasPdf ? 'pastpapers' : detectIntent(text, hasImage))

    let convoId = activeConversationId
    if (!convoId) {
      const created = await createConversation(userId!, generateTitle(text, hasImage || hasPdf))
      if (!created) { toast.error('Could not start a new conversation'); return }
      convoId = created.id
      setActiveConversationId(created.id)
      setConversations(prev => [created, ...prev])
    }

    const userItem: ThreadItem = {
      id: `u-${Date.now()}`, role: 'user', kind: 'text',
      content: text || (hasImage ? '📷 Photo' : hasPdf ? `📄 ${opts.pdfName || 'Document'}` : ''),
      image: opts.image || undefined,
    }
    setThread(prev => [...prev, userItem])
    setComposerText('')
    setComposerImage(null)
    setComposerPdf(null)
    setComposerPdfName('')
    setSending(true)

    saveMessage(convoId, userId!, 'user', userItem.content || '', { hasImage, hasPdf, pdfName: opts.pdfName }).catch(() => {})

    try {
      let assistantKind: ThreadKind = 'text'
      let assistantContent = ''
      let assistantData: any = null

      if (intent === 'snapsolve') {
        const { data, blocked } = await runGatedGeneration({ apiCall: async () => (await callSage({ mode: 'snapsolve', image: opts.image, text, documentContext: buildLecturePromptContext(lecturePacket) })).result })
        if (blocked) assistantContent = "You're out of AI credits right now — tap Upgrade to keep going."
        else { assistantKind = 'snapsolve'; assistantData = data }

      } else if (intent === 'pastpapers') {
        const { data, blocked } = await runGatedGeneration({ apiCall: async () => (await callSage({ mode: 'pastpapers', pdfBase64: opts.pdfBase64 })).result })
        if (blocked) assistantContent = "You're out of AI credits right now — tap Upgrade to keep going."
        else { assistantKind = 'pastpapers'; assistantData = data }

      } else if (intent === 'flashcards') {
        if (!lectureContent.trim()) assistantContent = "I'll need a lecture with notes to build flashcards — select one above first."
        else {
          const { data, blocked } = await runGatedGeneration({
            cacheKind: 'flashcards', cacheContent: lectureContent,
            apiCall: async () => (await callSage({ mode: 'flashcards', lectureContent, subject: lecturePacket?.course })).flashcards,
          })
          if (blocked) assistantContent = "You're out of AI credits right now — tap Upgrade to keep going."
          else { assistantKind = 'flashcards'; assistantData = data }
        }

      } else if (intent === 'mockexam') {
        if (!lectureContent.trim()) assistantContent = "I'll need a lecture with notes or a transcript to build an exam — select one above first."
        else {
          const { data, blocked } = await runGatedGeneration({
            cacheKind: 'mockexam', cacheContent: lectureContent,
            apiCall: () => callSage({ mode: 'mockexam', lectureContent, subject: lecturePacket?.course, numQuestions: 8 }),
          })
          if (blocked) assistantContent = "You're out of AI credits right now — tap Upgrade to keep going."
          else { assistantKind = 'mockexam'; assistantData = data }
        }

      } else if (intent === 'deepnotes') {
        if (!lectureContent.trim()) assistantContent = "Select a lecture with notes first — I'll expand them into deep notes."
        else {
          const { data, blocked } = await runGatedGeneration({
            cacheKind: 'deepnotes', cacheContent: lectureContent,
            apiCall: () => callSage({ mode: 'deepnotes', content: lectureContent, subject: lecturePacket?.course }),
          })
          if (blocked) assistantContent = "You're out of AI credits right now — tap Upgrade to keep going."
          else { assistantKind = 'deepnotes'; assistantData = data }
        }

      } else if (intent === 'knowledgegap') {
        if (!lecturePacket?.transcript && !lecturePacket?.notes) assistantContent = "Select a lecture with notes or a transcript first — I'll check what you might be missing."
        else {
          const cacheKey = (lecturePacket.transcript || '') + (lecturePacket.notes || '')
          const { data, blocked } = await runGatedGeneration({
            cacheKind: 'knowledgegap', cacheContent: cacheKey,
            apiCall: () => callSage({ mode: 'knowledgegap', transcript: lecturePacket!.transcript, notes: lecturePacket!.notes, subject: lecturePacket!.course }),
          })
          if (blocked) assistantContent = "You're out of AI credits right now — tap Upgrade to keep going."
          else { assistantKind = 'knowledgegap'; assistantData = data }
        }

      } else if (intent === 'coach') {
        const { data, blocked } = await runGatedGeneration({ apiCall: () => callSage({ mode: 'coach', studentContext: studentCtx, question: text }) })
        if (blocked) assistantContent = "You're out of AI credits right now — tap Upgrade to keep going."
        else { assistantKind = 'coach'; assistantData = data }

      } else {
        const history = thread.filter(t => t.kind === 'text' && t.content).slice(-8).map(t => ({ role: t.role, content: t.content }))
        const data = await callSage({
          mode: 'chat',
          chatMessages: [...history, { role: 'user', content: text }],
          documentContext: buildLecturePromptContext(lecturePacket),
          studentContext: studentCtx,
          chatMode: 'general',
          subjectStructure: getSubjectStructure(lecturePacket?.course || text),
        })
        assistantKind = 'text'
        assistantContent = data.reply
      }

      const assistantItem: ThreadItem = { id: `a-${Date.now()}`, role: 'assistant', kind: assistantKind, content: assistantContent || undefined, data: assistantData }
      setThread(prev => [...prev, assistantItem])
      saveMessage(convoId, userId!, 'assistant', assistantContent || summarizeForStorage(assistantKind, assistantData), { kind: assistantKind, data: assistantData }).catch(() => {})

    } catch (err: any) {
      toast.error(err.message || 'SAGE had trouble responding — try again.')
    } finally {
      setSending(false)
    }
  }

  const handleComposerSend = () => {
    runTurn(composerText, { image: composerImage, pdfBase64: composerPdf, pdfName: composerPdfName })
  }

  const handleFileAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setComposerImage(ev.target?.result as string)
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const handlePdfAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.type !== 'application/pdf') { toast.error('Please select a PDF file'); return }
    setComposerPdfName(file.name)
    const reader = new FileReader()
    reader.onload = ev => {
      const result = ev.target?.result as string
      setComposerPdf(result.split(',')[1] || result)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const handleToolSelect = (tool: SageTool) => {
    setToolsMenuOpen(false)
    if (access.planLocked) {
      setUpgradeReason('explorer_locked')
      setShowUpgradeModal(true)
      return
    }
    if (tool === 'camera') { cameraInputRef.current?.click(); return }
    if (tool === 'image') { imageInputRef.current?.click(); return }
    if (tool === 'file') { pdfInputRef.current?.click(); return }
    const labels: Record<string, string> = {
      deepnotes: '📓 Deep Notes',
      flashcards: '🗂️ Flashcards',
      mockexam: '📝 Exam Generator',
      knowledgegap: '🔍 Knowledge Gap Check',
      coach: '🧭 Study Coach Check-in',
    }
    runTurn(labels[tool] || '', { intent: tool as SageIntent })
  }

  return (
    <div className="min-h-screen bg-surface-base flex flex-col">
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileAttach} />
      <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileAttach} />
      <input ref={pdfInputRef} type="file" accept="application/pdf" className="hidden" onChange={handlePdfAttach} />

      <UpgradeModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} reason={upgradeReason} currentPlan={access.currentPlan} />
      <SageSidebar
        open={sidebarOpen} onClose={() => setSidebarOpen(false)}
        conversations={conversations} activeId={activeConversationId}
        onSelect={handleSelectConversation} onNewChat={handleNewChat}
        onRename={handleRenameConversation} onDelete={handleDeleteConversation}
        loading={conversationsLoading}
      />
      <SageToolsMenu open={toolsMenuOpen} onClose={() => setToolsMenuOpen(false)} onSelect={handleToolSelect} />

      <nav className="border-b border-white/5 bg-surface-elevated/50 backdrop-blur-md sticky top-0 z-10 shrink-0">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button onClick={() => navigate('/dashboard')} className="p-2 -ml-2 rounded-lg text-[#8B97B5] hover:text-white transition"><ArrowLeft size={18} /></button>
            <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg text-[#8B97B5] hover:text-white transition"><Menu size={18} /></button>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-blue to-purple-500 flex items-center justify-center"><Brain size={16} className="text-white" /></div>
            <span className="font-sora font-bold text-white">SAGE</span>
          </div>
          <button onClick={handleNewChat} className="p-2 -mr-2 rounded-lg text-[#8B97B5] hover:text-white transition" title="New chat"><Plus size={18} /></button>
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
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-4 space-y-4">
          {threadLoading ? (
            <div className="py-16 text-center text-[#8B97B5] text-sm">Loading conversation...</div>
          ) : thread.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-10">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-blue to-purple-500 flex items-center justify-center mb-4"><Brain size={28} className="text-white" /></div>
              <p className="text-white font-sora font-bold text-lg mb-2">One tutor, everything built in</p>
              <p className="text-[#8B97B5] text-sm max-w-sm mb-6">Ask a question, request a quiz, flashcards, deep notes, or a progress check — SAGE figures out what you need. Snap a photo or attach a PDF for anything, including work outside your lectures.</p>
              <div className="flex flex-wrap gap-2 justify-center max-w-md">
                {SUGGESTIONS.map(s => (
                  <button key={s} onClick={() => setComposerText(s)} className="text-xs text-brand-blue border border-brand-blue/30 bg-brand-blue/5 px-3 py-1.5 rounded-full hover:bg-brand-blue/10 transition">{s}</button>
                ))}
              </div>
            </div>
          ) : (
            thread.map(item => (
              <div key={item.id} className={`flex ${item.role === 'user' ? 'justify-end' : 'justify-start'} gap-2`}>
                {item.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-blue to-purple-500 flex items-center justify-center shrink-0 mt-0.5"><Brain size={12} className="text-white" /></div>
                )}
                <div className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm break-words ${item.role === 'user' ? 'bg-brand-blue text-white rounded-br-sm' : 'bg-surface-elevated border border-white/5 text-[#C5CCDE] rounded-bl-sm'}`}>
                  {item.image && <img src={item.image} alt="Attached" className="rounded-lg mb-2 max-h-40 object-cover" />}
                  {item.kind === 'text' && item.content && <ChatMessage content={item.content} />}
                  {item.kind === 'flashcards' && <FlashcardInline cards={item.data} />}
                  {item.kind === 'mockexam' && <MockExamInline exam={item.data} subject={lecturePacket?.course} />}
                  {item.kind === 'deepnotes' && <DeepNotesInline notes={item.data} />}
                  {item.kind === 'knowledgegap' && <GapReportInline data={item.data} />}
                  {item.kind === 'coach' && <CoachCardInline data={item.data} />}
                  {item.kind === 'snapsolve' && <SnapSolveInline result={item.data} />}
                  {item.kind === 'pastpapers' && <PastPapersInline result={item.data} />}
                </div>
              </div>
            ))
          )}

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

          {access.planLocked ? (
            <button onClick={() => { setUpgradeReason('explorer_locked'); setShowUpgradeModal(true) }}
              className="w-full bg-red-500/10 border border-red-500/30 text-red-300 py-3 rounded-2xl text-sm font-semibold hover:bg-red-500/15 transition">
              🔒 Your free lectures are used up — tap to upgrade and unlock SAGE
            </button>
          ) : (
            <>
              {(composerImage || composerPdf) && (
                <div className="flex items-center gap-2 mb-2">
                  {composerImage && (
                    <div className="relative inline-block">
                      <img src={composerImage} alt="Attached" className="h-14 rounded-lg border border-white/10" />
                      <button onClick={() => setComposerImage(null)} className="absolute -top-1.5 -right-1.5 bg-black/70 text-white rounded-full p-0.5"><X size={11} /></button>
                    </div>
                  )}
                  {composerPdf && (
                    <div className="relative flex items-center gap-1.5 bg-surface-base border border-white/10 rounded-lg px-2.5 py-2">
                      <span className="text-[10px] text-white truncate max-w-[120px]">📄 {composerPdfName}</span>
                      <button onClick={() => { setComposerPdf(null); setComposerPdfName('') }} className="text-[#8B97B5] hover:text-white"><X size={12} /></button>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-end gap-2">
                <button onClick={() => setToolsMenuOpen(true)} disabled={sending}
                  className="p-3 rounded-2xl bg-surface-base border border-white/10 text-[#8B97B5] hover:text-white transition disabled:opacity-40 shrink-0">
                  <Plus size={18} />
                </button>
                <textarea
                  ref={textareaRef}
                  value={composerText}
                  onChange={e => setComposerText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleComposerSend() } }}
                  placeholder="Ask SAGE anything..."
                  disabled={sending}
                  rows={1}
                  style={{ maxHeight: 120, overflowY: 'auto' }}
                  className="flex-1 bg-surface-base border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-[#4A5568] text-sm outline-none focus:border-brand-blue/40 disabled:opacity-50 resize-none min-w-0 leading-relaxed"
                />
                <button onClick={handleComposerSend} disabled={sending || (!composerText.trim() && !composerImage && !composerPdf)}
                  className="bg-brand-blue text-white p-3 rounded-2xl hover:bg-brand-blue/90 disabled:opacity-40 transition shrink-0">
                  <ArrowUp size={18} />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
