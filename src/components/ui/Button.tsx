import { cn } from '../../lib/cn'
import type { ButtonHTMLAttributes } from 'react'
import { Link } from 'react-router-dom'

const variants = {
  primary: 'bg-[#c4a35a] text-black hover:bg-[#e0c57a] disabled:opacity-50',
  dark: 'bg-[#1c1914] text-[#f6f1e8] hover:bg-[#2a241c] disabled:opacity-50',
  ghost: 'border border-black/15 text-[var(--page-fg)] hover:bg-black/5 disabled:opacity-50',
  outline: 'border border-black/20 text-[var(--page-fg)] hover:bg-[#1c1914] hover:text-[#f6f1e8]',
}

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants
  to?: string
}

export function Button({ className, variant = 'primary', to, type = 'button', ...props }: Props) {
  const classes = cn(
    'inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition-colors touch-manipulation',
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
