import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import { X, Plus, MessageSquare, MoreVertical, Pencil, Trash2, Check } from 'lucide-react'
import type { SageConversation } from '../../lib/sageConversations'

interface Props {
  open: boolean
  onClose: () => void
  conversations: SageConversation[]
  activeId: number | null
  onSelect: (id: number) => void
  onNewChat: () => void
  onRename: (id: number, title: string) => void
  onDelete: (id: number) => void
  loading: boolean
}

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'now'
  if (s < 3600) return `${Math.floor(s / 60)}m`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  if (s < 604800) return `${Math.floor(s / 86400)}d`
  return new Date(iso).toLocaleDateString()
}

export default function SageSidebar({ open, onClose, conversations, activeId, onSelect, onNewChat, onRename, onDelete, loading }: Props) {
  const [menuFor, setMenuFor] = useState<number | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const [renamingId, setRenamingId] = useState<number | null>(null)
  const [renameValue, setRenameValue] = useState('')

  const startRename = (c: SageConversation) => {
    setRenamingId(c.id)
    setRenameValue(c.title)
    setMenuFor(null)
  }

  const confirmRename = (id: number) => {
    const val = renameValue.trim()
    if (val) onRename(id, val)
    setRenamingId(null)
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose} className="fixed inset-0 bg-black/60 z-40" />
          <motion.div initial={{ x: -300 }} animate={{ x: 0 }} exit={{ x: -300 }} transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed left-0 top-0 bottom-0 w-72 bg-surface-elevated border-r border-white/10 z-50 flex flex-col">

            <div className="flex items-center justify-between px-4 h-16 border-b border-white/5 shrink-0">
              <span className="font-sora font-bold text-white">SAGE</span>
              <button onClick={onClose} className="p-1.5 rounded-lg text-[#8B97B5] hover:text-white hover:bg-white/5"><X size={18} /></button>
            </div>

            <div className="p-3 shrink-0">
              <button onClick={() => { onNewChat(); onClose() }}
                className="w-full flex items-center gap-2 bg-brand-blue text-white px-3 py-2.5 rounded-xl text-sm font-semibold hover:bg-brand-blue/90 transition">
                <Plus size={16} /> New Chat
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-0.5">
              {loading ? (
                <p className="text-xs text-[#8B97B5] text-center py-6">Loading...</p>
              ) : conversations.length === 0 ? (
                <p className="text-xs text-[#8B97B5] text-center py-6 px-3">No conversations yet — start one above.</p>
              ) : conversations.map(c => (
                <div key={c.id} className={`group relative rounded-xl transition ${activeId === c.id ? 'bg-brand-blue/15' : 'hover:bg-white/5'}`}>
                  {renamingId === c.id ? (
                    <div className="flex items-center gap-1.5 px-3 py-2.5">
                      <input autoFocus value={renameValue} onChange={e => setRenameValue(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') confirmRename(c.id); if (e.key === 'Escape') setRenamingId(null) }}
                        className="flex-1 bg-surface-base border border-brand-blue/40 rounded-lg px-2 py-1 text-xs text-white outline-none min-w-0" />
                      <button onClick={() => confirmRename(c.id)} className="text-mint shrink-0"><Check size={14} /></button>
                    </div>
                  ) : (
                    <button onClick={() => { onSelect(c.id); onClose() }} className="w-full text-left px-3 py-2.5 flex items-center gap-2">
                      <MessageSquare size={13} className="text-[#8B97B5] shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs truncate ${activeId === c.id ? 'text-white font-medium' : 'text-[#C5CCDE]'}`}>{c.title}</p>
                        <p className="text-[10px] text-[#4A5568]">{timeAgo(c.updated_at)}</p>
                      </div>
                      <span onClick={e => { e.stopPropagation(); setMenuFor(menuFor === c.id ? null : c.id); setConfirmDeleteId(null) }}
                        className="p-1 rounded-md text-[#4A5568] hover:text-white opacity-0 group-hover:opacity-100 transition shrink-0">
                        <MoreVertical size={13} />
                      </span>
                    </button>
                  )}

                  {menuFor === c.id && (
                    <div className="absolute right-2 top-9 z-10 bg-surface-base border border-white/10 rounded-xl overflow-hidden shadow-xl w-36">
                      <button onClick={() => startRename(c)} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[#C5CCDE] hover:bg-white/5">
                        <Pencil size={12} /> Rename
                      </button>
                      {confirmDeleteId === c.id ? (
                        <button onClick={() => { onDelete(c.id); setMenuFor(null); setConfirmDeleteId(null) }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 font-semibold">
                          <Trash2 size={12} /> Confirm delete
                        </button>
                      ) : (
                        <button onClick={() => setConfirmDeleteId(c.id)} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10">
                          <Trash2 size={12} /> Delete
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
