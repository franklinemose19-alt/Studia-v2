import { useState, useRef } from 'react'
import { Play, Pause } from 'lucide-react'

interface ScriptEntry {
  timestamp: number
  heading: string
  definition?: string
  explanation: string
  keyTerm?: string
}

const openDB = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const req = indexedDB.open('studia-recordings', 1)
    req.onupgradeneeded = (e: any) => e.target.result.createObjectStore('blobs')
    req.onsuccess = (e: any) => resolve(e.target.result)
    req.onerror = () => reject(req.error)
  })

const getBlob = async (id: string): Promise<Blob | null> => {
  try {
    const db = await openDB()
    return new Promise((resolve) => {
      const req = db.transaction('blobs').objectStore('blobs').get(id)
      req.onsuccess = () => resolve(req.result || null)
      req.onerror = () => resolve(null)
    })
  } catch { return null }
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

export default function TimestampedScript({ script, recordingId }: { script: ScriptEntry[]; recordingId: string }) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playingAt, setPlayingAt] = useState<number | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [loadingAudio, setLoadingAudio] = useState(false)

  const jumpTo = async (timestamp: number) => {
    if (!audioUrl) {
      setLoadingAudio(true)
      const blob = await getBlob(recordingId)
      setLoadingAudio(false)
      if (!blob) return
      const url = URL.createObjectURL(blob)
      setAudioUrl(url)
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.currentTime = timestamp
          audioRef.current.play()
          setPlayingAt(timestamp)
        }
      }, 50)
      return
    }
    if (audioRef.current) {
      audioRef.current.currentTime = timestamp
      audioRef.current.play()
      setPlayingAt(timestamp)
    }
  }

  if (!script?.length) return null

  return (
    <div className="space-y-3">
      {audioUrl && <audio ref={audioRef} src={audioUrl} onEnded={() => setPlayingAt(null)} onPause={() => setPlayingAt(null)} className="hidden" />}
      {script.map((entry, i) => (
        <div key={i} className="bg-white rounded-2xl border border-gray-200 p-4">
          <button onClick={() => jumpTo(entry.timestamp)} disabled={loadingAudio}
            className="flex items-center gap-2 text-indigo-premium text-xs font-semibold mb-2 hover:text-purple-premium transition disabled:opacity-50">
            {playingAt === entry.timestamp ? <Pause size={13} /> : <Play size={13} />}
            {formatTime(entry.timestamp)}
          </button>
          <p className="font-sora font-bold text-navy text-sm mb-1">{entry.heading}</p>
          {entry.definition && <p className="text-xs text-gray-500 mb-1"><strong>Definition:</strong> {entry.definition}</p>}
          <p className="text-sm text-gray-700">{entry.explanation}</p>
          {entry.keyTerm && <span className="inline-block mt-2 text-[10px] bg-indigo-premium/10 text-indigo-premium px-2 py-0.5 rounded-full">{entry.keyTerm}</span>}
        </div>
      ))}
    </div>
  )
}
