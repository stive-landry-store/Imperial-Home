import type { QueryClient } from '@tanstack/react-query'

/** Refresh public + admin caches after content changes so edits appear on the site. */
export async function invalidateSiteData(client: QueryClient, propertyId?: string, slug?: string) {
  const tasks = [
    client.invalidateQueries({ queryKey: ['site-config'] }),
    client.invalidateQueries({ queryKey: ['properties'] }),
    client.invalidateQueries({ queryKey: ['admin-properties'] }),
    client.invalidateQueries({ queryKey: ['promotions'] }),
    client.invalidateQueries({ queryKey: ['unavailable'] }),
    client.invalidateQueries({ queryKey: ['admin-reservations'] }),
    client.invalidateQueries({ queryKey: ['vehicles'] }),
    client.invalidateQueries({ queryKey: ['admin-vehicles'] }),
  ]
  if (propertyId) {
    tasks.push(client.invalidateQueries({ queryKey: ['property', propertyId] }))
  }
  if (slug) {
    tasks.push(client.invalidateQueries({ queryKey: ['property', slug] }))
  }
  await Promise.all(tasks)
}
