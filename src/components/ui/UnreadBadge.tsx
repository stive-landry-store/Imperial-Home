import { cn } from '../../lib/cn'

export function UnreadBadge({ count, className }: { count: number; className?: string }) {
  if (count <= 0) return null
  return (
    <span
      aria-label={String(count)}
      className={cn(
        'pointer-events-none grid h-5 min-w-5 place-items-center rounded-full bg-[#d4af6a] px-1.5 text-[12px] leading-none font-bold text-black shadow-[0_0_0_2px_rgba(0,0,0,0.55)]',
        className,
      )}
    >
      {count > 99 ? '99+' : count}
    </span>
  )
}
