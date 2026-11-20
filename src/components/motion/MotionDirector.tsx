import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * Imperial Home — motion director.
 * Conçu par stive landry store (NYAMI TCHOUPE STIVE LANDRY).
 *
 * Brings the whole site to life without touching every page:
 *  - tags headings, sections, cards, list items, forms and media with a scroll reveal,
 *    staggered inside grids and rails;
 *  - drives the gold scroll-progress bar, the condensing header and hero parallax;
 *  - adds pointer-follow light and a subtle tilt on cards, and a ripple on buttons;
 *  - counts numbers up when they appear ([data-count]).
 * Nothing runs when the visitor asked the system for reduced motion.
 */

const AUTO_SELECTORS = [
  '.theme-page h1',
  '.theme-page h2',
  '.theme-page h3',
  '.theme-page section > div > p',
  '.theme-page .theme-card',
  '.theme-page article',
  '.theme-page form',
  '.theme-page table',
  '.theme-page [class*="grid-cols"] > *',
  '.theme-page [class*="overflow-x-auto"] > *',
  '.theme-page ul > li',
  '.theme-page .ih-card',
  'main h1',
  'main h2',
  'main .theme-card',
  'main [class*="grid-cols"] > *',
  'main table',
].join(',')

const SKIP = 'header, nav, footer nav, [role="dialog"], .ih-chat, [data-no-reveal], .ih-hero, .fixed, .sticky, #ih-boot'
const MAX_STAGGER = 8

function kindFor(el: Element): string {
  const tag = el.tagName
  if (tag === 'H1' || tag === 'H2' || tag === 'H3') return 'up'
  if (tag === 'IMG' || tag === 'VIDEO' || tag === 'FIGURE') return 'blur'
  if (el.classList.contains('theme-card') || el.classList.contains('ih-card')) return 'up'
  if (tag === 'TABLE' || tag === 'FORM') return 'fade'
  return 'up'
}

function staggerIndex(el: Element): number {
  const parent = el.parentElement
  if (!parent) return 0
  const siblings = Array.from(parent.children).filter((child) => child.hasAttribute('data-reveal'))
  return Math.min(MAX_STAGGER, Math.max(0, siblings.indexOf(el)))
}

