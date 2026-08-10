import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

interface Section { heading: string; explanation: string; memoryTrick?: string; examTips?: string[] }
interface DeepNotes { title: string; overview: string; sections: Section[] }

export default function DeepNotesInline({ notes }: { notes: DeepNotes }) {
  const [open, setOpen] = useState<number | null>(0)
  if (!notes?.sections?.length) return null

  return (
    <div className="my-2 bg-surface-base rounded-xl border border-white/10 p-4 space-y-2">
      <p className="text-xs font-semibold text-white">{notes.title}</p>
      <p className="text-[11px] text-[#8B97B5]">{notes.overview}</p>
      {notes.sections.map((s, i) => (
        <div key={i} className="border border-white/5 rounded-lg overflow-hidden">
          <button onClick={() => setOpen(open === i ? null : i)} className="w-full flex items-center justify-between px-3 py-2 text-left">
            <span className="text-xs font-medium text-white">{s.heading}</span>
            {open === i ? <ChevronUp size={13} className="text-[#8B97B5]" /> : <ChevronDown size={13} className="text-[#8B97B5]" />}
          </button>
          {open === i && (
            <div className="px-3 pb-3 space-y-2">
              <p className="text-[11px] text-[#C5CCDE]">{s.explanation}</p>
              {s.memoryTrick && <p className="text-[10px] text-purple-300 bg-purple-500/10 rounded p-2">🧠 {s.memoryTrick}</p>}
              {s.examTips && s.examTips.length > 0 && (
                <div className="text-[10px] text-yellow-200 bg-yellow-500/10 rounded p-2">
                  {s.examTips.map((t, j) => <p key={j}>⭐ {t}</p>)}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
