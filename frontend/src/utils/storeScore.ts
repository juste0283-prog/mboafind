// Classement économique des boutiques d'un produit.
// Score pondéré (plus petit = mieux) : prix 50 %, distance 30 %, avis 20 %.
import type { Offer } from "../types";
import { haversineKm } from "./geo";

// Poids du score : prix / distance / réputation (avis clients).
export const ECONOMY_WEIGHTS = { price: 0.5, distance: 0.3, rating: 0.2 } as const;

export interface StoreEvaluation {
  offer: Offer;
  distanceKm: number;
  score: number;
}

type LocatedOffer = Offer & { store_latitude: number; store_longitude: number };

function locatedOffers(offers: Offer[]): LocatedOffer[] {
  return offers.filter(
    (o): o is LocatedOffer =>
      typeof o.store_latitude === "number" &&
      typeof o.store_longitude === "number" &&
      o.store_latitude >= -90 &&
      o.store_latitude <= 90 &&
      o.store_longitude >= -180 &&
      o.store_longitude <= 180,
  );
}

export function evaluateStores(
  offers: Offer[],
  origin: { lat: number; lng: number },
): StoreEvaluation[] {
  const located = locatedOffers(offers);
  if (located.length === 0) return [];

  const prices = located.map((o) => o.amount);
  const minPrice = Math.min(...prices);
  const priceSpan = Math.max(...prices) - minPrice || 1;

  const distances = located.map((o) =>
    haversineKm(origin.lat, origin.lng, o.store_latitude, o.store_longitude),
  );
  const maxDistance = Math.max(...distances) || 1;

  const scored: StoreEvaluation[] = located.map((offer, i) => {
    const distanceKm = distances[i] ?? 0;
    const priceNorm = (offer.amount - minPrice) / priceSpan;
    const distanceNorm = distanceKm / maxDistance;
    const rating = offer.store_rating_avg ?? 0;
    const ratingPenalty = (5 - Math.max(0, Math.min(5, rating))) / 5;
    const score =
      priceNorm * ECONOMY_WEIGHTS.price +
      distanceNorm * ECONOMY_WEIGHTS.distance +
      ratingPenalty * ECONOMY_WEIGHTS.rating;
    return { offer, distanceKm, score };
  });

  return scored.sort((a, b) => a.score - b.score);
}