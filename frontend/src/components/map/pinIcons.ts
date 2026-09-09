// Icône de marqueur Leaflet personnalisée (SVG inline, évite les assets cassés).
import L from "leaflet";

export function storePinIcon(verified = false): L.DivIcon {
  return L.divIcon({
    className: "mboafind-pin",
    html: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2C7.86 2 4.5 5.36 4.5 9.5c0 5.5 7.5 12.5 7.5 12.5s7.5-7 7.5-12.5C19.5 5.36 16.14 2 12 2Z" fill="${verified ? "#00A859" : "#CE1126"}" stroke="#ffffff" stroke-width="1.5"/>
      <circle cx="12" cy="9.5" r="3" fill="#ffffff"/>
    </svg>`,
    iconSize: [34, 34],
    iconAnchor: [17, 32],
    popupAnchor: [0, -30],
  });
}

export function originPinIcon(): L.DivIcon {
  return L.divIcon({
    className: "mboafind-pin",
    html: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="9" fill="#FCD116" stroke="#ffffff" stroke-width="2"/>
      <circle cx="12" cy="12" r="3" fill="#ffffff"/>
    </svg>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -14],
  });
}