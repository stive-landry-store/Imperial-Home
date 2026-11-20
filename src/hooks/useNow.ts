import { useEffect, useState } from 'react'

/** Current time, refreshed every `intervalMs`. Keeps renders pure (no Date.now() while rendering). */
export function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), intervalMs)
    return () => window.clearInterval(timer)
  }, [intervalMs])
  return now
}
