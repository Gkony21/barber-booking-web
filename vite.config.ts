/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // Makes the site installable on phones ("Add to Home screen") and caches the app shell.
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'FADE — Κλείσε ραντεβού',
        short_name: 'FADE',
        description: 'Κλείσε ραντεβού με τον barber σου σε δευτερόλεπτα.',
        lang: 'el',
        theme_color: '#111214',
        background_color: '#111214',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // API responses are never cached: availability must always be live.
        navigateFallbackDenylist: [/^\/api/],
      },
    }),
  ],
  // `npm run demo`: the built app plus the API on one address, so a single Cloudflare tunnel
  // (https://….trycloudflare.com) can show it on any phone. The app calls /api, passed to the
  // API on this machine with the visitor's address, so rate limits apply per person.
  preview: {
    host: true,
    allowedHosts: ['.trycloudflare.com'],
    proxy: {
      '/api': { target: 'http://localhost:8080', rewrite: (path) => path.replace(/^\/api/, ''), xfwd: true },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
})
