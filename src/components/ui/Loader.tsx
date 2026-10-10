import { cn } from '../../lib/cn'

type LoaderSize = 'xs' | 'sm' | 'md' | 'lg'

const SIZES: Record<LoaderSize, number> = { xs: 22, sm: 44, md: 76, lg: 112 }

export function Loader({
  size = 'md',
  fill = false,
  className,
}: {
  size?: LoaderSize
  fill?: boolean
  className?: string
}) {
  const px = SIZES[size]
  const mark = (
    <span
      role="status"
      aria-live="polite"
      aria-label="Impérial Home"
      className="ih-loader"
      style={{ width: px, height: px }}
    >
      <span className="ih-loader-glow" />
      <span className="ih-loader-ring" />
      <img
        src={`${import.meta.env.BASE_URL}brand/imperial-monogram.png`}
        alt=""
        draggable={false}
        className="ih-loader-logo"
      />
    </span>
  )
  if (size === 'xs') return <span className={cn('inline-flex align-middle', className)}>{mark}</span>
  return (
    <div
      className={cn(
        'flex w-full items-center justify-center',
        fill ? 'min-h-[60vh] py-24' : 'py-12',
        className,
      )}
    >
      {mark}
    </div>
  )
}
