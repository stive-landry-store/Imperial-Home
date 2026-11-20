import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { en } from './en'
import { fr } from './fr'
import type { BackendModule, ResourceKey } from 'i18next'
import { languageCode, type LanguageCode } from '../lib/languages'

const RTL = new Set(['ar', 'ur'])

// English and French ship with the first page; the nine other languages download only when chosen.
const packs: Record<string, () => Promise<{ default: ResourceKey }>> = {
  ar: () => import('./packs/ar'),
  bn: () => import('./packs/bn'),
  de: () => import('./packs/de'),
  es: () => import('./packs/es'),
  hi: () => import('./packs/hi'),
  pt: () => import('./packs/pt'),
  ru: () => import('./packs/ru'),
  ur: () => import('./packs/ur'),
  zh: () => import('./packs/zh'),
}

const lazyPacks: BackendModule = {
  type: 'backend',
  init: () => undefined,
  read: (language, _namespace, callback) => {
    const load = packs[language]
    if (!load) {
      callback(null, {})
      return
    }
    load()
      .then((module) => callback(null, module.default))
      .catch((error: Error) => callback(error, null))
  },
}

function detect(): LanguageCode {
  if (typeof navigator === 'undefined') return 'fr'
  return languageCode(navigator.language)
}

const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('ih-lang') : null
const initial = saved ? languageCode(saved) : detect()

function applyDocument(code: LanguageCode) {
  document.documentElement.lang = code
  document.documentElement.dir = RTL.has(code) ? 'rtl' : 'ltr'
}

void i18n.use(lazyPacks).use(initReactI18next).init({
  resources: {
    en: { translation: en },
    fr: { translation: fr },
  },
  partialBundledLanguages: true,
  react: { useSuspense: false },
  lng: initial,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
})

applyDocument(languageCode(i18n.language))

i18n.on('languageChanged', (lng) => {
  const next = languageCode(lng)
  localStorage.setItem('ih-lang', next)
  applyDocument(next)
})

export default i18n
