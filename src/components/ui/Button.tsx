import { cn } from '../../lib/cn'
import type { ButtonHTMLAttributes } from 'react'
import { Link } from 'react-router-dom'

const variants = {
  primary: 'bg-[#c4a35a] text-black hover:bg-[#e0c57a] disabled:opacity-50',
  dark: 'bg-black text-[#d4af6a] hover:bg-[#171717] disabled:opacity-50',
  ghost: 'border border-[#c4a35a]/50 text-[#d4af6a] hover:bg-[#c4a35a]/10 disabled:opacity-50',
  outline: 'border border-[#c4a35a] text-[var(--page-fg)] hover:bg-[#c4a35a] hover:text-black',
}

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants
  to?: string
}

export function Button({ className, variant = 'primary', to, type = 'button', ...props }: Props) {
  const classes = cn(
    'inline-flex items-center justify-center gap-2 px-6 py-3 text-[13px] tracking-[0.16em] uppercase transition-colors',
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
