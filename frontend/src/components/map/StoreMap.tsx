// Carte Leaflet : affiche des marqueurs et éventuellement un itinéraire.
import { MapContainer, Marker, Popup, TileLayer, Polyline, Tooltip } from "react-leaflet";
import { storePinIcon, originPinIcon } from "./pinIcons";

export interface MapMarker {
  lat: number;
  lng: number;
  label?: string;
  verified?: boolean;
  isOrigin?: boolean;
}

export default function StoreMap({
  center,
  markers,
  route,
  zoom,
  className = "h-72",
}: {
  center: { lat: number; lng: number };
  markers: MapMarker[];
  route?: [number, number][];
  zoom?: number;
  className?: string;
}) {
  return (
    <div className={`${className} overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700`}>
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={zoom ?? (markers.length > 1 ? 13 : 15)}
        scrollWheelZoom={false}
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {route && route.length > 1 && (
          <Polyline
            positions={route}
            pathOptions={{ color: "#00A859", weight: 5, opacity: 0.85 }}
          />
        )}
        {markers.map((marker, index) => (
          <Marker
            key={`${marker.lat}-${marker.lng}-${index}`}
            position={[marker.lat, marker.lng]}
            icon={marker.isOrigin ? originPinIcon() : storePinIcon(marker.verified)}
          >
            {marker.label && <Tooltip direction="top" offset={[0, -24]} opacity={1}>{marker.label}</Tooltip>}
            {marker.label && (
              <Popup>
                <span className="text-sm font-medium">{marker.label}</span>
              </Popup>
            )}
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}