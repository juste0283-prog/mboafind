// Utilitaires géographiques partagés (haversine, centre de Yaoundé…).
export const YAOUNDE_CENTER = { lat: 3.8667, lng: 11.5167 } as const;

export function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const radius = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return Number((2 * radius * Math.asin(Math.sqrt(a))).toFixed(1));
}

export function isValidPosition(value: {
  lat?: number | null;
  lng?: number | null;
}): value is { lat: number; lng: number } {
  return (
    typeof value.lat === "number" &&
    typeof value.lng === "number" &&
    value.lat >= -90 &&
    value.lat <= 90 &&
    value.lng >= -180 &&
    value.lng <= 180
  );
}