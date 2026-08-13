import { Brain } from 'lucide-react'

interface RecallResult { found: boolean; conceptName?: string; mastery?: number; reply?: string; sourceCount?: number; message?: string }

export default function KnowledgeRecallInline({ result }: { result: RecallResult }) {
  if (!result) return null
  if (!result.found) {
    return (
      <div className="my-2 bg-surface-base rounded-xl border border-white/10 p-4 flex items-start gap-2.5">
        <Brain size={16} className="text-[#8B97B5] shrink-0 mt-0.5" />
        <p className="text-xs text-[#8B97B5]">{result.message}</p>
      </div>
    )
  }
  return (
    <div className="my-2 bg-gradient-to-r from-brand-blue/10 to-purple-500/10 rounded-xl border border-brand-blue/20 p-4 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-brand-blue">{result.conceptName}</p>
        <span className="text-[10px] text-[#8B97B5]">{result.mastery}% mastery · {result.sourceCount} source{result.sourceCount !== 1 ? 's' : ''}</span>
      </div>
      <p className="text-sm text-white leading-relaxed">{result.reply}</p>
    </div>
  )
}
