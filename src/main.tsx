import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { registerSW } from 'virtual:pwa-register'
import ToastContainer from './components/Toast.tsx'

const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    // Actually apply the update instead of just logging it — this is the
    // piece that was missing, and it's why fixes weren't reliably reaching
    // an already-installed app.
    updateSW(true)
  },
  onOfflineReady() {
    console.log('STUDIA AI is ready for offline use')
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
    <ToastContainer />
  </React.StrictMode>,
)
