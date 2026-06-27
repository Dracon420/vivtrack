import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/**', 'data/species.json'],
      manifest: {
        name: 'VivTrack — Exotic Pet Tracker',
        short_name: 'VivTrack',
        description: 'Complete care tracking for all your exotic pets',
        theme_color: '#059669',
        background_color: '#030712',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        id: '/vivtrack',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        shortcuts: [
          { name: 'Log Feeding', url: '/animals?action=log&type=feeding' },
          { name: 'Scan Enclosure', url: '/scanner' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
        runtimeCaching: [
          {
            urlPattern: /\/data\/species\.json/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'species-data',
              expiration: { maxEntries: 1, maxAgeSeconds: 31536000 },
            },
          },
        ],
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/__/],
      },
      devOptions: { enabled: false },
    }),
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
})
