// Service d'itinéraire : OSRM public (gratuit, sans clé) avec repli en ligne droite.
import { haversineKm } from "../utils/geo";

export interface RouteResult {
  distanceKm: number;
  durationMin: number;
  coordinates: [number, number][];
  geometry: "road" | "straight";
}

const OSRM_URL = "https://router.project-osrm.org/route/v1/driving";

/**
 * Calcule un itinéraire routier entre deux points (lat/lng) via OSRM.
 * En cas d'échec réseau, on retombe sur une estimation en ligne droite.
 */
export async function fetchRoute(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
): Promise<RouteResult> {
  const straight: RouteResult = {
    distanceKm: haversineKm(
      origin.lat,
      origin.lng,
      destination.lat,
      destination.lng,
    ),
    durationMin: Math.max(
      1,
      Math.round(
        (haversineKm(origin.lat, origin.lng, destination.lat, destination.lng) / 30) *
          60,
      ),
    ),
    coordinates: [
      [origin.lat, origin.lng],
      [destination.lat, destination.lng],
    ],
    geometry: "straight",
  };

  try {
    const response = await fetch(
      `${OSRM_URL}/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson&steps=false`,
      { signal: AbortSignal.timeout(8000) },
    );
    if (!response.ok) return straight;
    const data: {
      code: string;
      routes?: { distance: number; duration: number; geometry: { coordinates: number[][] } }[];
    } = await response.json();
    const route = data.routes?.[0];
    if (data.code !== "Ok" || !route) return straight;
    return {
      distanceKm: route.distance / 1000,
      durationMin: Math.round(route.duration / 60),
      coordinates: route.geometry.coordinates.map(
        ([lng, lat]) => [lat, lng] as [number, number],
      ),
      geometry: "road",
    };
  } catch {
    return straight;
  }
}