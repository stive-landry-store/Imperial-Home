import { useTranslation } from 'react-i18next'

function parts(iso: string) {
  const [year = '', month = '', day = ''] = iso.split('-')
  return { year, month, day }
}

function daysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

export function ManualDate({
  label,
  value,
  min,
  onChange,
}: {
  label: string
  value: string
  min?: string
  onChange: (iso: string) => void
}) {
  const { t, i18n } = useTranslation()
  const { year, month, day } = parts(value)
  const locale = i18n.language.startsWith('fr') ? 'fr-FR' : 'en-GB'
  const months = Array.from({ length: 12 }, (_, index) =>
    new Date(Date.UTC(2026, index, 1)).toLocaleString(locale, { month: 'long', timeZone: 'UTC' }),
  )
  const startYear = Number((min ?? value).slice(0, 4)) || new Date().getUTCFullYear()
  const years = Array.from({ length: 4 }, (_, index) => String(startYear + index))
  if (year && !years.includes(year)) years.unshift(year)

  function commit(nextDay: string, nextMonth: string, nextYear: string) {
    if (!/^\d{4}$/.test(nextYear)) return
    const monthNumber = Number(nextMonth)
    const yearNumber = Number(nextYear)
    if (!monthNumber || !yearNumber) return
    const maxDay = daysInMonth(yearNumber, monthNumber)
    const dayNumber = Math.min(Math.max(1, Number(nextDay) || 1), maxDay)
    const iso = `${nextYear}-${String(monthNumber).padStart(2, '0')}-${String(dayNumber).padStart(2, '0')}`
    if (min && iso < min) return
    onChange(iso)
  }

  const field = 'min-h-11 border border-[#d4af6a]/40 bg-transparent px-2 text-base outline-none'

  return (
    <fieldset className="min-w-0">
      <legend className="text-sm uppercase tracking-wider text-[#d4af6a]/80">{label}</legend>
      <div className="mt-1 grid grid-cols-[4.5rem_1fr_5.5rem] gap-2">
        <select
          aria-label={t('property.day')}
          className={field}
          value={String(Number(day) || 1)}
          onChange={(event) => commit(event.target.value, month, year)}
        >
          {Array.from({ length: 31 }, (_, index) => (
            <option key={index + 1} value={index + 1}>
              {index + 1}
            </option>
          ))}
        </select>
        <select
          aria-label={t('property.month')}
          className={field}
          value={String(Number(month) || 1)}
          onChange={(event) => commit(day, event.target.value, year)}
        >
          {months.map((name, index) => (
            <option key={name} value={index + 1}>
              {name}
            </option>
          ))}
        </select>
        <select
          aria-label={t('property.year')}
          className={field}
          value={year}
          onChange={(event) => commit(day, month, event.target.value)}
        >
          {years.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>
    </fieldset>
  )
}