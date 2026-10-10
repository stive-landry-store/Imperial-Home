import { useState, type ReactNode } from 'react'
import { TileLayer } from 'react-leaflet'
import { useTranslation } from 'react-i18next'
import { Layers, Map as MapIcon } from 'lucide-react'
import { cn } from '../../lib/cn'
import 'leaflet/dist/leaflet.css'

export type MapMode = 'explore' | 'satellite'

const STORAGE_KEY = 'ih-map-mode'

function initialMode(): MapMode {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'satellite' ? 'satellite' : 'explore'
  } catch {
    return 'explore'
  }
}

export function useMapMode() {
  const [mode, setModeState] = useState<MapMode>(initialMode)
  const setMode = (next: MapMode) => {
    setModeState(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      /* ignore */
    }
  }
  return { mode, setMode }
}

export function MapTiles({ mode }: { mode: MapMode }) {
  if (mode === 'satellite') {
    return (
      <>
        <TileLayer
          key="sat"
          attribution="Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics"
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          maxZoom={19}
        />
        <TileLayer
          key="sat-labels"
          url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
          maxZoom={19}
        />
      </>
    )
  }
  return (
    <TileLayer
      key="osm"
      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      maxZoom={19}
    />
  )
}

export function MapModeSwitch({ mode, onChange }: { mode: MapMode; onChange: (mode: MapMode) => void }) {
  const { t } = useTranslation()
  const options: { value: MapMode; label: string; icon: ReactNode }[] = [
    { value: 'explore', label: t('common.mapExplore'), icon: <MapIcon size={14} /> },
    { value: 'satellite', label: t('common.mapSatellite'), icon: <Layers size={14} /> },
  ]
  return (
    <div className="absolute right-3 top-3 z-[1000] flex overflow-hidden rounded-full border border-[#d4af6a]/70 bg-[#0a0907]/90 p-0.5 shadow-lg backdrop-blur">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={mode === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium uppercase tracking-wider transition',
            mode === option.value ? 'bg-gradient-to-r from-[#b8893b] to-[#ecd08a] text-[#17110a]' : 'text-[#ecd08a]',
          )}
        >
          {option.icon}
          {option.label}
        </button>
      ))}
    </div>
  )
}
