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
    <label className={cn('flex min-w-0 flex-col gap-[0.15em]', className)}>
      <span className="flex min-w-0 items-start gap-1 text-[0.68em] leading-tight text-[#111]">
        {Icon ? <Icon className="mt-[0.05em] h-[1.05em] w-[1.05em] shrink-0 text-[#c4a35a]" strokeWidth={1.6} /> : null}
        <span className="min-w-0 break-words">{shown}</span>
      </span>
      <input
        type={type}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.value)}
        className="w-full min-w-0 border-0 border-b border-dotted border-[#c4a35a] bg-transparent px-0.5 py-0 text-[0.78em] text-[#111] outline-none disabled:text-[#111]"
      />
    </label>
  )
}
