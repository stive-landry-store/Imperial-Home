import { cn } from '../../lib/cn'

export function VerifiedBadge({ title, className }: { title?: string; className?: string }) {
  return (
    <span
      title={title ?? 'Impérial Home'}
      className={cn(
        'inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#1d9bf0] text-white',
        'shadow-[0_0_0_2px_rgba(255,255,255,0.9)]',
        className,
      )}
      aria-label={title ?? 'Impérial Home'}
    >
      <svg viewBox="0 0 12 12" className="h-[62%] w-[62%]" fill="none">
        <path d="M2.5 6.2 5 8.5 9.5 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  )
}
