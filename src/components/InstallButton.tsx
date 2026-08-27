import { Check } from 'lucide-react'
import { usePWAInstall } from '../hooks/usePWAInstall'

interface Props {
  variant?: 'hero' | 'compact'
}

// Back to the simple model: show a button only when the browser has
// actually offered a native install prompt. Tap it, the browser's own
// install dialog fires immediately — no instructions, no fallback UI.
// If the browser never offers it (unsupported, already dismissed, or
// already installed on this run), nothing renders at all.
export default function InstallButton({ variant = 'compact' }: Props) {
  const { isInstalled, canPromptInstall, isInstalling, install } = usePWAInstall()

  if (isInstalled) {
    if (variant === 'compact') return null
    return (
      <div className="flex items-center gap-2 text-mint text-sm font-semibold">
        <Check size={16} /> STUDIA AI installed
      </div>
    )
  }

  if (!canPromptInstall) return null

  const heroClasses = 'flex items-center justify-center gap-2 bg-gradient-to-r from-mint to-light-blue text-white px-8 py-4 rounded-xl font-bold text-base hover:opacity-90 transition disabled:opacity-50 shadow-lg shadow-mint/25'
  const compactClasses = 'flex items-center gap-1.5 bg-gradient-to-r from-mint to-light-blue text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:opacity-90 transition disabled:opacity-50'

  return (
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
  )
}
