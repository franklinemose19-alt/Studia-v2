import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageCircle, Send, Loader, ChevronDown, ChevronUp } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface StudyChatProps {
  documentContext: string
  studentContext: string
  mode: 'notes' | 'quiz' | 'snapsolve' | 'general'
  placeholder?: string
  welcomeMessage?: string
}

const DEFAULT_WELCOME: Record<StudyChatProps['mode'], string> = {
  notes: "I've read your notes! Ask me anything — I can explain concepts, give more examples, or highlight what's likely to appear in exams. 📚",
  quiz: "Ask me why any answer was correct or wrong and I'll explain the reasoning. I can also give memory tricks! 🧠",
  snapsolve: "Want to go deeper on this problem? Ask me anything — I'm here to keep tutoring you. ⚡",
  general: "What would you like to know? I'm here to help. 🎓",
}

export default function StudyChat({
  documentContext,
  studentContext,
  mode,
  placeholder,
  welcomeMessage,
}: StudyChatProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{
        role: 'assistant',
        content: welcomeMessage || DEFAULT_WELCOME[mode],
      }])
    }
  }, [isOpen])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 300)
  }, [isOpen])

  const sendMessage = async () => {
    if (!input.trim() || loading) return

    const userMessage: Message = { role: 'user', content: input.trim() }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/ai-tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'chat',
          chatMessages: newMessages,
          documentContext: documentContext.slice(0, 3000),
          studentContext,
          chatMode: mode,
        }),
      })

      const data = await res.json()
      if (data.reply) {
        setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }])
      } else {
        setMessages((prev) => [...prev, { role: 'assistant', content: "Sorry, I couldn't process that. Please try again." }])
      }
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Connection error. Please check your internet and try again.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-3 bg-gradient-to-r from-brand-blue/10 to-purple-500/10 border border-brand-blue/20 rounded-xl px-4 py-3 text-white hover:from-brand-blue/15 hover:to-purple-500/15 transition-all"
      >
        <div className="flex items-center gap-2">
          <MessageCircle size={18} className="text-brand-blue" />
          <span className="text-sm font-medium">Ask STUDIA AI about this</span>
          {messages.length > 1 && (
            <span className="bg-brand-blue text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              {messages.filter(m => m.role === 'user').length}
            </span>
          )}
        </div>
        {isOpen
          ? <ChevronUp size={16} className="text-[#8B97B5] shrink-0" />
          : <ChevronDown size={16} className="text-[#8B97B5] shrink-0" />
        }
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-surface-base border border-white/10 rounded-xl mt-2 overflow-hidden">

              {/* Messages */}
              <div className="h-64 overflow-y-auto p-4 space-y-3">
                {messages.map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {msg.role === 'assistant' && (
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-brand-blue to-purple-500 flex items-center justify-center text-white text-[10px] font-bold mr-2 shrink-0 mt-0.5">
                        S
                      </div>
                    )}
                    <div className={`max-w-[80%] rounded-2xl px-3 py-2.5 text-sm leading-relaxed break-words ${
                      msg.role === 'user'
                        ? 'bg-brand-blue text-white rounded-br-sm'
                        : 'bg-surface-elevated text-[#C5CCDE] rounded-bl-sm'
                    }`}>
                      {msg.content}
                    </div>
                  </motion.div>
                ))}

                {loading && (
                  <div className="flex justify-start items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-brand-blue to-purple-500 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                      S
                    </div>
                    <div className="bg-surface-elevated rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-brand-blue animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-brand-blue animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-brand-blue animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Suggested questions */}
              {messages.length === 1 && (
                <div className="px-4 pb-2 flex flex-wrap gap-1.5">
                  {(mode === 'notes'
                    ? ['Explain this simply', 'What might appear in exams?', 'Give me more examples']
                    : mode === 'quiz'
                    ? ['Why was that answer wrong?', 'Give me a memory trick', 'Explain in simpler terms']
                    : ['Go deeper on this', 'Give me a similar example', 'How does this relate to exams?']
                  ).map((suggestion, i) => (
                    <button
                      key={i}
                      onClick={() => { setInput(suggestion); inputRef.current?.focus() }}
                      className="text-[10px] text-brand-blue border border-brand-blue/30 bg-brand-blue/5 px-2.5 py-1 rounded-full hover:bg-brand-blue/10 transition whitespace-nowrap"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}

              {/* Input */}
              <div className="border-t border-white/5 p-3 flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
                  placeholder={placeholder || 'Ask anything about this...'}
                  disabled={loading}
                  className="flex-1 bg-surface-elevated border border-white/10 rounded-xl px-3 py-2.5 text-white placeholder-[#4A5568] text-sm outline-none focus:border-brand-blue/40 disabled:opacity-50 min-w-0"
                />
                <button
                  onClick={sendMessage}
                  disabled={loading || !input.trim()}
                  className="bg-brand-blue text-white p-2.5 rounded-xl hover:bg-brand-blue/90 disabled:opacity-50 transition shrink-0"
                >
                  {loading ? <Loader size={16} className="animate-spin" /> : <Send size={16} />}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
