import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import { handleDirections } from './api/directions.ts'

/**
 * Middleware Vite, które pozwala testować `/api/directions` lokalnie w
 * `npm run dev` bez wdrażania serverless function na Vercel — woła tę samą
 * logikę (`handleDirections`) co produkcyjny `api/directions.ts`. Token
 * Mapbox jest czytany z `.env` (klucz `MAPBOX_TOKEN`, BEZ prefiksu `VITE_` —
 * dzięki temu Vite nigdy nie wstrzykuje go do kodu front-endowego).
 */
function devApiMiddleware(mapboxToken: string | undefined): Plugin {
  return {
    name: 'tachoplan-dev-api',
    configureServer(server) {
      server.middlewares.use('/api/directions', (req, res, next) => {
        if (req.method !== 'POST') return next()
        let body = ''
        req.on('data', (chunk) => (body += chunk))
        req.on('end', async () => {
          try {
            const parsed = body ? JSON.parse(body) : {}
            const result = await handleDirections(parsed, mapboxToken)
            res.statusCode = result.status
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify(result.json))
          } catch (err) {
            res.statusCode = 500
            res.end(JSON.stringify({ error: String(err) }))
          }
        })
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // Na GitHub Pages aplikacja jest serwowana z podścieżki
  // (np. https://<user>.github.io/tachoplan/), nie z domeny root — stąd
  // `base`. Lokalnie (`npm run dev`) i tak działa pod "/".
  const base = env.GITHUB_PAGES === 'true' ? '/tachoplan/' : '/'

  return {
  base,
  plugins: [
    react(),
    devApiMiddleware(env.MAPBOX_TOKEN),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon-32.png', 'apple-touch-icon.png'],
      manifest: {
        id: base,
        name: 'TachoPlan — planowanie tras kierowcy',
        short_name: 'TachoPlan',
        description:
          'Planowanie trasy zgodnie z czasem jazdy i odpoczynku kierowcy transportu drogowego.',
        lang: 'pl',
        // Relatywne do `base` — vite-plugin-pwa dopisuje `base` samo, więc
        // manifest działa poprawnie zarówno w "/" (dev), jak i pod
        // podścieżką GitHub Pages.
        start_url: '.',
        scope: '.',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0a0f1c',
        theme_color: '#0a0f1c',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          {
            src: 'icons/icon-maskable-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: 'icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,ico,woff2}'],
        navigateFallback: 'index.html',
      },
      devOptions: {
        enabled: true,
        type: 'module',
      },
    }),
  ],
  }
})
