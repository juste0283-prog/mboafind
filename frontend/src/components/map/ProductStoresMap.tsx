// Carte d'un produit : localisation de toutes les boutiques qui le vendent,
// itinéraire vers la boutique sélectionnée et recommandation économique.
import { useEffect, useMemo, useState } from "react";
import StoreMap from "./StoreMap";
import { fetchRoute, type RouteResult } from "../../services/routing";
import { YAOUNDE_CENTER, haversineKm, isValidPosition } from "../../utils/geo";
import { evaluateStores } from "../../utils/storeScore";
import type { Offer } from "../../types";
import { useI18n } from "../../i18n/I18nContext";
import { card, muted, heading, badge, notice as noticeCls } from "../../styles/classes";

type LocatedOffer = Offer & { store_latitude: number; store_longitude: number };

function locatedOffers(offers: Offer[]): LocatedOffer[] {
  return offers.filter(
    (o): o is LocatedOffer =>
      typeof o.store_latitude === "number" &&
      typeof o.store_longitude === "number" &&
      isValidPosition({ lat: o.store_latitude, lng: o.store_longitude }),
  );
}

function zoomForSpan(spanKm: number): number {
  if (spanKm > 150) return 6;
  if (spanKm > 60) return 8;
  if (spanKm > 20) return 10;
  if (spanKm > 5) return 12;
  return 14;
}

