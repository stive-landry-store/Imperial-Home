export const LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'zh', label: '中文', flag: '🇨🇳' },
  { code: 'hi', label: 'हिन्दी', flag: '🇮🇳' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'ar', label: 'العربية', flag: '🇸🇦' },
  { code: 'bn', label: 'বাংলা', flag: '🇧🇩' },
  { code: 'pt', label: 'Português', flag: '🇧🇷' },
  { code: 'ru', label: 'Русский', flag: '🇷🇺' },
  { code: 'ur', label: 'اردو', flag: '🇵🇰' },
] as const

export type LanguageCode = (typeof LANGUAGES)[number]['code']

export function languageCode(language: string): LanguageCode {
  const base = language.toLowerCase().split('-')[0]
  return LANGUAGES.some((item) => item.code === base) ? (base as LanguageCode) : 'en'
}
