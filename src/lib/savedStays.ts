const FAVORITES = 'ih-favorites'
const CAR_FAVORITES = 'ih-favorite-cars'
const COMPARE = 'ih-compare'

function read(key: string) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || '[]') as unknown
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : []
  } catch {
    return []
  }
}

function write(key: string, ids: string[]) {
  localStorage.setItem(key, JSON.stringify(ids))
  window.dispatchEvent(new Event('ih-saved-stays'))
}

export function favoriteIds() {
  return read(FAVORITES)
}

export function compareIds() {
  return read(COMPARE)
}

export function favoriteCarIds() {
  return read(CAR_FAVORITES)
}

export function toggleCarFavorite(id: string) {
  const current = read(CAR_FAVORITES)
  write(CAR_FAVORITES, current.includes(id) ? current.filter((item) => item !== id) : [...current, id])
}

export function toggleFavorite(id: string) {
  const current = read(FAVORITES)
  write(FAVORITES, current.includes(id) ? current.filter((item) => item !== id) : [...current, id])
}

export function toggleCompare(id: string) {
  const current = read(COMPARE)
  if (current.includes(id)) {
    write(COMPARE, current.filter((item) => item !== id))
    return
  }
  write(COMPARE, [...current, id].slice(-3))
}
