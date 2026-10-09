import { cn } from '../../lib/cn'

export function VerifiedBadge({ title, className }: { title?: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn('h-6 w-6 shrink-0', className)}
      role="img"
      aria-label={title ?? 'Impérial Home'}
    >
      <title>{title ?? 'Impérial Home'}</title>
      <circle cx="12" cy="12" r="12" fill="#0866FF" />
      <path fill="#fff" d="M10.55 17.05 5.7 12.2l2.05-2.05 2.8 2.8 5.7-5.7 2.05 2.05z" />
    </svg>
  )
}
