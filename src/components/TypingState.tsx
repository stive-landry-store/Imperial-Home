import { useEffect } from 'react'

const TEXT_FIELD = 'input:not([type=checkbox]):not([type=radio]):not([type=file]):not([type=range]):not([type=button]):not([type=submit]), textarea, [contenteditable=true]'

export function TypingState() {
  useEffect(() => {
    const root = document.documentElement
    const on = (event: FocusEvent) => {
      if ((event.target as Element | null)?.matches?.(TEXT_FIELD)) root.classList.add('ih-typing')
    }
    const off = () => root.classList.remove('ih-typing')
    document.addEventListener('focusin', on)
    document.addEventListener('focusout', off)
    return () => {
      document.removeEventListener('focusin', on)
      document.removeEventListener('focusout', off)
      root.classList.remove('ih-typing')
    }
  }, [])
  return null
}
