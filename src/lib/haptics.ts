export function haptic(ms = 10) {
  try {
    if (typeof navigator.vibrate === 'function') navigator.vibrate(ms)
  } catch {
    /* unsupported */
  }
}

export function installGlobalHaptics() {
  const onClick = (event: MouseEvent) => {
    const target = event.target
    if (!(target instanceof Element)) return
    if (target.closest('button:not(:disabled), a[href], [role="button"], summary')) haptic(8)
  }
  document.addEventListener('click', onClick, { passive: true })
  return () => document.removeEventListener('click', onClick)
}