export default function ProductStoresMap({ offers }: { offers: Offer[] }) {
  const { t, formatNumber } = useI18n();
  const [origin, setOrigin] = useState<{ lat: number; lng: number }>(YAOUNDE_CENTER);
  const [originFromGeo, setOriginFromGeo] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [routes, setRoutes] = useState<Map<number, RouteResult>>(new Map());
  const [routesLoading, setRoutesLoading] = useState(false);

  const located = useMemo(() => locatedOffers(offers), [offers]);

  // Origine : centre de Yaoundé par défaut, affinée par la géolocalisation.
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const pos = { lat: position.coords.latitude, lng: position.coords.longitude };
        if (isValidPosition(pos)) {
          setOriginFromGeo(true);
          setOrigin(pos);
        }
      },
      () => {
        /* reste sur le centre-ville */
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }, []);

  // Itinéraires OSRM vers chaque boutique (parallèle, repli haversine).
  useEffect(() => {
    let cancelled = false;
    if (located.length === 0) return;
    setRoutesLoading(true);
    Promise.all(
      located.map(async (offer) => {
        const route = await fetchRoute(origin, {
          lat: offer.store_latitude,
          lng: offer.store_longitude,
        });
        return { offerId: offer.id, route };
      }),
    )
      .then((results) => {
        if (cancelled) return;
        const next = new Map<number, RouteResult>();
        results.forEach((r) => next.set(r.offerId, r.route));
        setRoutes(next);
      })
      .catch(() => {
        /* repli : les distances haversine restent affichées */
      })
      .finally(() => {
        if (!cancelled) setRoutesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [origin, located]);

  const ranked = useMemo(() => evaluateStores(offers, origin), [offers, origin]);
  const bestId = ranked[0]?.offer.id ?? null;
  // Sélection : la boutique cliquée, sinon la plus économique.
  const selectedIdEffective =
    ranked.some((e) => e.offer.id === selectedId) ? selectedId : bestId;
  const selectedOffer = ranked.find((e) => e.offer.id === selectedIdEffective) ?? null;
  const selectedLocated =
    selectedOffer === null
      ? null
      : (located.find((o) => o.id === selectedOffer.offer.id) ?? null);
  const selectedRoute = selectedLocated ? routes.get(selectedLocated.id) : undefined;

  // Centre et zoom calculés sur l'ensemble des points visibles.
  const points = origin
    ? [
        origin,
        ...located.map((o) => ({ lat: o.store_latitude, lng: o.store_longitude })),
      ]
    : [];
  const mapCenter = useMemo(() => {
    if (points.length === 0) return YAOUNDE_CENTER;
    const lat = points.reduce((s, p) => s + p.lat, 0) / points.length;
    const lng = points.reduce((s, p) => s + p.lng, 0) / points.length;
    return { lat, lng };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origin, located]);
  const spanKm = useMemo(() => {
    let max = 0;
    points.forEach((a, i) => {
      points.forEach((b, j) => {
        if (j <= i) return;
        max = Math.max(max, haversineKm(a.lat, a.lng, b.lat, b.lng));
      });
    });
    return max;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origin, located]);

  const markers = [
    ...located.map((o) => ({
      lat: o.store_latitude,
      lng: o.store_longitude,
      label: o.store_name,
      verified: o.store_is_verified,
    })),
    ...(origin ? [{ ...origin, label: "A", isOrigin: true }] : []),
  ];

  if (located.length === 0) {
    return (
      <section className={`${card} mt-6 p-5`}>
        <h2 className={`${heading} text-lg`}>{t("product.storesMap")}</h2>
        <p className={`${noticeCls.info} mt-3`}>{t("product.noStoreLocation")}</p>
      </section>
    );
  }

  const mapsUrl =
    selectedLocated && selectedRoute
      ? `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${selectedLocated.store_latitude},${selectedLocated.store_longitude}`
      : null;

  return (
    <section className={`${card} mt-6 overflow-hidden`}>
      <div className="p-5 pb-3">
        <h2 className={`${heading} text-lg`}>
          {t("product.storesMap")} ({located.length})
        </h2>
        <p className={`${muted} mt-1 text-sm`}>
          {t("product.storesMapHint")}
          {originFromGeo
            ? ` ${t("store.itineraryFromMe")}`
            : ` ${t("store.itineraryFromCity")}`}
        </p>
      </div>

      <div className="grid lg:grid-cols-5">
        <div className="max-h-96 overflow-y-auto border-t border-slate-100 p-3 lg:col-span-2 lg:border-r lg:border-t-0 dark:border-slate-700">
          <ul className="space-y-2">
            {ranked.map(({ offer, distanceKm }, index) => {
              const route = routes.get(offer.id);
              const selected = selectedIdEffective === offer.id;
              const isBest = index === 0;
              return (
                <li key={offer.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(offer.id)}
                    className={`w-full rounded-xl border p-3 text-left transition ${
                      selected
                        ? "border-brand-green bg-green-50 dark:bg-green-900/20"
                        : "border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/40"
                    }`}
                  >
                    <p className={`${heading} flex flex-wrap items-center gap-2 text-sm font-semibold`}>
                      <span className="text-xs font-normal text-slate-400">{index + 1}</span>
                      <span>{offer.store_name}</span>
                      {offer.store_is_verified && <span className={badge.green}>{t("store.verified")}</span>}
                      {isBest && <span className={badge.yellow}>{t("product.recommended")}</span>}
                    </p>
                    <p className={`${muted} mt-1 text-xs`}>
                      {formatNumber(offer.amount)} FCFA
                      {typeof offer.store_rating_count === "number" && offer.store_rating_count > 0 && (
                        <span>
                          {" · "}
                          {t("store.ratingValue", {
                            value: Number(offer.store_rating_avg ?? 0).toFixed(1),
                            count: offer.store_rating_count,
                          })}
                        </span>
                      )}
                      {" · "}
                      {route
                        ? t("common.distance.km", {
                            value: formatNumber(Number(route.distanceKm.toFixed(1))),
                          })
                        : routesLoading
                          ? t("product.calculatingRoutes")
                          : t("common.distance.km", { value: formatNumber(distanceKm) })}
                      {route && (
                        <span>
                          {" · "}
                          {t("common.time.min", { value: route.durationMin })}
                        </span>
                      )}
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="p-4 lg:col-span-3">
          <StoreMap center={mapCenter} markers={markers} route={selectedRoute?.coordinates} zoom={zoomForSpan(spanKm)} className="h-96" />
          {selectedOffer && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
              <p className={`${muted} text-xs`}>
                {selectedOffer.offer.store_name}
                {selectedRoute
                  ? ` · ${t("store.distance")} ${formatNumber(Number(selectedRoute.distanceKm.toFixed(1)))} km · ${t("store.duration")} ${t("common.time.min", { value: selectedRoute.durationMin })}`
                  : ""}
              </p>
              {mapsUrl && (
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-medium text-brand-green hover:underline"
                >
                  {t("store.openInMap")}
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}