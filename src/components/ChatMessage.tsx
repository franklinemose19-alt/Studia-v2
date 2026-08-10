import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { InlineMath, BlockMath } from 'react-katex'
import 'katex/dist/katex.min.css'
import ChartBlock from './sage/ChartBlock'
import DiagramBlock from './sage/DiagramBlock'

interface Segment { type: 'text' | 'code' | 'chart' | 'diagram' | 'blockmath'; content: string; language?: string }

function parseSegments(raw: string): Segment[] {
  const segments: Segment[] = []
  const regex = /```(\w*)\n?([\s\S]*?)```|\$\$([\s\S]*?)\$\$/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(raw)) !== null) {
    if (match.index > lastIndex) segments.push({ type: 'text', content: raw.slice(lastIndex, match.index) })
    if (match[3] !== undefined) {
      segments.push({ type: 'blockmath', content: match[3].trim() })
    } else {
      const lang = (match[1] || '').toLowerCase()
      const body = match[2].replace(/\n$/, '')
      if (lang === 'chart') segments.push({ type: 'chart', content: body })
      else if (lang === 'diagram') segments.push({ type: 'diagram', content: body })
      else segments.push({ type: 'code', content: body, language: lang })
    }
    lastIndex = regex.lastIndex
  }
  if (lastIndex < raw.length) segments.push({ type: 'text', content: raw.slice(lastIndex) })
  if (segments.length === 0) segments.push({ type: 'text', content: raw })
  return segments
}

function InlineRich({ text }: { text: string }) {
  const parts = text.split(/(`[^`]+`|\$[^$\n]+\$)/g).filter(Boolean)
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('`') && part.endsWith('`') && part.length > 1) {
          return <code key={i} className="bg-black/20 text-[0.85em] px-1.5 py-0.5 rounded font-mono">{part.slice(1, -1)}</code>
        }
        if (part.startsWith('$') && part.endsWith('$') && part.length > 2) {
          try { return <InlineMath key={i} math={part.slice(1, -1)} /> } catch { return <span key={i}>{part}</span> }
        }
        return <span key={i}>{part}</span>
      })}
    </>
  )
}

function isTableLine(line: string) { return /^\s*\|.*\|\s*$/.test(line) }
function isSeparatorLine(line: string) { return /^\s*\|?[\s:-]+\|[\s:|-]*\|?\s*$/.test(line) && line.includes('-') }

function TableBlock({ lines }: { lines: string[] }) {
  const rows = lines.filter(l => !isSeparatorLine(l)).map(l => l.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim()))
  if (rows.length === 0) return null
  const [header, ...body] = rows
  return (
    <div className="my-2 overflow-x-auto rounded-xl border border-white/10">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-white/5">
            {header.map((h, i) => <th key={i} className="px-3 py-2 text-left font-semibold text-white border-b border-white/10 whitespace-nowrap"><InlineRich text={h} /></th>)}
          </tr>
        </thead>
        <tbody>
          {body.map((row, ri) => (
            <tr key={ri} className={ri % 2 === 0 ? '' : 'bg-white/[0.02]'}>
              {row.map((cell, ci) => <td key={ci} className="px-3 py-2 text-[#C5CCDE] border-b border-white/5 whitespace-nowrap"><InlineRich text={cell} /></td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function TextSegment({ content }: { content: string }) {
  const lines = content.split('\n')
  const blocks: React.ReactNode[] = []
  let i = 0, key = 0

  while (i < lines.length) {
    const line = lines[i]
    if (isTableLine(line)) {
      const tableLines: string[] = []
      let j = i
      while (j < lines.length && (isTableLine(lines[j]) || isSeparatorLine(lines[j]))) { tableLines.push(lines[j]); j++ }
      blocks.push(<TableBlock key={key++} lines={tableLines} />)
      i = j
      continue
    }
    if (line.trim()) blocks.push(<p key={key++} className="leading-relaxed"><InlineRich text={line} /></p>)
    else blocks.push(<div key={key++} className="h-1" />)
    i++
  }
  return <>{blocks}</>
}

function CodeBlock({ code, language }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try { await navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch {}
  }
  return (
    <div className="my-2 rounded-xl overflow-hidden border border-white/10 bg-[#0A0F1E]">
      <div className="flex items-center justify-between px-3 py-1.5 bg-white/5 border-b border-white/10">
        <span className="text-[10px] text-[#8B97B5] font-mono uppercase tracking-wide">{language || 'code'}</span>
        <button onClick={copy} className="flex items-center gap-1 text-[10px] text-[#8B97B5] hover:text-white transition">
          {copied ? <><Check size={11} /> Copied</> : <><Copy size={11} /> Copy</>}
        </button>
      </div>
      <pre className="p-3 overflow-x-auto text-xs leading-relaxed"><code className="font-mono text-[#C5CCDE] whitespace-pre">{code}</code></pre>
    </div>
  )
}

function BlockMathSafe({ math }: { math: string }) {
  try { return <div className="my-2 overflow-x-auto py-1"><BlockMath math={math} /></div> } catch { return <p className="text-xs text-[#8B97B5] font-mono">{math}</p> }
}

export default function ChatMessage({ content }: { content: string }) {
  const segments = parseSegments(content || '')
  return (
    <div className="space-y-1">
      {segments.map((seg, i) => {
        if (seg.type === 'code') return <CodeBlock key={i} code={seg.content} language={seg.language} />
        if (seg.type === 'blockmath') return <BlockMathSafe key={i} math={seg.content} />
        if (seg.type === 'chart') return <ChartBlock key={i} raw={seg.content} />
        if (seg.type === 'diagram') return <DiagramBlock key={i} raw={seg.content} />
        return <TextSegment key={i} content={seg.content} />
      })}
    </div>
  )
}
