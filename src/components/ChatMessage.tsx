import { useState } from 'react'
import { Check, Copy } from 'lucide-react'

interface Segment {
  type: 'text' | 'code'
  content: string
  language?: string
}

function parseMessage(raw: string): Segment[] {
  const segments: Segment[] = []
  const fenceRegex = /```(\w*)\n?([\s\S]*?)```/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = fenceRegex.exec(raw)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', content: raw.slice(lastIndex, match.index) })
    }
    segments.push({ type: 'code', content: match[2].replace(/\n$/, ''), language: match[1] || '' })
    lastIndex = fenceRegex.lastIndex
  }
  if (lastIndex < raw.length) {
    segments.push({ type: 'text', content: raw.slice(lastIndex) })
  }
  if (segments.length === 0) segments.push({ type: 'text', content: raw })
  return segments
}

function InlineText({ text }: { text: string }) {
  const parts = text.split(/(`[^`]+`)/g).filter(Boolean)
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith('`') && part.endsWith('`') && part.length > 1 ? (
          <code key={i} className="bg-black/20 text-[0.85em] px-1.5 py-0.5 rounded font-mono">
            {part.slice(1, -1)}
          </code>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  )
}

function CodeBlock({ code, language }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {}
  }

  return (
    <div className="my-2 rounded-xl overflow-hidden border border-white/10 bg-[#0A0F1E]">
      <div className="flex items-center justify-between px-3 py-1.5 bg-white/5 border-b border-white/10">
        <span className="text-[10px] text-[#8B97B5] font-mono uppercase tracking-wide">
          {language || 'code'}
        </span>
        <button onClick={copy} className="flex items-center gap-1 text-[10px] text-[#8B97B5] hover:text-white transition">
          {copied ? <><Check size={11} /> Copied</> : <><Copy size={11} /> Copy</>}
        </button>
      </div>
      <pre className="p-3 overflow-x-auto text-xs leading-relaxed">
        <code className="font-mono text-[#C5CCDE] whitespace-pre">{code}</code>
      </pre>
    </div>
  )
}

export default function ChatMessage({ content }: { content: string }) {
  const segments = parseMessage(content || '')
  return (
    <div className="space-y-1">
      {segments.map((seg, i) =>
        seg.type === 'code' ? (
          <CodeBlock key={i} code={seg.content} language={seg.language} />
        ) : (
          seg.content.split('\n').map((line, j) =>
            line.trim() ? (
              <p key={`${i}-${j}`} className="leading-relaxed">
                <InlineText text={line} />
              </p>
            ) : (
              <div key={`${i}-${j}`} className="h-1" />
            )
          )
        )
      )}
    </div>
  )
}
