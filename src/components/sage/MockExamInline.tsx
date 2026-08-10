import { useState } from 'react'

interface Q { id: string; question: string; options: string[]; correct: number; explanation: string; difficulty: string }
interface Exam { examTitle: string; questions: Q[]; totalMarks: number }

export default function MockExamInline({ exam }: { exam: Exam }) {
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [submitted, setSubmitted] = useState(false)
  if (!exam?.questions?.length) return null
  const score = exam.questions.filter(q => answers[q.id] === q.correct).length

  return (
    <div className="my-2 bg-surface-base rounded-xl border border-white/10 p-4 space-y-3">
      <p className="text-xs font-semibold text-white">{exam.examTitle}</p>
      {submitted && (
        <div className="bg-brand-blue/10 border border-brand-blue/20 rounded-lg p-3 text-center">
          <p className="font-bold text-lg text-white">{score}/{exam.questions.length}</p>
          <p className="text-[10px] text-[#8B97B5]">{Math.round((score / exam.questions.length) * 100)}%</p>
        </div>
      )}
      {exam.questions.map((q, i) => (
        <div key={q.id} className="space-y-1.5">
          <p className="text-xs text-white font-medium">{i + 1}. {q.question}</p>
          <div className="grid grid-cols-1 gap-1.5">
            {q.options.map((opt, j) => {
              let cls = 'border-white/10 text-[#C5CCDE]'
              if (submitted) {
                if (j === q.correct) cls = 'border-green-500/60 bg-green-500/10 text-green-300'
                else if (answers[q.id] === j) cls = 'border-red-500/60 bg-red-500/10 text-red-300'
              } else if (answers[q.id] === j) cls = 'border-brand-blue bg-brand-blue/10 text-brand-blue'
              return (
                <button key={j} disabled={submitted} onClick={() => setAnswers(prev => ({ ...prev, [q.id]: j }))}
                  className={`text-left px-2.5 py-1.5 rounded-lg border text-[11px] transition ${cls}`}>{opt}</button>
              )
            })}
          </div>
          {submitted && q.explanation && <p className="text-[10px] text-[#8B97B5] italic">{q.explanation}</p>}
        </div>
      ))}
      {!submitted && (
        <button onClick={() => setSubmitted(true)} disabled={Object.keys(answers).length < exam.questions.length}
          className="w-full bg-brand-blue text-white py-2 rounded-lg text-xs font-semibold disabled:opacity-40">
          Submit ({Object.keys(answers).length}/{exam.questions.length} answered)
        </button>
      )}
    </div>
  )
}
