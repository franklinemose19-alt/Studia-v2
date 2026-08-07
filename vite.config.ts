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
        globPatterns: ['**/*.{js,css,html}'],
        navigateFallbackDenylist: [/^\/api/, /^\/icon/, /^\/manifest/],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com/,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts' },
          },
        ],
      },
      includeAssets: ['icon-192.png', 'icon-512.png', 'icon-maskable.png'],
    }),
  ],
})
