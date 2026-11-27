import { cn } from '../../lib/cn'
import type { ButtonHTMLAttributes } from 'react'
import { Link } from 'react-router-dom'

const variants = {
  primary: 'text-on-accent disabled:opacity-50',
  dark: 'bg-accent-soft text-accent hover:bg-accent-strong hover:text-on-accent disabled:opacity-50',
  ghost:
    'border border-line bg-[var(--card-bg)]/70 text-[var(--page-fg)] backdrop-blur hover:border-accent/40 hover:bg-accent-soft disabled:opacity-50',
  outline: 'border border-accent/40 text-accent hover:bg-accent-strong hover:text-on-accent',
}

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants
  to?: string
}

export function Button({ className, variant = 'primary', to, type = 'button', ...props }: Props) {
  const classes = cn(
    'ih-btn inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold touch-manipulation',
    variant === 'primary' && 'ih-btn-primary',
    variants[variant],
    className,
  )
  if (to) {
    return (
      <Link to={to} className={classes}>
        {props.children}
      </Link>
    )
  }
  return <button type={type} className={classes} {...props} />
}
