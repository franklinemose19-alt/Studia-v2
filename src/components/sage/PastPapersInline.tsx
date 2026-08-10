interface PPQuestion { number: string; question: string; model_answer: string; marks?: string }
interface PPResult { paper_title: string; questions: PPQuestion[]; exam_tips?: string[]; predicted_topics?: string[] }

export default function PastPapersInline({ result }: { result: PPResult }) {
  if (!result?.questions?.length) return null
  return (
    <div className="my-2 space-y-2">
      <p className="text-xs font-semibold text-white">{result.paper_title}</p>
      {result.questions.map((q, i) => (
        <div key={i} className="bg-white/5 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] bg-brand-blue/20 text-brand-blue px-1.5 py-0.5 rounded-full">Q{q.number}</span>
            {q.marks && <span className="text-[10px] text-[#8B97B5]">{q.marks} marks</span>}
          </div>
          <p className="text-xs text-white mb-1.5">{q.question}</p>
          <div className="bg-surface-base rounded-lg p-2">
            <p className="text-[9px] text-mint font-semibold mb-0.5">MODEL ANSWER</p>
            <p className="text-[11px] text-[#C5CCDE]">{q.model_answer}</p>
          </div>
        </div>
      ))}
      {result.exam_tips && result.exam_tips.length > 0 && (
        <div className="bg-yellow-500/10 rounded-lg p-2 text-[10px] text-yellow-200">
          {result.exam_tips.map((t, i) => <p key={i}>⭐ {t}</p>)}
        </div>
      )}
      {result.predicted_topics && result.predicted_topics.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {result.predicted_topics.map((t, i) => (
            <span key={i} className="text-[9px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full">{t}</span>
          ))}
        </div>
      )}
    </div>
  )
}
