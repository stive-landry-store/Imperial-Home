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

/**
 * Content-Security-Policy for the built page: only this site's own scripts (inline ones pinned by
 * their SHA-256) and the few services the app really uses may run. Injected as a <meta> tag so the
 * service worker keeps its own network rules. Dev mode is left alone (Vite injects its own scripts).
 */
function contentSecurityPolicy(supabaseUrl: string): Plugin {
  return {
    name: 'imperial-csp',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        const hashes: string[] = []
        html.replace(/<script(?![^>]*src=)(?![^>]*application\/ld\+json)[^>]*>([\s\S]*?)<\/script>/g, (_tag, body: string) => {
          hashes.push(`'sha256-${createHash('sha256').update(body, 'utf8').digest('base64')}'`)
          return _tag
        })
        let supabase = ''
        let supabaseWs = ''
        try {
          const origin = new URL(supabaseUrl).origin
          supabase = origin
          supabaseWs = origin.replace(/^https:/, 'wss:')
        } catch {
          supabase = 'https://*.supabase.co'
          supabaseWs = 'wss://*.supabase.co'
        }
        const policy = [
          "default-src 'self'",
          `script-src 'self' ${hashes.join(' ')} https://challenges.cloudflare.com https://vercel.live`,
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
          "font-src 'self' data: https://fonts.gstatic.com",
          "img-src 'self' data: blob: https:",
          "media-src 'self' blob: https:",
          `connect-src 'self' ${supabase} ${supabaseWs} https://*.sentry.io https://challenges.cloudflare.com https://vercel.live wss://ws-us3.pusher.com`,
          'frame-src https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com https://challenges.cloudflare.com https://vercel.live',
          "worker-src 'self' blob:",
          "manifest-src 'self'",
          "object-src 'none'",
          "base-uri 'self'",
          "form-action 'self'",
          'upgrade-insecure-requests',
        ].join('; ')
        return html.replace(/<meta charset="UTF-8" \/>/i, (charset) => `${charset}
    <meta http-equiv="Content-Security-Policy" content="${policy}" />`)
      },
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const site = (env.VITE_SITE_URL || env.SITE_URL || DEFAULT_SITE).replace(/\/$/, '')
  return {
    base: env.VITE_BASE || '/',
    plugins: [react(), tailwindcss(), siteUrl(site), serviceWorkerVersion(), contentSecurityPolicy(env.VITE_SUPABASE_URL || '')],
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
