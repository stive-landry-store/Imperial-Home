import { supabase } from './supabase'

export type PropertyRef = { id: string; name: string; created_at?: string | null }

const CODE_OVERRIDES: Record<string, string> = {
  singapour: 'SG',
}

function plain(name: string) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z]/g, '')
}

export function propertyCode(name: string) {
  const letters = plain(name)
  const override = CODE_OVERRIDES[letters.toLowerCase()]
  if (override) return override
  if (!letters) return 'XX'
  return letters.charAt(0).toUpperCase() + letters.slice(1, 2).toLowerCase()
}

export function propertyMatricule(property: PropertyRef, all: PropertyRef[] = []) {
  const code = propertyCode(property.name)
  const same = [...all, ...(all.some((item) => item.id === property.id) ? [] : [property])]
    .filter((item) => propertyCode(item.name) === code)
    .sort((a, b) => (a.created_at ?? '').localeCompare(b.created_at ?? '') || a.id.localeCompare(b.id))
  const index = Math.max(0, same.findIndex((item) => item.id === property.id))
  return `IH.${code}.${String(index + 1).padStart(3, '0')}`
}

export async function fetchPropertyIndex(): Promise<PropertyRef[]> {
  if (!supabase) return []
  const { data, error } = await supabase.from('properties').select('id, name, created_at').order('created_at', { ascending: true })
  if (error) return []
  return (data as PropertyRef[]) ?? []
}
