type Props = {
  className?: string
  markClassName?: string
  variant?: 'photo' | 'mark'
}

export function ImperialMark({ className = 'h-16 w-auto', markClassName = '', variant = 'photo' }: Props) {
  if (variant === 'photo') {
    return (
      <img
        src={`${import.meta.env.BASE_URL}brand/imperial-monogram.png`}
        alt="Impérial Home"
        className={`object-contain object-center ${className}`}
      />
    )
  }

  return (
    <svg viewBox="0 0 180 220" className={`${className} ${markClassName}`} aria-hidden fill="none">
      <defs>
        <linearGradient id="ihGold" x1="18%" y1="6%" x2="88%" y2="94%">
          <stop offset="0%" stopColor="#f4e4b8" />
          <stop offset="32%" stopColor="#e0c57a" />
          <stop offset="58%" stopColor="#c4a35a" />
          <stop offset="82%" stopColor="#8a6a28" />
          <stop offset="100%" stopColor="#dcc58a" />
        </linearGradient>
      </defs>
      <path
        fill="url(#ihGold)"
        d="M62 16h56v13H88v138h30v13H62v-13h26V29H62V16Zm70 26h32v13h-9v108h9v13h-32v-13h9V55h-9V42Z"
      />
      <path fill="url(#ihGold)" d="M88 96h58v16H88z" />
      <path
        fill="none"
        stroke="url(#ihGold)"
        strokeWidth="3.4"
        strokeLinecap="round"
        d="M58 32c-30 20-40 62-22 96 12 24 36 44 62 68"
      />
      <path
        fill="none"
        stroke="url(#ihGold)"
        strokeWidth="2.1"
        strokeLinecap="round"
        d="M42 122c20 24 42 42 56 62"
      />
    </svg>
  )
}

export function ImperialWordmark({ light = false, compact = false }: { light?: boolean; compact?: boolean }) {
  const gold = light ? 'text-[#d4af6a]' : 'text-gold'
  return (
    <div className="leading-none">
      <p className={`font-display tracking-[0.28em] ${gold} ${compact ? 'text-[1.15rem]' : 'text-[1.5rem]'}`}>IMPÉRIAL</p>
      <p className={`mt-1 flex items-center gap-2 tracking-[0.42em] ${gold} ${compact ? 'text-[0.62rem]' : 'text-[0.72rem]'}`}>
        <span className="h-px flex-1 bg-current opacity-70" />
        HOME
        <span className="h-px flex-1 bg-current opacity-70" />
      </p>
    </div>
  )
}

export function ImperialLogo({ light = false, compact = false }: { light?: boolean; compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <ImperialMark className={compact ? 'h-12 w-auto' : 'h-14 w-auto'} />
      <div>
        <ImperialWordmark light={light} compact={compact} />
        {!compact ? (
          <p className={`mt-1.5 text-[0.62rem] tracking-[0.22em] ${light ? 'text-[#d4af6a]/90' : 'text-gold'}`}>
            L&apos;ART DU SOIN. L&apos;ESPRIT DU DÉTAIL.
          </p>
        ) : null}
      </div>
    </div>
  )
}
