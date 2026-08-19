import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: false,
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        globPatterns: ['**/*.{js,css,html,ico}'],
        navigateFallbackDenylist: [/^\/api/, /^\/icon/, /^\/manifest/],
      },
      includeAssets: ['icon-192.png', 'icon-512.png', 'icon-maskable.png'],
    }),
  ],
})
