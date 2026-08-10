interface GapData {
  knowledgeCoverage: number; examReadiness: number; understandingScore: number; confidenceScore: number
  weakAreas: string[]; studyNext: string; summary: string
}

const scoreColor = (s: number) => s >= 75 ? 'text-green-400' : s >= 50 ? 'text-yellow-400' : 'text-red-400'

export default function GapReportInline({ data }: { data: GapData }) {
  if (!data) return null
  return (
    <div className="my-2 bg-surface-base rounded-xl border border-white/10 p-4 space-y-3">
      <div className="grid grid-cols-4 gap-2 text-center">
        {[
          { label: 'Coverage', value: data.knowledgeCoverage },
          { label: 'Readiness', value: data.examReadiness },
          { label: 'Understanding', value: data.understandingScore },
          { label: 'Confidence', value: data.confidenceScore },
        ].map((s, i) => (
          <div key={i} className="bg-white/5 rounded-lg py-2">
            <p className={`font-bold text-sm ${scoreColor(s.value)}`}>{s.value}%</p>
            <p className="text-[9px] text-[#8B97B5] mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-[#C5CCDE]">{data.summary}</p>
      {data.weakAreas?.length > 0 && (
        <div className="text-[10px] text-red-300 bg-red-500/10 rounded p-2">Weak: {data.weakAreas.join(', ')}</div>
      )}
      <div className="text-[11px] text-white bg-brand-blue/10 rounded-lg p-2">📚 Study next: {data.studyNext}</div>
    </div>
  )
}
