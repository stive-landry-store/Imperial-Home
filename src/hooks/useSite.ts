import { useQuery } from '@tanstack/react-query'
import { fetchPublishedProperties, fetchPromotions, fetchSiteConfig } from '../lib/data'

export function useSiteConfig() {
  return useQuery({ queryKey: ['site-config'], queryFn: fetchSiteConfig })
}

export function usePublishedProperties() {
  return useQuery({ queryKey: ['properties', 'published'], queryFn: fetchPublishedProperties })
}

export function usePromotions() {
  return useQuery({ queryKey: ['promotions'], queryFn: fetchPromotions })
}
