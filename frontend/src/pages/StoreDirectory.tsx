// Page « Où trouver » : annuaire public des boutiques sur carte + liste.
// Filtre par ville, tri par proximité via la position du visiteur.
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Spinner from "../components/common/Spinner";
import ErrorMessage from "../components/common/ErrorMessage";
import StoreMap from "../components/map/StoreMap";
import { listPublicStores } from "../services/catalog";
import { useI18n } from "../i18n/I18nContext";
import {
  btnPrimary,
  card,
  heading,
  input,
  label,
  muted,
  badge,
} from "../styles/classes";
import type { Store } from "../types";
import { getApiErrorMessage } from "../utils/apiError";
import { YAOUNDE_CENTER, isValidPosition, haversineKm } from "../utils/geo";

type SortMode = "recent" | "name" | "distance";

export default function StoreDirectory() {
  const { t, formatNumber } = useI18n();

  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);

  const [city, setCity] = useState("");
  const [sort, setSort] = useState<SortMode>("recent");
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listPublicStores({
        city: city.trim() || undefined,
        sort,
        lat: sort === "distance" && position ? position.lat : undefined,
        lng: sort === "distance" && position ? position.lng : undefined,
      });
      setStores(result);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [city, sort, position]);

  useEffect(() => {
    load();
  }, [load]);

  const locateMe = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setSort("distance");
        setLocating(false);
      },
      () => {
        setError(t("storeDirectory.geoError"));
        setLocating(false);
      },
      { timeout: 10000 },
    );
  };

  const markers = useMemo(
    () =>
      stores
        .filter((s) => isValidPosition({ lat: s.latitude, lng: s.longitude }))
        .map((s) => ({
          lat: s.latitude as number,
          lng: s.longitude as number,
          label: s.name,
          verified: s.is_verified,
        })),
    [stores],
  );

  const mapCenter = position ?? YAOUNDE_CENTER;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className={`${heading} text-2xl`}>{t("storeDirectory.title")}</h1>
      <p className={`${muted} mt-1 text-sm`}>{t("storeDirectory.subtitle")}</p>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="block">
          <span className={label}>{t("storeDirectory.cityFilter")}</span>
          <input
            type="text"
            value={city}
            onChange={(event) => setCity(event.target.value)}
            placeholder="Yaoundé, Douala…"
            className={`${input} sm:w-56`}
          />
        </label>
        <label className="block">
          <span className={label}>{t("storeDirectory.sort")}</span>
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value as SortMode)}
            className={`${input} sm:w-56`}
          >
            <option value="recent">{t("storeDirectory.sortRecent")}</option>
            <option value="name">{t("storeDirectory.sortName")}</option>
            <option value="distance">
              {position
                ? t("storeDirectory.sortDistanceNear")
                : t("storeDirectory.sortDistance")}
            </option>
          </select>
        </label>
        <button type="button" onClick={locateMe} disabled={locating} className={btnPrimary}>
          {locating ? t("common.loading") : t("storeDirectory.locateMe")}
        </button>
      </div>

      {error && (
        <div className="mt-4">
          <ErrorMessage message={error} />
        </div>
      )}

      {loading ? (
        <div className="mt-10 flex justify-center">
          <Spinner />
        </div>
      ) : (
        <>
          {markers.length > 0 && (
            <div className="mt-5">
              <StoreMap
                center={mapCenter}
                markers={markers}
                zoom={markers.length > 1 ? 12 : 14}
                className="h-96"
              />
            </div>
          )}

          {stores.length === 0 ? (
            <div className={`${card} mt-6 p-8 text-center`}>
              <p className={`${muted} text-sm`}>{t("storeDirectory.empty")}</p>
            </div>
          ) : (
            <>
              <p className={`${muted} mt-6 text-sm`}>
                {t("storeDirectory.results", { count: stores.length })}
              </p>
              <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {stores.map((store) => {
                  const distance =
                    position &&
                    isValidPosition({ lat: store.latitude, lng: store.longitude })
                      ? haversineKm(position.lat, position.lng, store.latitude as number, store.longitude as number)
                      : null;
                  return (
                    <Link
                      key={store.id}
                      to={`/boutiques/${store.id}`}
                      className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border-slate-700 dark:bg-slate-800/60"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h3 className={`${heading} font-semibold`}>{store.name}</h3>
                        {store.is_verified && (
                          <span className={`${badge.green} shrink-0`}>{t("storeDirectory.verified")}</span>
                        )}
                      </div>
                      <p className={`${muted} mt-1 text-sm`}>
                        {[store.city, store.province].filter(Boolean).join(", ") || "—"}
                      </p>
                      {store.address && (
                        <p className={`${muted} mt-1 text-xs`}>{store.address}</p>
                      )}
                      <div className="mt-3 flex items-end justify-between gap-2">
                        {store.rating_count > 0 ? (
                          <p className="text-sm text-slate-700 dark:text-slate-200">
                            ★ {store.rating_avg?.toFixed(1)}{" "}
                            <span className={`${muted} text-xs`}>({store.rating_count})</span>
                          </p>
                        ) : (
                          <span className="text-xs text-slate-400">{t("storeDirectory.noRating")}</span>
                        )}
                        {distance !== null && (
                          <span className="text-xs font-medium text-brand-green">
                            {t("storeDirectory.at", { km: formatNumber(distance) })}
                          </span>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}

      {!loading && markers.length === 0 && stores.length > 0 && (
        <p className={`${muted} mt-4 text-center text-sm`}>
          {t("storeDirectory.noMap")}
        </p>
      )}
    </div>
  );
}