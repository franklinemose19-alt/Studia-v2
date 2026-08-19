import { useState, useEffect, useCallback } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

type PlatformHint = 'ios' | 'android' | 'desktop' | 'unknown'

function detectPlatform(): PlatformHint {
  if (typeof navigator === 'undefined') return 'unknown'
  const ua = navigator.userAgent || ''
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream
  if (isIOS) return 'ios'
  if (/Android/.test(ua)) return 'android'
  if (/Win|Mac|Linux/.test(navigator.platform || '')) return 'desktop'
  return 'unknown'
}

function checkStandaloneMode(): boolean {
  if (typeof window === 'undefined') return false
  const mqMatch = window.matchMedia?.('(display-mode: standalone)').matches
  const iosStandalone = (window.navigator as any).standalone === true
  return !!mqMatch || iosStandalone
}

// Legacy keys an earlier version of this hook may have written to mark
// "installed" permanently — this is the actual bug. Clearing them once
// on mount guarantees a stale flag can never override the live signals below.
const LEGACY_KEYS = [
  'pwa_installed', 'pwaInstalled', 'pwa-installed', 'studia_pwa_installed',
  'pwaInstallDismissed', 'pwa_install_dismissed',
]

export function usePWAInstall() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isInstalling, setIsInstalling] = useState(false)
  const [platformHint] = useState<PlatformHint>(() => detectPlatform())

  useEffect(() => {
    LEGACY_KEYS.forEach(k => { try { localStorage.removeItem(k) } catch {} })

    setIsInstalled(checkStandaloneMode())

    const mq = window.matchMedia('(display-mode: standalone)')
    const handleDisplayModeChange = () => setIsInstalled(checkStandaloneMode())
    mq.addEventListener?.('change', handleDisplayModeChange)

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setInstallPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    const handleAppInstalled = () => {
      setIsInstalled(true)
      setInstallPrompt(null)
    }
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      mq.removeEventListener?.('change', handleDisplayModeChange)
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const install = useCallback(async () => {
    if (!installPrompt) return
    setIsInstalling(true)
    try {
      await installPrompt.prompt()
      await installPrompt.userChoice
      // The 'appinstalled' listener above sets isInstalled if accepted.
      // A deferred prompt can only ever be used once — clear it either way.
    } finally {
      setInstallPrompt(null)
      setIsInstalling(false)
    }
  }, [installPrompt])

  return {
    installPrompt,
    isInstalled,
    isInstalling,
    canPromptInstall: !isInstalled && !!installPrompt,
    showManualInstructions: !isInstalled && !installPrompt,
    platformHint,
    install,
  }
}
