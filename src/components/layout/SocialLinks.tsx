import { useId } from 'react'
import { cn } from '../../lib/cn'
import { FACEBOOK_URL, INSTAGRAM_URL, TIKTOK_URL } from '../../lib/social'

function InstagramLogo({ className }: { className?: string }) {
  const id = useId().replace(/:/g, '')
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <defs>
        <radialGradient id={id} cx="30%" cy="110%" r="120%">
          <stop offset="0%" stopColor="#feda75" />
          <stop offset="35%" stopColor="#fa7e1e" />
          <stop offset="60%" stopColor="#d62976" />
          <stop offset="100%" stopColor="#4f5bd5" />
        </radialGradient>
      </defs>
      <rect width="24" height="24" rx="6" fill={`url(#${id})`} />
      <rect x="6" y="6" width="12" height="12" rx="4" fill="none" stroke="#fff" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="2.6" fill="none" stroke="#fff" strokeWidth="1.6" />
      <circle cx="16.4" cy="7.6" r="0.9" fill="#fff" />
    </svg>
  )
}

function TikTokLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <rect width="24" height="24" rx="6" fill="#111" />
      <path
        d="M14.2 6.2c.35 1.7 1.35 2.9 3 3.25v1.7c-1.05-.05-2-.35-2.85-.9v4.55a3.9 3.9 0 1 1-3.9-3.9c.22 0 .43.02.64.06v1.85a2.1 2.1 0 1 0 1.46 2v-9.5h1.65z"
        fill="#25F4EE"
        transform="translate(-0.4 0.15)"
      />
      <path
        d="M14.2 6.2c.35 1.7 1.35 2.9 3 3.25v1.7c-1.05-.05-2-.35-2.85-.9v4.55a3.9 3.9 0 1 1-3.9-3.9c.22 0 .43.02.64.06v1.85a2.1 2.1 0 1 0 1.46 2v-9.5h1.65z"
        fill="#FE2C55"
        transform="translate(0.4 -0.1)"
      />
      <path d="M14.2 6.2c.35 1.7 1.35 2.9 3 3.25v1.7c-1.05-.05-2-.35-2.85-.9v4.55a3.9 3.9 0 1 1-3.9-3.9c.22 0 .43.02.64.06v1.85a2.1 2.1 0 1 0 1.46 2v-9.5h1.65z" fill="#fff" />
    </svg>
  )
}

function FacebookLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <rect width="24" height="24" rx="6" fill="#1877F2" />
      <path
        d="M13.6 19.5v-6.1h2.05l.3-2.4H13.6V9.45c0-.7.2-1.17 1.2-1.17h1.28V6.15c-.22-.03-.98-.1-1.86-.1-1.84 0-3.1 1.12-3.1 3.18v1.77H8.7v2.4h2.42v6.1h2.48z"
        fill="#fff"
      />
    </svg>
  )
}

export function SocialLinks({ className, prominent = false }: { className?: string; prominent?: boolean }) {
  const size = prominent ? 'h-14 w-14' : 'h-12 w-12'
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <a className={cn(size, 'inline-flex shrink-0 touch-manipulation')} href={INSTAGRAM_URL} target="_blank" rel="noreferrer" aria-label="Instagram">
        <InstagramLogo className="h-full w-full" />
      </a>
      <a className={cn(size, 'inline-flex shrink-0 touch-manipulation')} href={TIKTOK_URL} target="_blank" rel="noreferrer" aria-label="TikTok">
        <TikTokLogo className="h-full w-full" />
      </a>
      <a className={cn(size, 'inline-flex shrink-0 touch-manipulation')} href={FACEBOOK_URL} target="_blank" rel="noreferrer" aria-label="Facebook">
        <FacebookLogo className="h-full w-full" />
      </a>
    </div>
  )
}
