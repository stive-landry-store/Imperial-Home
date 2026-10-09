import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { compareIds, favoriteIds, toggleCompare, toggleFavorite } from '../../lib/savedStays'
import { syncFavorite } from '../../lib/guest'
import { useAuth } from '../../hooks/useAuth'
import { cn } from '../../lib/cn'

export function StayActions({ propertyId, className }: { propertyId: string; className?: string }) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [saved, setSaved] = useState(false)
  const [compared, setCompared] = useState(false)
  const [count, setCount] = useState(0)

  useEffect(() => {
    const sync = () => {
      setSaved(favoriteIds().includes(propertyId))
      setCompared(compareIds().includes(propertyId))
      setCount(compareIds().length)
    }
    sync()
    window.addEventListener('ih-saved-stays', sync)
    return () => window.removeEventListener('ih-saved-stays', sync)
  }, [propertyId])

  return (
    <div className={cn('flex flex-wrap gap-2 text-[11px] tracking-[0.14em] uppercase', className)}>
      <button
        type="button"
        className="border border-[#d4af6a]/50 px-3 py-2 text-[#d4af6a]"
        onClick={(event) => {
          event.preventDefault()
          event.stopPropagation()
          const next = !favoriteIds().includes(propertyId)
          toggleFavorite(propertyId)
          if (user) void syncFavorite(user.id, propertyId, next)
        }}
      >
        {saved ? t('plus.saved') : t('plus.favorite')}
      </button>
      <button
        type="button"
        className="border border-[#d4af6a]/50 px-3 py-2 text-[#d4af6a]"
        onClick={(event) => {
          event.preventDefault()
          event.stopPropagation()
          toggleCompare(propertyId)
        }}
      >
        {compared ? t('plus.compareTitle') : t('plus.compare')}
      </button>
      <Link to="/compare" className="px-1 py-2 text-[#d4af6a]" onClick={(event) => event.stopPropagation()}>
        {count}/3
      </Link>
    </div>
  )
}
