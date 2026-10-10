import { Loader } from './Loader'

export function Skeleton({ className }: { className?: string }) {
  return <Loader className={className} />
}
