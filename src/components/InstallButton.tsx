import { useState } from 'react'
import { Check, Download, Share, PlusSquare, MoreVertical, X, RotateCcw } from 'lucide-react'
import { usePWAInstall } from '../hooks/usePWAInstall'

interface Props {
  variant?: 'hero' | 'compact'
}

export default function InstallButton({ variant = 'compact' }: Props) {
  const { isInstalled, canPromptInstall, showManualInstructions, isInstalling, install, resetAndRetry, platformHint } = usePWAInstall()
  const [showInstructions, setShowInstructions] = useState(false)

  const handleReset = () => {
    const ok = window.confirm("This clears STUDIA's installed app data on this device and reloads the page so you can install fresh. Continue?")
    if (ok) resetAndRetry()
  }

  if (isInstalled) {
    if (variant === 'compact') return null
    return (
      <div className="flex items-center gap-2 text-mint text-sm font-semibold">
        <Check size={16} /> STUDIA AI installed
      </div>
    )
  }

  if (canPromptInstall) {
    const heroClasses = 'flex items-center gap-2 bg-gradient-to-r from-mint to-light-blue text-white px-7 py-3 rounded-xl font-semibold text-sm hover:opacity-90 transition disabled:opacity-50 shadow-md shadow-mint/20'
    const compactClasses = 'flex items-center gap-1.5 bg-gradient-to-r from-mint to-light-blue text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:opacity-90 transition disabled:opacity-50'
    return (
      <div className={variant === 'hero' ? 'flex flex-col items-center gap-2' : 'flex flex-col items-start gap-1'}>
        <button onClick={install} disabled={isInstalling} className={variant === 'hero' ? heroClasses : compactClasses}>
          {isInstalling ? (
            <>
              <div className={`${variant === 'hero' ? 'w-4 h-4' : 'w-3 h-3'} border-2 border-white/30 border-t-white rounded-full animate-spin`} />
              Installing...
            </>
          ) : (
            <>📲 {variant === 'hero' ? 'Install STUDIA AI — Free' : 'Install App'}</>
          )}
        </button>
        {variant === 'hero' && (
          <button onClick={handleReset} className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-600 transition">
            <RotateCcw size={10} /> Installed before but it opened wrong? Reset & retry
          </button>
        )}
      </div>
    )
  }

  if (showManualInstructions) {
    const heroClasses = 'flex items-center gap-2 border-2 border-mint/40 text-mint px-7 py-3 rounded-xl font-semibold text-sm hover:bg-mint/5 transition'
    const compactClasses = 'flex items-center gap-1.5 border border-mint/30 text-mint px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-mint/5 transition'
    return (
      <div className="relative">
        <button onClick={() => setShowInstructions(!showInstructions)} className={variant === 'hero' ? heroClasses : compactClasses}>
          <Download size={variant === 'hero' ? 16 : 13} />
          {variant === 'hero' ? 'How to Install' : 'Install'}
        </button>
        {showInstructions && (
          <div className="absolute z-50 top-full mt-2 left-1/2 -translate-x-1/2 w-72 bg-white rounded-2xl border border-gray-200 shadow-xl p-4 text-left">
            <div className="flex items-center justify-between mb-3">
              <p className="font-sora font-bold text-navy text-sm">Install STUDIA AI</p>
              <button onClick={() => setShowInstructions(false)} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>
            {platformHint === 'ios' ? (
              <ol className="text-xs text-gray-600 space-y-2.5">
                <li className="flex items-start gap-2"><Share size={14} className="text-brand-blue shrink-0 mt-0.5" /> Tap the Share button in Safari</li>
                <li className="flex items-start gap-2"><PlusSquare size={14} className="text-brand-blue shrink-0 mt-0.5" /> Scroll down, tap "Add to Home Screen"</li>
                <li className="flex items-start gap-2"><Check size={14} className="text-brand-blue shrink-0 mt-0.5" /> Tap "Add" to confirm</li>
              </ol>
            ) : (
              <ol className="text-xs text-gray-600 space-y-2.5">
                <li className="flex items-start gap-2"><MoreVertical size={14} className="text-brand-blue shrink-0 mt-0.5" /> Tap the menu (⋮) in your browser</li>
                <li className="flex items-start gap-2"><Download size={14} className="text-brand-blue shrink-0 mt-0.5" /> Tap "Install app" or "Add to Home Screen"</li>
                <li className="flex items-start gap-2"><Check size={14} className="text-brand-blue shrink-0 mt-0.5" /> Confirm to finish</li>
              </ol>
            )}
            <p className="text-[10px] text-gray-400 mt-3 mb-2">Just uninstalled STUDIA AI? Your browser may take a little while before offering the automatic install button again — these manual steps always work in the meantime.</p>
            <button onClick={handleReset} className="flex items-center gap-1 text-[10px] text-brand-blue hover:text-brand-blue/80 font-medium">
              <RotateCcw size={10} /> Had trouble before? Reset & retry
            </button>
          </div>
        )}
      </div>
    )
  }

  return null
}
