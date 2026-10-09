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

export function PropertyMap({ properties }: { properties: Property[] }) {
  const points = properties.map((property, index) => {
    const lat = Number(property.latitude ?? IMPERIAL_HOME.latitude) + index * 0.00035
    const lng = Number(property.longitude ?? IMPERIAL_HOME.longitude) + index * 0.00035
    return { property, lat, lng }
  })
  const center = points[0] ?? { lat: IMPERIAL_HOME.latitude, lng: IMPERIAL_HOME.longitude }

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
