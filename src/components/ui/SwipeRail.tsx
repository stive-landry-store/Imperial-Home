import { Children, type ReactNode } from 'react'
import { cn } from '../../lib/cn'

/** Horizontal swipe/scroll on phones; normal layout from md and up. */
export function SwipeRail({
  children,
  className,
  itemClassName,
}: {
  children: ReactNode
  className?: string
  itemClassName?: string
}) {
  return (
    <div
      className={cn(
        'swipe-rail -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:snap-none md:overflow-visible md:px-0 md:pb-0',
        className,
      )}
    >
      {Children.map(children, (child) => (
        <div className={cn('min-w-[78%] snap-start sm:min-w-[52%] md:min-w-0', itemClassName)}>{child}</div>
      ))}
    </div>
  )
}
