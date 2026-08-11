import { motion, AnimatePresence } from 'framer-motion'
import { Camera, Image, FileText, BookOpen, Layers, ClipboardList, Search, Compass, X } from 'lucide-react'

export type SageTool = 'camera' | 'image' | 'file' | 'deepnotes' | 'flashcards' | 'mockexam' | 'knowledgegap' | 'coach'

interface Props {
  open: boolean
  onClose: () => void
  onSelect: (tool: SageTool) => void
}

const TOOLS: { id: SageTool; label: string; icon: any; desc: string }[] = [
  { id: 'camera', label: 'Camera', icon: Camera, desc: 'Snap a question or page' },
  { id: 'image', label: 'Upload Image', icon: Image, desc: 'Choose from gallery' },
  { id: 'file', label: 'Upload PDF', icon: FileText, desc: 'Past paper or document' },
  { id: 'deepnotes', label: 'Deep Notes', icon: BookOpen, desc: 'Expand current lecture' },
  { id: 'flashcards', label: 'Flashcards', icon: Layers, desc: 'From current lecture' },
  { id: 'mockexam', label: 'Exam Generator', icon: ClipboardList, desc: 'Practice exam' },
  { id: 'knowledgegap', label: 'Gap Detector', icon: Search, desc: "What you're missing" },
  { id: 'coach', label: 'Study Coach', icon: Compass, desc: 'Progress check-in' },
]

export default function SageToolsMenu({ open, onClose, onSelect }: Props) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-[100]"
          />
          <motion.div
            initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="fixed left-0 right-0 bottom-0 z-[110] bg-surface-elevated border-t border-white/10 rounded-t-3xl max-w-3xl mx-auto pb-[env(safe-area-inset-bottom,0px)]"
          >
            <div className="w-10 h-1 bg-white/15 rounded-full mx-auto mt-3" />
            <div className="flex items-center justify-between px-4 py-2">
              <span className="text-xs text-[#8B97B5]">SAGE Tools</span>
              <button onClick={onClose} className="p-1.5 rounded-lg text-[#8B97B5] hover:text-white hover:bg-white/5 transition">
                <X size={16} />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2 p-4 pt-1">
              {TOOLS.map(t => (
                <button key={t.id} onClick={() => onSelect(t.id)}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-surface-base border border-white/5 hover:border-brand-blue/40 hover:bg-brand-blue/5 transition text-center">
                  <div className="w-9 h-9 rounded-xl bg-brand-blue/10 flex items-center justify-center">
                    <t.icon size={17} className="text-brand-blue" />
                  </div>
                  <p className="text-[11px] font-medium text-white leading-tight">{t.label}</p>
                  <p className="text-[9px] text-[#8B97B5] leading-tight">{t.desc}</p>
                </button>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
