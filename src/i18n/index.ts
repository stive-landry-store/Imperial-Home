import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { en } from './en'
import { fr } from './fr'
import ar from './packs/ar'
import de from './packs/de'
import bn from './packs/bn'
import es from './packs/es'
import hi from './packs/hi'
import pt from './packs/pt'
import ru from './packs/ru'
import ur from './packs/ur'
import zh from './packs/zh'
import { languageCode, type LanguageCode } from '../lib/languages'

const RTL = new Set(['ar', 'ur'])

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

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    fr: { translation: fr },
    zh: { translation: zh },
    hi: { translation: hi },
    es: { translation: es },
    ar: { translation: ar },
    de: { translation: de },
    bn: { translation: bn },
    pt: { translation: pt },
    ru: { translation: ru },
    ur: { translation: ur },
  },
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
