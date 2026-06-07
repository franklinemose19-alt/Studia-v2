import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Loader, Copy, Download } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function Summarize() {
  const navigate = useNavigate()
  const [notes, setNotes] = useState('')
  const [summary, setSummary] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const generateSummary = async () => {
    if (!notes.trim()) {
      alert('Please paste your lecture notes')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: notes }),
      })

      const data = await res.json()

      if (data.summary) {
        setSummary(data.summary)
      } else {
        alert('Error: ' + (data.error || 'Failed to generate summary'))
      }
    } catch (err) {
      alert('Error: ' + (err instanceof Error ? err.message : 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  const downloadSummary = () => {
    const element = document.createElement('a')
    const file = new Blob([summary], { type: 'text/plain' })
    element.href = URL.createObjectURL(file)
    element.download = 'summary.txt'
    element.click()
  }

  const copySummary = () => {
    navigator.clipboard.writeText(summary)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-surface-base">
      <nav className="border-b border-white/5 bg-surface-elevated/50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-sm text-[#8B97B5] hover:text-white"
          >
            <ArrowLeft size={16} />
            Back
          </button>
          <div className="flex items-center gap-1">
            <span className="font-sora font-bold text-xl text-white">STUDIA</span>
            <sup className="text-brand-blue text-xs">β</sup>
          </div>
          <div className="w-20" />
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
          <div>
            <h1 className="font-sora font-bold text-4xl text-white mb-2">Summarize Lecture Notes</h1>
            <p className="text-[#8B97B5]">Paste your lecture notes and get an AI-powered summary instantly.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-surface-elevated border border-white/5 rounded-2xl p-6 space-y-4">
              <label className="block text-sm font-medium text-white">Paste your lecture notes:</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Paste your lecture notes here... The more detailed, the better the summary!"
                className="w-full h-64 bg-surface-base border border-white/10 rounded-xl p-4 text-white placeholder-[#4A5568] outline-none focus:border-brand-blue/40 resize-none"
              />
              <button
                onClick={generateSummary}
                disabled={loading || !notes.trim()}
                className="w-full bg-brand-blue text-white font-medium py-3 rounded-xl hover:bg-brand-blue/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    Generate Summary
                  </>
                )}
              </button>
            </div>

            <div className="bg-surface-elevated border border-white/5 rounded-2xl p-6 space-y-4">
              <label className="block text-sm font-medium text-white">Your Summary:</label>
              {summary ? (
                <>
                  <div className="h-64 bg-surface-base border border-white/10 rounded-xl p-4 overflow-y-auto">
                    <p className="text-[#8B97B5] leading-relaxed whitespace-pre-wrap text-sm">{summary}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={copySummary}
                      className="flex-1 flex items-center justify-center gap-2 bg-brand-blue/10 text-brand-blue py-2 rounded-xl hover:bg-brand-blue/20 text-sm font-medium"
                    >
                      <Copy size={16} />
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                    <button
                      onClick={downloadSummary}
                      className="flex-1 flex items-center justify-center gap-2 bg-brand-blue/10 text-brand-blue py-2 rounded-xl hover:bg-brand-blue/20 text-sm font-medium"
                    >
                      <Download size={16} />
                      Download
                    </button>
                  </div>
                </>
              ) : (
                <div className="h-64 bg-surface-base border border-white/10 rounded-xl p-4 flex items-center justify-center text-[#4A5568] text-center">
                  <p>Your summary will appear here...</p>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
