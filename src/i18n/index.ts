import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { en } from './en'
import { fr } from './fr'

const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('ih-lang') : null
const browser =
  typeof navigator !== 'undefined' && navigator.language.toLowerCase().startsWith('fr') ? 'fr' : 'en'

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    fr: { translation: fr },
  },
  lng: saved === 'en' || saved === 'fr' ? saved : browser,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
})

document.documentElement.lang = i18n.language.startsWith('fr') ? 'fr' : 'en'

i18n.on('languageChanged', (lng) => {
  const next = lng.startsWith('fr') ? 'fr' : 'en'
  localStorage.setItem('ih-lang', next)
  document.documentElement.lang = next
})

export default i18n
