import { SmartInkNote, SmartInkSection, NoteVisualTier, parseInlineHighlights } from '../lib/smartInk'
import { Lightbulb, BookOpen } from 'lucide-react'

// ── Inline text with **highlighted** terms ────────────────────────────────

function InlineText({ text, tier, highlightClass }: { text: string; tier: NoteVisualTier; highlightClass?: string }) {
  const parts = parseInlineHighlights(text)
  const defaultHighlight =
    tier === 'semester' ? 'text-purple-300 font-semibold bg-purple-500/10 px-0.5 rounded'
    : tier === 'pro' ? 'text-purple-400 font-semibold'
    : tier === 'lite' ? 'text-blue-300 font-medium'
    : 'font-medium'

  return (
    <span>
      {parts.map((p, i) =>
        p.highlight ? (
          <span key={i} className={highlightClass || defaultHighlight}>{p.text}</span>
        ) : (
          <span key={i}>{p.text}</span>
        )
      )}
    </span>
  )
}

// ── Flowchart renderer ────────────────────────────────────────────────────

function FlowChart({ section, tier }: { section: SmartInkSection; tier: NoteVisualTier }) {
  const nodes = section.nodes || []
  const edges = section.edges || []

  const is3D = tier === 'semester'
  const is2D = tier === 'pro'
  const isSketch = tier === 'lite'

  const nodeStyle = (shape: string = 'rect') => {
    const base = 'relative flex flex-col items-center justify-center text-center px-3 py-2 min-w-[80px] max-w-[140px] text-xs font-medium transition-all'

    if (is3D) {
      if (shape === 'diamond') return `${base} bg-gradient-to-br from-indigo-500 to-purple-600 text-white rotate-45 w-16 h-16 rounded-sm shadow-[4px_4px_0px_rgba(0,0,0,0.4),8px_8px_16px_rgba(99,102,241,0.3)]`
      if (shape === 'oval') return `${base} bg-gradient-to-br from-green-500 to-emerald-600 text-white rounded-full px-4 py-2 shadow-[3px_3px_0px_rgba(0,0,0,0.3),0px_8px_20px_rgba(52,211,153,0.3)]`
      return `${base} bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-xl shadow-[4px_4px_0px_rgba(0,0,0,0.4),0px_8px_20px_rgba(99,102,241,0.25)] border-t border-l border-white/20`
    }

    if (is2D) {
      if (shape === 'diamond') return `${base} bg-indigo-500/20 border-2 border-indigo-400 text-indigo-300 rotate-45 w-14 h-14 rounded-sm`
      if (shape === 'oval') return `${base} bg-green-500/20 border-2 border-green-400 text-green-300 rounded-full px-4 py-1.5`
      return `${base} bg-surface-elevated border-2 border-brand-blue text-white rounded-lg`
    }

    if (isSketch) {
      if (shape === 'diamond') return `${base} border-2 border-dashed border-[#8B97B5] text-[#8B97B5] rotate-45 w-14 h-14 rounded-sm`
      if (shape === 'oval') return `${base} border-2 border-dashed border-[#8B97B5] text-[#8B97B5] rounded-full px-4 py-1.5`
      return `${base} border-2 border-dashed border-[#8B97B5] text-[#8B97B5] rounded-lg`
    }

    return `${base} bg-surface-elevated border border-white/20 text-white rounded-lg`
  }

  const labelStyle = (shape: string = 'rect') =>
    shape === 'diamond' ? '-rotate-45 text-[10px] leading-tight block' : 'text-[11px] leading-tight'

  return (
    <div className={`my-4 rounded-xl p-4 overflow-x-auto ${
      is3D ? 'bg-gradient-to-br from-indigo-500/5 to-purple-500/5 border border-indigo-500/20'
      : is2D ? 'bg-surface-base border border-white/10'
      : isSketch ? 'bg-transparent border border-dashed border-[#8B97B5]/40'
      : 'bg-surface-base border border-white/5'
    }`}>
      {section.title && (
        <p className={`text-xs font-semibold mb-4 ${
          is3D ? 'text-indigo-300' : is2D ? 'text-brand-blue' : 'text-[#8B97B5]'
        }`}>
          {is3D ? '🔷' : is2D ? '📊' : isSketch ? '✏️' : '📋'} {section.title}
        </p>
      )}

      <div className="flex flex-col items-center gap-0 min-w-[200px]">
        {nodes.map((node, i) => {
          const edge = edges.find((e) => e.from === node.id)
          const shape = node.shape || 'rect'
          const isLast = i === nodes.length - 1

          return (
            <div key={node.id} className="flex flex-col items-center">
              <div className={nodeStyle(shape)}>
                <span className={labelStyle(shape)}>{node.label}</span>
                {node.sublabel && shape !== 'diamond' && (
                  <span className="text-[9px] opacity-70 mt-0.5 block">{node.sublabel}</span>
                )}
              </div>

              {!isLast && (
                <div className="flex flex-col items-center my-1">
                  <div className={`w-0.5 h-4 ${
                    is3D ? 'bg-gradient-to-b from-indigo-400 to-purple-400'
                    : is2D ? 'bg-brand-blue'
                    : isSketch ? 'border-l-2 border-dashed border-[#8B97B5] w-0'
                    : 'bg-white/30'
                  }`} />
                  {edge?.label && (
                    <span className={`text-[9px] px-1 rounded my-0.5 ${
                      is3D ? 'text-indigo-300 bg-indigo-500/10'
                      : is2D ? 'text-brand-blue'
                      : 'text-[#8B97B5]'
                    }`}>{edge.label}</span>
                  )}
                  <div className={`text-sm ${
                    is3D ? 'text-indigo-400' : is2D ? 'text-brand-blue' : 'text-[#8B97B5]'
                  }`}>↓</div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Section renderer ──────────────────────────────────────────────────────

function Section({ section, tier }: { section: SmartInkSection; tier: NoteVisualTier }) {
  const isSemester = tier === 'semester'
  const isPro = tier === 'pro'
  const isLite = tier === 'lite'

  if (section.type === 'flowchart') {
    if (tier === 'plain') return null
    return <FlowChart section={section} tier={tier} />
  }

  switch (section.type) {
    case 'heading':
      return (
        <h3 className={`font-sora font-bold text-lg sm:text-xl mt-6 mb-2 first:mt-0 break-words ${
          isSemester ? 'bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent'
          : isPro ? 'text-red-400'
          : isLite ? 'text-red-300'
          : 'text-white'
        }`}>
          {section.text}
        </h3>
      )

    case 'subheading':
      return (
        <h4 className={`font-sora font-semibold text-base mt-4 mb-2 break-words ${
          isSemester ? 'bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent'
          : isPro ? 'text-blue-400'
          : isLite ? 'text-blue-300'
          : 'text-[#C5CCDE]'
        }`}>
          {section.text}
        </h4>
      )

    case 'definition':
      return (
        <div className={`border-l-4 rounded-r-lg p-3 my-2 ${
          isSemester ? 'bg-gradient-to-r from-blue-500/15 to-cyan-500/10 border-blue-400 shadow-sm shadow-blue-500/10'
          : isPro ? 'bg-blue-500/10 border-blue-400'
          : isLite ? 'bg-surface-base border-blue-400/50'
          : 'bg-surface-base border-white/20'
        }`}>
          <InlineText text={section.text || ''} tier={tier} className="text-sm text-[#C5CCDE] break-words" />
        </div>
      )

    case 'example':
      return (
        <div className={`border-l-4 rounded-r-lg p-3 my-2 ${
          isSemester ? 'bg-gradient-to-r from-green-500/15 to-emerald-500/10 border-green-400 shadow-sm shadow-green-500/10'
          : isPro ? 'bg-green-500/10 border-green-400'
          : isLite ? 'bg-surface-base border-green-400/40'
          : 'bg-surface-base border-white/20'
        }`}>
          <p className={`text-[10px] font-semibold uppercase tracking-wide mb-1 ${
            isSemester || isPro ? 'text-green-400' : isLite ? 'text-green-300/70' : 'text-[#8B97B5]'
          }`}>Example</p>
          <InlineText text={section.text || ''} tier={tier} className="text-sm text-[#C5CCDE] break-words" />
        </div>
      )

    case 'examtip':
      return (
        <div className={`border rounded-xl p-3 my-3 flex gap-2 ${
          isSemester ? 'bg-gradient-to-r from-yellow-500/15 to-amber-500/10 border-yellow-400/50 shadow-sm shadow-yellow-500/10'
          : isPro ? 'bg-yellow-500/10 border-yellow-500/30'
          : isLite ? 'bg-surface-base border-yellow-500/20'
          : 'bg-surface-base border-white/10'
        }`}>
          <Lightbulb size={16} className={`shrink-0 mt-0.5 ${
            isSemester || isPro ? 'text-yellow-400' : isLite ? 'text-yellow-300/70' : 'text-[#8B97B5]'
          }`} />
          <div className="min-w-0">
            <p className={`text-[10px] font-bold uppercase tracking-wide mb-1 ${
              isSemester || isPro ? 'text-yellow-400' : isLite ? 'text-yellow-300/60' : 'text-[#8B97B5]'
            }`}>⭐ Exam Tip</p>
            <InlineText text={section.text || ''} tier={tier} className={`text-sm break-words ${
              isSemester ? 'text-yellow-100' : isPro ? 'text-yellow-100' : 'text-[#C5CCDE]'
            }`} />
          </div>
        </div>
      )

    case 'summary':
      return (
        <div className={`border rounded-xl p-4 my-4 ${
          isSemester ? 'bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border-indigo-400/30 shadow-sm shadow-indigo-500/10'
          : isPro ? 'bg-surface-elevated border-white/10'
          : isLite ? 'bg-surface-base border-white/5'
          : 'bg-surface-elevated border-white/5'
        }`}>
          <p className={`text-[10px] font-bold uppercase tracking-wide mb-1.5 flex items-center gap-1.5 ${
            isSemester ? 'text-indigo-300' : isPro ? 'text-brand-blue' : 'text-[#8B97B5]'
          }`}>
            <BookOpen size={12} /> Summary
          </p>
          <InlineText text={section.text || ''} tier={tier} className="text-sm text-white break-words" />
        </div>
      )

    case 'table':
      if (!section.headers || !section.rows) return null
      return (
        <div className="my-3">
          <div className="sm:hidden space-y-2">
            {section.rows.map((row, i) => (
              <div key={i} className={`rounded-lg p-3 space-y-1 border ${
                isSemester ? 'bg-gradient-to-br from-surface-elevated to-surface-base border-white/10'
                : 'bg-surface-base border-white/5'
              }`}>
                {row.map((cell, j) => (
                  <div key={j} className="text-xs">
                    <span className={`${isSemester ? 'text-indigo-300' : isPro ? 'text-brand-blue' : 'text-[#8B97B5]'}`}>
                      {section.headers![j]}:{' '}
                    </span>
                    <span className="text-white break-words">{cell}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div className={`hidden sm:block overflow-hidden rounded-lg border ${
            isSemester ? 'border-indigo-500/30' : 'border-white/10'
          }`}>
            <table className="w-full text-sm">
              <thead>
                <tr className={`${
                  isSemester ? 'bg-gradient-to-r from-indigo-500/20 to-purple-500/20'
                  : isPro ? 'bg-brand-blue/10'
                  : 'bg-surface-base'
                }`}>
                  {section.headers.map((h, i) => (
                    <th key={i} className={`text-left px-3 py-2 font-semibold text-xs ${
                      isSemester ? 'text-indigo-300' : isPro ? 'text-brand-blue' : 'text-[#8B97B5]'
                    }`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {section.rows.map((row, i) => (
                  <tr key={i} className="border-t border-white/5 hover:bg-white/5 transition">
                    {row.map((cell, j) => (
                      <td key={j} className="px-3 py-2 text-white align-top text-sm">{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )

    case 'paragraph':
    default:
      return (
        <p className="text-sm text-[#C5CCDE] leading-relaxed my-2 break-words">
          <InlineText text={section.text || ''} tier={tier} />
        </p>
      )
  }
}

// ── Main component ────────────────────────────────────────────────────────

export default function SmartInkNotes({ note, tier }: { note: SmartInkNote; tier: NoteVisualTier }) {
  const isSemester = tier === 'semester'
  const isPro = tier === 'pro'

  return (
    <div className="min-w-0">
      {note.subjectArea && (
        <span className={`inline-block text-[10px] font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full mb-3 ${
          isSemester ? 'bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-indigo-300 border border-indigo-400/30'
          : isPro ? 'bg-brand-blue/15 text-brand-blue'
          : 'bg-white/5 text-[#8B97B5]'
        }`}>
          {note.subjectArea}
        </span>
      )}

      <div className="space-y-1">
        {note.sections.map((s, i) => (
          <Section key={i} section={s} tier={tier} />
        ))}
      </div>

      {note.quickRevision && (
        <div className={`mt-6 rounded-xl p-4 space-y-3 border ${
          isSemester ? 'bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border-indigo-500/20 shadow-lg shadow-indigo-500/5'
          : isPro ? 'bg-surface-elevated border-white/10'
          : 'bg-surface-base border-white/5'
        }`}>
          <p className={`font-sora font-bold text-sm ${
            isSemester ? 'bg-gradient-to-r from-indigo-300 to-purple-300 bg-clip-text text-transparent'
            : isPro ? 'text-white'
            : 'text-[#C5CCDE]'
          }`}>🖍️ Quick Revision</p>

          {note.quickRevision.topFacts && note.quickRevision.topFacts.length > 0 && (
            <div>
              <p className={`text-[10px] font-semibold uppercase tracking-wide mb-1.5 ${
                isSemester ? 'text-indigo-300' : isPro ? 'text-brand-blue' : 'text-[#8B97B5]'
              }`}>Top Facts</p>
              <ul className="space-y-1">
                {note.quickRevision.topFacts.map((f, i) => (
                  <li key={i} className="text-xs text-[#C5CCDE] flex items-start gap-1.5">
                    <span className={`shrink-0 ${
                      isSemester ? 'text-orange-400' : isPro ? 'text-brand-blue' : 'text-[#8B97B5]'
                    }`}>{i + 1}.</span>
                    <span className="break-words">{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {note.quickRevision.keyTerms && note.quickRevision.keyTerms.length > 0 && (
            <div>
              <p className={`text-[10px] font-semibold uppercase tracking-wide mb-1.5 ${
                isSemester ? 'text-indigo-300' : isPro ? 'text-brand-blue' : 'text-[#8B97B5]'
              }`}>Key Terms</p>
              <div className="flex flex-wrap gap-1.5">
                {note.quickRevision.keyTerms.map((t, i) => (
                  <span key={i} className={`text-xs px-2.5 py-1 rounded-full break-words ${
                    isSemester ? 'bg-gradient-to-r from-purple-500/20 to-indigo-500/20 text-purple-300 border border-purple-400/20'
                    : isPro ? 'bg-purple-500/15 text-purple-300'
                    : 'bg-white/5 text-[#8B97B5]'
                  }`}>{t}</span>
                ))}
              </div>
            </div>
          )}

          {note.quickRevision.commonMistakes && note.quickRevision.commonMistakes.length > 0 && (
            <div>
              <p className={`text-[10px] font-semibold uppercase tracking-wide mb-1.5 ${
                isSemester ? 'text-red-300' : isPro ? 'text-red-400' : 'text-[#8B97B5]'
              }`}>⚠️ Common Mistakes</p>
              <ul className="space-y-1">
                {note.quickRevision.commonMistakes.map((m, i) => (
                  <li key={i} className="text-xs text-[#C5CCDE] flex items-start gap-1.5">
                    <span className={`shrink-0 ${isSemester || isPro ? 'text-red-400' : 'text-[#8B97B5]'}`}>!</span>
                    <span className="break-words">{m}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
