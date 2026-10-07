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
        'inline-flex items-center gap-2 rounded-full border border-[#c4a35a] bg-white px-4 py-1.5 text-[13px] font-medium tracking-[0.16em] text-[#8b6f32] uppercase',
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5 text-[#d4af6a]" strokeWidth={1.75} />
      {children}
    </div>
  )
}
