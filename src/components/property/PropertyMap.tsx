import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet'
import L from 'leaflet'
import { Link } from 'react-router-dom'
import type { Property } from '../../types/database'
import { IMPERIAL_HOME } from '../../lib/house'
import 'leaflet/dist/leaflet.css'

const icon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})

export function PropertyMap({
  properties,
  latitude,
  longitude,
}: {
  properties: Property[]
  latitude?: number
  longitude?: number
}) {
  const baseLat = latitude ?? IMPERIAL_HOME.latitude
  const baseLng = longitude ?? IMPERIAL_HOME.longitude
  const points = properties.map((property, index) => ({
    property,
    lat: baseLat + index * 0.00035,
    lng: baseLng + index * 0.00035,
  }))
  const center = { lat: baseLat, lng: baseLng }

  return (
    <MapContainer center={[center.lat, center.lng]} zoom={15} scrollWheelZoom={false} className="h-[28rem] w-full">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {points.map(({ property, lat, lng }) => (
        <Marker key={property.id} position={[lat, lng]} icon={icon}>
          <Popup>
            <Link to={`/properties/${property.slug}`} className="font-medium">
              {property.name}
            </Link>
            <br />
            {property.neighborhood || property.address}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
