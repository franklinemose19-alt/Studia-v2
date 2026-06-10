import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Download, Trash2, Lock, Wifi, WifiOff, Mic, BookOpen, BarChart3 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface VaultItem {
  id: string
  type: 'lecture' | 'note' | 'quiz'
  title: string
  size: string
  date: string
  downloadedDate: string
  watermarked: boolean
}

export default function OfflineVault() {
  const navigate = useNavigate()
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [vaultItems, setVaultItems] = useState<VaultItem[]>([])
  const [totalSize, setTotalSize] = useState('0 MB')

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Load vault items from localStorage
    const saved = localStorage.getItem('vaultItems')
    if (saved) {
      try {
        const items = JSON.parse(saved)
        setVaultItems(items)
        
        // Calculate total size
        const total = items.reduce((sum: number, item: VaultItem) => {
          const size = parseInt(item.size)
          return sum + size
        }, 0)
        setTotalSize(`${(total / 1024).toFixed(1)} MB`)
      } catch {
        setVaultItems([])
      }
    }

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const deleteItem = (id: string) => {
    const updated = vaultItems.filter((item) => item.id !== id)
    setVaultItems(updated)
    localStorage.setItem('vaultItems', JSON.stringify(updated))

    // Recalculate size
    const total = updated.reduce((sum, item) => {
      const size = parseInt(item.size)
      return sum + size
    }, 0)
    setTotalSize(`${(total / 1024).toFixed(1)} MB`)
  }

  const downloadItem = (item: VaultItem) => {
    // Simulate download
    const dataStr = JSON.stringify(item)
    const element = document.createElement('a')
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(dataStr))
    element.setAttribute('download', `${item.title}.json`)
    element.style.display = 'none'
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'lecture':
        return <Mic className="text-indigo-premium" size={20} />
      case 'note':
        return <BookOpen className="text-purple-premium" size={20} />
      case 'quiz':
        return <BarChart3 className="text-mint" size={20} />
      default:
        return null
    }
  }

  const lectures = vaultItems.filter((i) => i.type === 'lecture')
  const notes = vaultItems.filter((i) => i.type === 'note')
  const quizzes = vaultItems.filter((i) => i.type === 'quiz')

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-surface-light to-white">
      <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-navy hover:text-indigo-premium transition"
          >
            <ArrowLeft size={20} />
            <span className="font-medium">Back</span>
          </button>
          <div className="flex items-center gap-1">
            <span className="font-sora font-bold text-lg text-navy">STUDIA</span>
            <sup className="text-indigo-premium text-xs">β</sup>
          </div>
          <div className="flex items-center gap-2">
            {isOnline ? (
              <div className="flex items-center gap-2 text-mint">
                <Wifi size={18} />
                <span className="text-sm">Online</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-warning">
                <WifiOff size={18} />
                <span className="text-sm">Offline</span>
              </div>
            )}
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
          {/* HEADER */}
          <div>
            <h1 className="font-sora font-bold text-5xl text-navy mb-2">Offline Vault</h1>
            <p className="text-gray-600">Securely download your study materials for offline access.</p>
          </div>

          {/* STATUS CARDS */}
          <div className="grid md:grid-cols-2 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`rounded-2xl p-6 border ${
                isOnline
                  ? 'bg-mint/10 border-mint/20'
                  : 'bg-warning/10 border-warning/20'
              }`}
            >
              <div className="flex items-center gap-3">
                {isOnline ? <Wifi className="text-mint" size={32} /> : <WifiOff className="text-warning" size={32} />}
                <div>
                  <p className="text-sm text-gray-600">Connection Status</p>
                  <p className="font-sora font-bold text-2xl text-navy">{isOnline ? 'Online' : 'Offline'}</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-indigo-premium/10 border border-indigo-premium/20 rounded-2xl p-6"
            >
              <div className="flex items-center gap-3">
                <Lock className="text-indigo-premium" size={32} />
                <div>
                  <p className="text-sm text-gray-600">Total Vault Size</p>
                  <p className="font-sora font-bold text-2xl text-navy">{totalSize}</p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* VAULT SECTIONS */}
          <div className="space-y-8">
            {/* LECTURES */}
            <div>
              <h2 className="font-sora font-bold text-2xl text-navy mb-4">
                📚 Lectures ({lectures.length})
              </h2>
              {lectures.length > 0 ? (
                <div className="space-y-3">
                  {lectures.map((item, i) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="bg-white rounded-xl p-4 border border-gray-200 hover:border-indigo-premium/50 transition group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1">
                          <div className="w-10 h-10 rounded-lg bg-indigo-premium/10 flex items-center justify-center">
                            {getIcon(item.type)}
                          </div>
                          <div className="flex-1">
                            <p className="font-sora font-bold text-navy">{item.title}</p>
                            <p className="text-sm text-gray-600">
                              {item.size} • Downloaded {new Date(item.downloadedDate).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition">
                          <button
                            onClick={() => downloadItem(item)}
                            className="p-2 rounded-lg bg-indigo-premium/10 text-indigo-premium hover:bg-indigo-premium/20"
                          >
                            <Download size={18} />
                          </button>
                          <button
                            onClick={() => deleteItem(item.id)}
                            className="p-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                      {item.watermarked && (
                        <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                          <Lock size={12} />
                          Watermarked - Personal use only
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="bg-gray-50 rounded-xl p-8 text-center border border-gray-200">
                  <p className="text-gray-600">No lectures downloaded yet</p>
                </div>
              )}
            </div>

            {/* NOTES */}
            <div>
              <h2 className="font-sora font-bold text-2xl text-navy mb-4">
                📝 Notes ({notes.length})
              </h2>
              {notes.length > 0 ? (
                <div className="space-y-3">
                  {notes.map((item, i) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="bg-white rounded-xl p-4 border border-gray-200 hover:border-purple-premium/50 transition group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1">
                          <div className="w-10 h-10 rounded-lg bg-purple-premium/10 flex items-center justify-center">
                            {getIcon(item.type)}
                          </div>
                          <div className="flex-1">
                            <p className="font-sora font-bold text-navy">{item.title}</p>
                            <p className="text-sm text-gray-600">
                              {item.size} • Downloaded {new Date(item.downloadedDate).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition">
                          <button
                            onClick={() => downloadItem(item)}
                            className="p-2 rounded-lg bg-purple-premium/10 text-purple-premium hover:bg-purple-premium/20"
                          >
                            <Download size={18} />
                          </button>
                          <button
                            onClick={() => deleteItem(item.id)}
                            className="p-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="bg-gray-50 rounded-xl p-8 text-center border border-gray-200">
                  <p className="text-gray-600">No notes downloaded yet</p>
                </div>
              )}
            </div>

            {/* QUIZZES */}
            <div>
              <h2 className="font-sora font-bold text-2xl text-navy mb-4">
                🧪 Quizzes ({quizzes.length})
              </h2>
              {quizzes.length > 0 ? (
                <div className="space-y-3">
                  {quizzes.map((item, i) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="bg-white rounded-xl p-4 border border-gray-200 hover:border-mint/50 transition group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1">
                          <div className="w-10 h-10 rounded-lg bg-mint/10 flex items-center justify-center">
                            {getIcon(item.type)}
                          </div>
                          <div className="flex-1">
                            <p className="font-sora font-bold text-navy">{item.title}</p>
                            <p className="text-sm text-gray-600">
                              {item.size} • Downloaded {new Date(item.downloadedDate).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition">
                          <button
                            onClick={() => downloadItem(item)}
                            className="p-2 rounded-lg bg-mint/10 text-mint hover:bg-mint/20"
                          >
                            <Download size={18} />
                          </button>
                          <button
                            onClick={() => deleteItem(item.id)}
                            className="p-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="bg-gray-50 rounded-xl p-8 text-center border border-gray-200">
                  <p className="text-gray-600">No quizzes downloaded yet</p>
                </div>
              )}
            </div>
          </div>

          {/* SECURITY INFO */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-indigo-premium to-purple-premium rounded-2xl p-8 text-white"
          >
            <div className="flex items-start gap-4">
              <Lock className="flex-shrink-0 mt-1" size={24} />
              <div>
                <h3 className="font-sora font-bold text-xl mb-2">Your Data is Protected</h3>
                <p className="text-white/90 mb-3">
                  All offline content is stored locally on your device with watermarking to prevent unauthorized sharing. No data is sent to external servers.
                </p>
                <p className="text-sm text-white/70">✓ Encrypted storage • ✓ Personal use only • ✓ Auto-sync when online</p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}
