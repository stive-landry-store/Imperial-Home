import { useEffect } from 'react'
import { MapContainer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MapModeSwitch, MapTiles, useMapMode } from './MapBase'

const icon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})

function Recenter({ latitude, longitude }: { latitude: number; longitude: number }) {
  const map = useMap()
  useEffect(() => {
    map.setView([latitude, longitude], map.getZoom())
  }, [latitude, longitude, map])
  return null
}

function Pick({ onPick }: { onPick: (latitude: number, longitude: number) => void }) {
  useMapEvents({
    click(event) {
      onPick(event.latlng.lat, event.latlng.lng)
    },
  })
  return null
}

export function PlaceMap({
  latitude,
  longitude,
  label,
  onPick,
  className = 'h-64',
}: {
  latitude: number
  longitude: number
  label: string
  onPick?: (latitude: number, longitude: number) => void
  className?: string
}) {
  const { mode, setMode } = useMapMode()
  return (
    <div className={`place-map relative isolate overflow-hidden rounded-2xl border border-black/10 ${className}`}>
      <MapContainer center={[latitude, longitude]} zoom={16} scrollWheelZoom={false} className="h-full w-full">
        <MapTiles mode={mode} />
        <Recenter latitude={latitude} longitude={longitude} />
        {onPick ? <Pick onPick={onPick} /> : null}
        <Marker position={[latitude, longitude]} icon={icon}>
          <Popup>{label}</Popup>
        </Marker>
      </MapContainer>
      <MapModeSwitch mode={mode} onChange={setMode} />
    </div>
  )
}
