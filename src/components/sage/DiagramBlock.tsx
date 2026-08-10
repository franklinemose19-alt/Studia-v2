interface DNode { id: string; label: string; sublabel?: string }
interface DEdge { from: string; to: string; label?: string }
interface DiagramSpec { title?: string; nodes: DNode[]; edges: DEdge[] }

export default function DiagramBlock({ raw }: { raw: string }) {
  let spec: DiagramSpec | null = null
  try { spec = JSON.parse(raw) } catch { spec = null }

  if (!spec || !spec.nodes?.length) {
    return <pre className="text-xs text-[#8B97B5] bg-surface-base rounded-xl p-3 my-2 overflow-x-auto">{raw}</pre>
  }

  return (
    <div className="my-2 bg-surface-base rounded-xl border border-white/10 p-4">
      {spec.title && <p className="text-xs font-semibold text-white mb-3">{spec.title}</p>}
      <div className="flex flex-col items-center gap-1">
        {spec.nodes.map((node, i) => {
          const outgoing = spec!.edges.find(e => e.from === node.id)
          return (
            <div key={node.id} className="flex flex-col items-center">
              <div className="px-4 py-2.5 rounded-lg border-2 border-brand-blue/50 bg-brand-blue/10 text-center min-w-[120px]">
                <p className="text-xs font-medium text-white">{node.label}</p>
                {node.sublabel && <p className="text-[10px] text-[#8B97B5] mt-0.5">{node.sublabel}</p>}
              </div>
              {i < spec!.nodes.length - 1 && (
                <div className="flex flex-col items-center py-1">
                  <div className="w-px h-3 bg-white/20" />
                  {outgoing?.label && <span className="text-[9px] text-[#8B97B5] my-0.5">{outgoing.label}</span>}
                  <div className="text-white/30 text-xs">↓</div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
