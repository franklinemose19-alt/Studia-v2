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

    // Some browsers don't reliably fire the standalone media-query change —
    // re-check whenever the tab regains focus as a backup signal.
    const handleVisibility = () => { if (document.visibilityState === 'visible') setIsInstalled(checkStandaloneMode()) }
    document.addEventListener('visibilitychange', handleVisibility)

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      console.log('[PWA] beforeinstallprompt captured — native install genuinely available')
      setInstallPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    const handleAppInstalled = () => {
      console.log('[PWA] appinstalled fired — now running standalone')
      setIsInstalled(true)
      setInstallPrompt(null)
    }
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      mq.removeEventListener?.('change', handleDisplayModeChange)
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const install = useCallback(async () => {
    if (!installPrompt) {
      console.warn('[PWA] install() called with no captured prompt — should be unreachable from the UI')
      return
    }
    setIsInstalling(true)
    try {
      await installPrompt.prompt()
      const choice = await installPrompt.userChoice
      console.log('[PWA] userChoice:', choice.outcome)
    } finally {
      setInstallPrompt(null)
      setIsInstalling(false)
    }
  }, [installPrompt])

  // Self-serve escape hatch for a device stuck with a stale install identity —
  // wipes every service worker + cache for this origin, then reloads clean.
  const resetAndRetry = useCallback(async () => {
    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations()
        await Promise.all(regs.map(r => r.unregister()))
      }
      if ('caches' in window) {
        const keys = await caches.keys()
        await Promise.all(keys.map(k => caches.delete(k)))
      }
    } finally {
      window.location.reload()
    }
  }, [])

  return {
    installPrompt,
    isInstalled,
    isInstalling,
    canPromptInstall: !isInstalled && !!installPrompt,
    showManualInstructions: !isInstalled && !installPrompt,
    platformHint,
    install,
    resetAndRetry,
  }
}
