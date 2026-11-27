import { useId, type ReactNode } from 'react'
import { cn } from '../../lib/cn'

/** Five-pointed star centred on (cx, cy), radius r, rotated by `turn` degrees. */
function star(cx: number, cy: number, r: number, turn = 0) {
  const points: string[] = []
  for (let i = 0; i < 10; i += 1) {
    const radius = i % 2 === 0 ? r : r * 0.382
    const angle = ((turn - 90 + i * 36) * Math.PI) / 180
    points.push(`${(cx + radius * Math.cos(angle)).toFixed(2)},${(cy + radius * Math.sin(angle)).toFixed(2)}`)
  }
  return points.join(' ')
}

const FLAGS: Record<string, (id: string) => ReactNode> = {
  fr: () => (
    <>
      <rect width="10" height="20" fill="#002395" />
      <rect x="10" width="10" height="20" fill="#ffffff" />
      <rect x="20" width="10" height="20" fill="#ED2939" />
    </>
  ),
  de: () => (
    <>
      <rect width="30" height="6.67" fill="#000000" />
      <rect y="6.67" width="30" height="6.67" fill="#DD0000" />
      <rect y="13.33" width="30" height="6.67" fill="#FFCE00" />
    </>
  ),
  es: () => (
    <>
      <rect width="30" height="20" fill="#AA151B" />
      <rect y="5" width="30" height="10" fill="#F1BF00" />
      <rect x="7" y="7.5" width="3.2" height="5" rx="0.6" fill="#AA151B" opacity="0.85" />
    </>
  ),
  ru: () => (
    <>
      <rect width="30" height="6.67" fill="#ffffff" />
      <rect y="6.67" width="30" height="6.67" fill="#0039A6" />
      <rect y="13.33" width="30" height="6.67" fill="#D52B1E" />
    </>
  ),
  gb: (id) => (
    <>
      <clipPath id={`${id}-t`}>
        <path d="M15,10 h15 v10 z v10 h-15 z h-15 v-10 z v-10 h15 z" />
      </clipPath>
      <rect width="30" height="20" fill="#012169" />
      <path d="M0,0 L30,20 M30,0 L0,20" stroke="#ffffff" strokeWidth="4" />
      <path d="M0,0 L30,20 M30,0 L0,20" stroke="#C8102E" strokeWidth="1.6" clipPath={`url(#${id}-t)`} />
      <path d="M15,0 v20 M0,10 h30" stroke="#ffffff" strokeWidth="6" />
      <path d="M15,0 v20 M0,10 h30" stroke="#C8102E" strokeWidth="3.4" />
    </>
  ),
  cn: () => (
    <>
      <rect width="30" height="20" fill="#DE2910" />
      <polygon points={star(5, 5, 3)} fill="#FFDE00" />
      <polygon points={star(10, 2, 1, 23)} fill="#FFDE00" />
      <polygon points={star(12, 4, 1, 45)} fill="#FFDE00" />
      <polygon points={star(12, 7, 1, 0)} fill="#FFDE00" />
      <polygon points={star(10, 9, 1, 20)} fill="#FFDE00" />
    </>
  ),
  in: () => (
    <>
      <rect width="30" height="6.67" fill="#FF9933" />
      <rect y="6.67" width="30" height="6.67" fill="#ffffff" />
      <rect y="13.33" width="30" height="6.67" fill="#138808" />
      <circle cx="15" cy="10" r="2.6" fill="none" stroke="#000080" strokeWidth="0.6" />
      <circle cx="15" cy="10" r="0.6" fill="#000080" />
    </>
  ),
  sa: () => (
    <>
      <rect width="30" height="20" fill="#006C35" />
      <path d="M8 7.2h14M9 8.6h12M8.5 10h13" stroke="#ffffff" strokeWidth="0.7" strokeLinecap="round" />
      <path d="M8 13.6h13.2l1.4-0.9" stroke="#ffffff" strokeWidth="0.9" strokeLinecap="round" fill="none" />
    </>
  ),
  bd: () => (
    <>
      <rect width="30" height="20" fill="#006A4E" />
      <circle cx="13.5" cy="10" r="5" fill="#F42A41" />
    </>
  ),
  br: () => (
    <>
      <rect width="30" height="20" fill="#009C3B" />
      <polygon points="15,2.2 27.6,10 15,17.8 2.4,10" fill="#FFDF00" />
      <circle cx="15" cy="10" r="4.4" fill="#002776" />
      <path d="M10.8 9.2c2.8-0.6 5.8-0.2 8.3 1.3" stroke="#ffffff" strokeWidth="0.75" fill="none" />
    </>
  ),
  pk: () => (
    <>
      <rect width="30" height="20" fill="#01411C" />
      <rect width="7.5" height="20" fill="#ffffff" />
      <circle cx="19.2" cy="10.4" r="5" fill="#ffffff" />
      <circle cx="20.6" cy="9.2" r="4.3" fill="#01411C" />
      <polygon points={star(22.6, 7.4, 1.5, 40)} fill="#ffffff" />
    </>
  ),
}

/** A real drawn flag, so it shows on every system (Windows does not draw flag emojis). */
export function Flag({ country, className }: { country: string; className?: string }) {
  const id = useId().replace(/[^a-z0-9]/gi, '')
  const draw = FLAGS[country]
  return (
    <svg
      viewBox="0 0 30 20"
      className={cn('inline-block h-[0.9em] w-auto shrink-0 overflow-hidden rounded-[3px] shadow-[0_0_0_1px_rgb(0_0_0/0.08)]', className)}
      aria-hidden
    >
      <clipPath id={`${id}-r`}>
        <rect width="30" height="20" rx="2.5" />
      </clipPath>
      <g clipPath={`url(#${id}-r)`}>{draw ? draw(id) : <rect width="30" height="20" fill="#d9d4cb" />}</g>
    </svg>
  )
}
