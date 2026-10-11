import { useEffect } from 'react'

export function ViewportVars() {
  useEffect(() => {
    const vv = window.visualViewport
    const root = document.documentElement
    const apply = () => {
      root.style.setProperty('--vvh', `${vv ? vv.height : window.innerHeight}px`)
      root.style.setProperty('--vvt', `${vv ? vv.offsetTop : 0}px`)
      if (root.classList.contains('ih-thread-open') && window.scrollY !== 0) window.scrollTo(0, 0)
    }
    apply()
    vv?.addEventListener('resize', apply)
    vv?.addEventListener('scroll', apply)
    window.addEventListener('resize', apply)
    return () => {
      vv?.removeEventListener('resize', apply)
      vv?.removeEventListener('scroll', apply)
      window.removeEventListener('resize', apply)
    }
  }, [])
  return null
}
