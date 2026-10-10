import { useQuery } from '@tanstack/react-query'
import { fetchPropertyIndex, propertyMatricule, type PropertyRef } from '../lib/matricule'

export function usePropertyIndex() {
  return useQuery({ queryKey: ['property-index'], queryFn: fetchPropertyIndex, staleTime: 5 * 60_000 })
}

export function useMatricule(property?: PropertyRef | null) {
  const { data } = usePropertyIndex()
  return property ? propertyMatricule(property, data ?? []) : ''
}
