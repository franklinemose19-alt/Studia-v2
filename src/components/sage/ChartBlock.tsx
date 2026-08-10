import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

interface ChartSpec { type?: 'bar' | 'line'; title?: string; labels: string[]; datasets: { name: string; values: number[] }[] }

const COLORS = ['#3B82F6', '#22C55E', '#F59E0B', '#A855F7', '#EF4444']

export default function ChartBlock({ raw }: { raw: string }) {
  let spec: ChartSpec | null = null
  try { spec = JSON.parse(raw) } catch { spec = null }

  if (!spec || !spec.labels || !spec.datasets) {
    return <pre className="text-xs text-[#8B97B5] bg-surface-base rounded-xl p-3 my-2 overflow-x-auto">{raw}</pre>
  }

  const data = spec.labels.map((label, i) => {
    const row: Record<string, any> = { label }
    spec!.datasets.forEach(ds => { row[ds.name] = ds.values[i] })
    return row
  })

  const ChartComp = spec.type === 'line' ? LineChart : BarChart

  return (
    <div className="my-2 bg-surface-base rounded-xl border border-white/10 p-3">
      {spec.title && <p className="text-xs font-semibold text-white mb-2">{spec.title}</p>}
      <div style={{ width: '100%', height: 220 }}>
        <ResponsiveContainer>
          <ChartComp data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis dataKey="label" tick={{ fill: '#8B97B5', fontSize: 10 }} />
            <YAxis tick={{ fill: '#8B97B5', fontSize: 10 }} />
            <Tooltip contentStyle={{ background: '#0D1526', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 }} />
            {spec.datasets.length > 1 && <Legend wrapperStyle={{ fontSize: 10 }} />}
            {spec.datasets.map((ds, i) =>
              spec!.type === 'line'
                ? <Line key={ds.name} type="monotone" dataKey={ds.name} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={{ r: 3 }} />
                : <Bar key={ds.name} dataKey={ds.name} fill={COLORS[i % COLORS.length]} radius={[4, 4, 0, 0]} />
            )}
          </ChartComp>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