function animateCount(el: HTMLElement) {
  const target = Number(el.dataset.count)
  if (!Number.isFinite(target) || el.dataset.counted === '1') return
  el.dataset.counted = '1'
  const format = new Intl.NumberFormat(document.documentElement.lang || 'fr')
  const start = performance.now()
  const duration = 1400
  const tick = (time: number) => {
    const progress = Math.min(1, (time - start) / duration)
    const eased = 1 - Math.pow(1 - progress, 4)
    el.textContent = `${el.dataset.prefix ?? ''}${format.format(Math.round(target * eased))}${el.dataset.suffix ?? ''}`
    if (progress < 1) requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}

export function MotionDirector() {
  const location = useLocation()

  // Reveal + stagger, re-scanned whenever the DOM changes (pages load data after rendering).
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (reduce.matches || typeof IntersectionObserver === 'undefined') return
    const root = document.documentElement
    root.classList.add('ih-motion')

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          const el = entry.target as HTMLElement
          el.classList.add('is-revealed')
          observer.unobserve(el)
          if (el.dataset.count) animateCount(el)
          el.querySelectorAll<HTMLElement>('[data-count]').forEach(animateCount)
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
    )

    const seen = new WeakSet<Element>()
    const scan = () => {
      document.querySelectorAll(AUTO_SELECTORS).forEach((el) => {
        if (el.closest(SKIP) || el.hasAttribute('data-reveal')) return
        el.setAttribute('data-reveal', kindFor(el))
      })
      document.querySelectorAll<HTMLElement>('[data-reveal]:not(.is-revealed), [data-count]').forEach((el) => {
        if (seen.has(el)) return
        seen.add(el)
        el.style.setProperty('--ih-i', String(staggerIndex(el)))
        observer.observe(el)
      })
    }

    let frame = 0
    const schedule = () => {
      if (frame) return
      frame = requestAnimationFrame(() => {
        frame = 0
        scan()
      })
    }
    scan()
    const mutations = new MutationObserver(schedule)
    mutations.observe(document.body, { childList: true, subtree: true })

    // Safety net: anything still hidden after a while (e.g. inside a hidden tab that opened) shows up.
    const safety = window.setInterval(() => {
      document.querySelectorAll<HTMLElement>('[data-reveal]:not(.is-revealed)').forEach((el) => {
        const box = el.getBoundingClientRect()
        if (box.width && box.top < window.innerHeight && box.bottom > 0) el.classList.add('is-revealed')
      })
    }, 1500)

    const onReduce = () => {
      if (reduce.matches) root.classList.remove('ih-motion')
    }
    reduce.addEventListener('change', onReduce)
    return () => {
      cancelAnimationFrame(frame)
      window.clearInterval(safety)
      mutations.disconnect()
      observer.disconnect()
      reduce.removeEventListener('change', onReduce)
    }
  }, [])

  // Scroll: progress bar, header state, hero parallax.
  useEffect(() => {
    const root = document.documentElement
    const bar = document.createElement('div')
    bar.className = 'ih-progress'
    bar.setAttribute('aria-hidden', 'true')
    document.body.appendChild(bar)
    let last = window.scrollY
    let frame = 0
    const update = () => {
      frame = 0
      const y = window.scrollY
      const max = Math.max(1, root.scrollHeight - window.innerHeight)
      bar.style.setProperty('--ih-scroll', String(Math.min(1, y / max)))
      root.style.setProperty('--ih-scroll-px', String(Math.min(y, 1200)))
      root.classList.toggle('ih-scrolled', y > 12)
      root.classList.toggle('ih-scroll-down', y > last && y > 240)
      last = y
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
      bar.remove()
    }
  }, [])

  // Pointer: light that follows the cursor on cards, gentle tilt, ripple on buttons.
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches
    const onMove = (event: PointerEvent) => {
      if (!fine) return
      const card = (event.target as Element | null)?.closest?.('.ih-card') as HTMLElement | null
      if (!card) return
      const box = card.getBoundingClientRect()
      const x = (event.clientX - box.left) / box.width
      const y = (event.clientY - box.top) / box.height
      card.style.setProperty('--ih-mx', `${x * 100}%`)
      card.style.setProperty('--ih-my', `${y * 100}%`)
      card.style.setProperty('--ih-ry', `${(x - 0.5) * 6}deg`)
      card.style.setProperty('--ih-rx', `${(0.5 - y) * 6}deg`)
    }
    const onLeave = (event: PointerEvent) => {
      const card = (event.target as Element | null)?.closest?.('.ih-card') as HTMLElement | null
      if (!card || card.contains(event.relatedTarget as Node | null)) return
      card.style.removeProperty('--ih-rx')
      card.style.removeProperty('--ih-ry')
    }
    const onDown = (event: PointerEvent) => {
      const button = (event.target as Element | null)?.closest?.('.ih-btn') as HTMLElement | null
      if (!button || (button as HTMLButtonElement).disabled) return
      const box = button.getBoundingClientRect()
      const size = Math.max(box.width, box.height)
      const ripple = document.createElement('span')
      ripple.className = 'ih-ripple'
      ripple.style.width = ripple.style.height = `${size / 2}px`
      ripple.style.left = `${event.clientX - box.left - size / 4}px`
      ripple.style.top = `${event.clientY - box.top - size / 4}px`
      button.appendChild(ripple)
      window.setTimeout(() => ripple.remove(), 650)
    }
    document.addEventListener('pointermove', onMove, { passive: true })
    document.addEventListener('pointerout', onLeave, { passive: true })
    document.addEventListener('pointerdown', onDown, { passive: true })
    return () => {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerout', onLeave)
      document.removeEventListener('pointerdown', onDown)
    }
  }, [])

  // On each route, start the progress bar back at the top.
  useEffect(() => {
    document.documentElement.classList.remove('ih-scroll-down')
  }, [location.pathname])

  return null
}
