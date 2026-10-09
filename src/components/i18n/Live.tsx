import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { languageCode, peekTranslation, requestTranslation, subscribeTranslations } from '../../lib/translate'

export function useLiveTranslation(text: string, from?: 'fr' | 'en') {
  const { i18n } = useTranslation()
  const lang = languageCode(i18n.language)
  const [tick, setTick] = useState(0)
  const source = from ?? 'en'
  const skip = !text || (from ? lang === from : lang === 'en' || lang === 'fr')

  useEffect(() => {
    if (skip) return
    requestTranslation(text, lang, source)
    const stop = subscribeTranslations(() => setTick((value) => value + 1))
    return () => {
      stop()
    }
  }, [skip, text, lang, source])

  void tick
  if (skip) return text
  return peekTranslation(text, lang)
}

export function Live({ text, from }: { text: string; from?: 'fr' | 'en' }) {
  return <>{useLiveTranslation(text, from)}</>
}
