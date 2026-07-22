import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      strategies: 'generateSW',

      // Use our own public/manifest.json — don't auto-generate one
      manifest: false,

      // Tell Vite to include these assets in the build output
      includeAssets: [
        'icon-192.png',
        'icon-512.png',
        'icon-maskable.png',
        'manifest.json',
      ],

      workbox: {
        // Cache all app assets
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],

        // Use index.html as offline fallback for navigation requests
        navigateFallback: 'index.html',

        // Never intercept these as navigation requests —
        // serve them as real files
        navigateFallbackDenylist: [
          /^\/icon-.*\.png$/,
          /^\/manifest\.json$/,
          /^\/api\//,
          /^\/icons\//,
        ],

        // External API calls — always go to network, never cache
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.openai\.com\/.*/i,
            handler: 'NetworkOnly',
          },
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkOnly',
          },
          {
            urlPattern: /^https:\/\/sandbox\.safaricom\.co\.ke\/.*/i,
            handler: 'NetworkOnly',
          },
          {
            urlPattern: /^https:\/\/api\.safaricom\.co\.ke\/.*/i,
            handler: 'NetworkOnly',
          },
        ],
      },
    }),
  ],
})
