import type { ReactNode } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'

export function PageTransition({ children, className }: { children: ReactNode; className?: string }) {
  const location = useLocation()
  const type = useNavigationType()
  return (
    <div key={location.key} className={`${type === 'POP' ? 'ih-page-back' : 'ih-page-in'}${className ? ` ${className}` : ''}`}>
      {children}
    </div>
  )
}
