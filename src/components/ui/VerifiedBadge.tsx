import { cn } from '../../lib/cn'

export function VerifiedBadge({ title }: { title?: string }) {
  return (
    <span
      title={title ?? 'Imperial Home verified administrator'}
      className={cn(
        'inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#1d9bf0] text-white',
        'shadow-[0_0_0_2px_white]',
      )}
      aria-label="Verified administrator"
    >
      <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="none">
        <path d="M2.5 6.2 5 8.5 9.5 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  )
}
