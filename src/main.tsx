import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { registerSW } from 'virtual:pwa-register'
import ToastContainer from './components/Toast.tsx'

// If an earlier debugging cycle left more than one service worker
// registered for this origin, that's exactly the kind of state that
// produces "two versions of the app" behavior — one still bound to an
// old, broken manifest. Clear duplicates before registering fresh.
async function cleanupDuplicateServiceWorkers() {
  if (!('serviceWorker' in navigator)) return
  try {
    const regs = await navigator.serviceWorker.getRegistrations()
    if (regs.length > 1) {
      console.warn(`[PWA] Found ${regs.length} service worker registrations — clearing all before re-registering fresh.`)
      await Promise.all(regs.map(r => r.unregister()))
    }
  } catch (err) {
    console.error('[PWA] Service worker cleanup check failed (non-critical):', err)
  }
}

cleanupDuplicateServiceWorkers().finally(() => {
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      updateSW(true)
    },
    onOfflineReady() {
      console.log('STUDIA AI is ready for offline use')
    },
  })
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
    <ToastContainer />
  </React.StrictMode>,
)
