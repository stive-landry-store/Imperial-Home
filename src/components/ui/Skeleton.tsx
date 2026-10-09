import { cn } from '../../lib/cn'

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse bg-[#d4af6a]/15', className)} aria-hidden />
}
