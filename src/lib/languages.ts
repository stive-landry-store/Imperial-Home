export const LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇬🇧', country: 'gb' },
  { code: 'zh', label: '中文', flag: '🇨🇳', country: 'cn' },
  { code: 'hi', label: 'हिन्दी', flag: '🇮🇳', country: 'in' },
  { code: 'es', label: 'Español', flag: '🇪🇸', country: 'es' },
  { code: 'fr', label: 'Français', flag: '🇫🇷', country: 'fr' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪', country: 'de' },
  { code: 'ar', label: 'العربية', flag: '🇸🇦', country: 'sa' },
  { code: 'bn', label: 'বাংলা', flag: '🇧🇩', country: 'bd' },
  { code: 'pt', label: 'Português', flag: '🇧🇷', country: 'br' },
  { code: 'ru', label: 'Русский', flag: '🇷🇺', country: 'ru' },
  { code: 'ur', label: 'اردو', flag: '🇵🇰', country: 'pk' },
] as const

export type LanguageCode = (typeof LANGUAGES)[number]['code']

/** Short label for the floating button: "Fr", "En", "Zh". */
export function languageShort(code: string) {
  const base = code.toLowerCase().split('-')[0]
  return base.charAt(0).toUpperCase() + base.slice(1)
}

export function languageCode(language: string): LanguageCode {
  const base = language.toLowerCase().split('-')[0]
  return LANGUAGES.some((item) => item.code === base) ? (base as LanguageCode) : 'en'
}
