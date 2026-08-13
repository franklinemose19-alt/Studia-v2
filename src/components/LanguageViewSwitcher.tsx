import { useState } from 'react'
import { Loader } from 'lucide-react'
import { toast } from '../lib/toast'
import { sageCache } from '../lib/sageCache'

type ViewKey = 'original' | 'academic_english' | 'simple_kiswahili' | 'simple_english'
const VIEW_LABELS: Record<ViewKey, string> = { original: 'Original', academic_english: 'Academic English', simple_kiswahili: 'Simple Kiswahili', simple_english: 'Simple English' }

export default function LanguageViewSwitcher({ originalText, userId }: { originalText: string; userId: string | null }) {
  const [activeView, setActiveView] = useState<ViewKey>('original')
  const [displayedText, setDisplayedText] = useState(originalText)
  const [loading, setLoading] = useState(false)

  const switchView = async (view: ViewKey) => {
    setActiveView(view)
    if (view === 'original') { setDisplayedText(originalText); return }

    const cached = sageCache.get(`language_view_${view}`, originalText)
    if (cached) { setDisplayedText(cached); return }

    setLoading(true)
    try {
      const res = await fetch('/api/ai-tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'language_view', sourceText: originalText, targetView: view, userId }),
      })
      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error || 'Could not generate that view')
        setActiveView('original'); setDisplayedText(originalText)
        return
      }
      const data = await res.json()
      setDisplayedText(data.text)
      sageCache.set(`language_view_${view}`, originalText, data.text)
    } catch {
      toast.error('Connection error — please try again')
      setActiveView('original')
    } finally { setLoading(false) }
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {(Object.keys(VIEW_LABELS) as ViewKey[]).map(key => (
          <button key={key} onClick={() => switchView(key)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition shrink-0 ${activeView === key ? 'bg-indigo-premium text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {VIEW_LABELS[key]}
          </button>
        ))}
      </div>
      {loading ? (
        <div className="py-8 flex items-center justify-center gap-2 text-gray-400 text-sm"><Loader size={14} className="animate-spin" /> Generating {VIEW_LABELS[activeView]}...</div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{displayedText}</p>
        </div>
      )}
    </div>
  )
}
