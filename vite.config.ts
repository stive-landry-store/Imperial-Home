/// <reference types="vitest/config" />
// Imperial Home — build configuration.
// Conçu par stive landry store (NYAMI TCHOUPE STIVE LANDRY).
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Plugin } from 'vite'

const DEFAULT_SITE = 'https://imperial-home.vercel.app'

/** Replaces __SITE_URL__ in index.html with the configured public address (custom domain). */
function siteUrl(site: string): Plugin {
  return {
    name: 'imperial-site-url',
    transformIndexHtml: (html) => html.replaceAll('__SITE_URL__', site),
  }
}

/** Gives the service-worker caches a name tied to this build, so a deploy never serves stale files. */
function serviceWorkerVersion(): Plugin {
  let outDir = 'dist'
  return {
    name: 'imperial-sw-version',
    apply: 'build',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir)
    },
    closeBundle() {
      const file = resolve(outDir, 'sw.js')
      const html = resolve(outDir, 'index.html')
      if (!existsSync(file) || !existsSync(html)) return
      const hash = createHash('sha256').update(readFileSync(html)).update(String(Date.now())).digest('hex').slice(0, 10)
      writeFileSync(file, readFileSync(file, 'utf8').replaceAll('__BUILD_ID__', hash))
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const site = (env.VITE_SITE_URL || env.SITE_URL || DEFAULT_SITE).replace(/\/$/, '')
  return {
    base: env.VITE_BASE || '/',
    plugins: [react(), tailwindcss(), siteUrl(site), serviceWorkerVersion()],
    define: {
      'import.meta.env.VITE_SITE_URL': JSON.stringify(site),
    },
    server: {
      port: 5173,
      host: true,
      strictPort: false,
    },
    test: {
      environment: 'node',
      exclude: ['e2e/**', 'node_modules/**'],
    },
  }
})
