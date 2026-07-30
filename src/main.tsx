import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { registerSW } from 'virtual:pwa-register'
import ToastContainer from './components/Toast.tsx'

registerSW({
  immediate: true,
  onNeedRefresh() {
    console.log('STUDIA AI updated — refresh for latest version')
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
