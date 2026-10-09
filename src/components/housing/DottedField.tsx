import { cn } from '../../lib/cn'
import { useLiveTranslation } from '../i18n/Live'
import type { LucideIcon } from 'lucide-react'

export function DottedField({
  icon: Icon,
  label,
  value,
  onChange,
  disabled,
  type = 'text',
  className,
}: {
  icon?: LucideIcon
  label: string
  value: string
  onChange?: (v: string) => void
  disabled?: boolean
  type?: string
  className?: string
}) {
  const shown = useLiveTranslation(label, 'fr')
  return (
    <label className={cn('flex min-w-0 items-end gap-1', className)}>
      {Icon ? <Icon className="mb-[0.15em] h-[1em] w-[1em] shrink-0 text-[#c4a35a]" strokeWidth={1.6} /> : null}
      <span className="mb-[0.1em] shrink-0 text-[0.72em] leading-none text-[#111]">{shown}</span>
      <input
        type={type}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.value)}
        className="min-w-0 flex-1 border-0 border-b border-dotted border-[#c4a35a] bg-transparent px-0.5 py-0 text-[0.78em] text-[#111] outline-none disabled:text-[#111]"
      />
    </label>
  )
}
