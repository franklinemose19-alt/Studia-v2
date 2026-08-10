interface CoachData { message: string; recommendation: string; suggestedAction?: string }

export default function CoachCardInline({ data }: { data: CoachData }) {
  if (!data) return null
  return (
    <div className="my-2 bg-gradient-to-r from-brand-blue/10 to-purple-500/10 rounded-xl border border-brand-blue/20 p-4 space-y-2">
      <p className="text-xs text-white">{data.message}</p>
      <div className="text-[11px] text-brand-blue bg-brand-blue/10 rounded-lg p-2">💡 {data.recommendation}</div>
      {data.suggestedAction && <p className="text-[10px] text-[#8B97B5]">Next: {data.suggestedAction}</p>}
    </div>
  )
}
