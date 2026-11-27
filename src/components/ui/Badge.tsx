import { cn } from '../../lib/cn'

const variants = {
  dark: 'border border-accent/30 bg-accent-soft text-accent',
  light: 'border border-accent bg-[#f4eee3] text-accent',
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
        'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium',
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  )
}
