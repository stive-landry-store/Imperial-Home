import { cn } from '../../lib/cn'

const variants = {
  dark: 'border border-[#d4af6a]/50 bg-black/40 text-[#d4af6a]',
  light: 'border border-[#c4a35a] bg-[#f4eee3] text-[#6b5520]',
}

export function Badge({
  children,
  className,
  variant = 'light',
}: {
  children: string
  className?: string
  variant?: keyof typeof variants
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-1 text-[13px] uppercase tracking-[0.14em]',
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  )
}
