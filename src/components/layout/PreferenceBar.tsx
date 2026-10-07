import { LocaleSwitch } from './LocaleSwitch'
import { ThemeSwitch } from './ThemeSwitch'

export function PreferenceBar({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <LocaleSwitch compact />
      <ThemeSwitch compact={compact} />
    </div>
  )
}
