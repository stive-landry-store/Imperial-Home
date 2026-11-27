import type { LucideIcon } from 'lucide-react'
import { cn } from '../../lib/cn'

export function SectionCapsule({
  icon: Icon,
  children,
  className,
}: {
  icon: LucideIcon
  children: string
  className?: string
}) {
  return (
    <div
      className={cn(
        'inline-flex max-w-full items-center gap-1 rounded-full border border-accent bg-white px-[0.55em] py-[0.18em] text-[0.62em] leading-tight font-medium tracking-[0.04em] text-accent uppercase',
        className,
      )}
    >
      <Icon className="h-[1.05em] w-[1.05em] shrink-0 text-accent" strokeWidth={1.75} />
      <span className="min-w-0 break-words">{children}</span>
    </div>
  )
}
