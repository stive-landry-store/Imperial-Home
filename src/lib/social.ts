export const INSTAGRAM_URL = 'https://www.instagram.com/imperial_home_237?psln=ZDlramVmbXpzZzM0'
export const TIKTOK_URL = 'https://www.tiktok.com/@imperial.home.237?_r=1&_t=ZN-9AP6VlObYxC'

export async function shareSite(url = window.location.origin) {
  const payload = {
    title: 'Impérial Home',
    text: 'Appartements meublés et location de voiture à Douala — Impérial Home',
    url,
  }
  if (typeof navigator.share === 'function') {
    try {
      await navigator.share(payload)
      return 'shared' as const
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return 'cancelled' as const
    }
  }
  await navigator.clipboard.writeText(url)
  return 'copied' as const
}