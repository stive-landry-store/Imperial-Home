import { cn } from '../../lib/cn'
import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'w-full border border-[#d4af6a]/40 bg-[var(--input-bg)] px-3 py-3 text-base text-[var(--input-fg)] outline-none focus:border-[#c4a35a]',
        className,
      )}
      {...props}
    />
  )
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        'w-full border border-[#d4af6a]/40 bg-[var(--input-bg)] px-3 py-3 text-base text-[var(--input-fg)] outline-none focus:border-[#c4a35a]',
        className,
      )}
      {...props}
    />
  )
}

export function Label({ children }: { children: string }) {
  return (
    <label className="mb-1.5 block text-[13px] uppercase tracking-[0.16em] text-[var(--surface-head,#d4af6a)]">
      {children}
    </label>
  )
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        'w-full border border-[#d4af6a]/40 bg-[var(--input-bg,#fffdf8)] px-3 py-3 text-base text-[var(--surface-fg,#14110c)] outline-none focus:border-[#c4a35a]',
        className,
      )}
      {...props}
    />
  )
}
