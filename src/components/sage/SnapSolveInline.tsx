import ChatMessage from '../ChatMessage'

interface SnapResult { question: string; answer: string; explanation?: string }

export default function SnapSolveInline({ result }: { result: SnapResult }) {
  if (!result) return null
  return (
    <div className="my-2 space-y-2">
      <div className="bg-white/5 rounded-lg p-3">
        <p className="text-[10px] text-[#8B97B5] font-semibold mb-1">QUESTION</p>
        <p className="text-xs text-white">{result.question}</p>
      </div>
      <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
        <p className="text-[10px] text-green-400 font-semibold mb-1">ANSWER</p>
        <ChatMessage content={result.answer} />
      </div>
      {result.explanation && (
        <div className="bg-brand-blue/10 border border-brand-blue/20 rounded-lg p-3">
          <p className="text-[10px] text-brand-blue font-semibold mb-1">KEY CONCEPTS</p>
          <ChatMessage content={result.explanation} />
        </div>
      )}
    </div>
  )
}
