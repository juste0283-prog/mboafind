// Fiche boutique : informations, carte, itinéraire, produits, avis et signalement.
import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getStore } from "../services/catalog";
import { createReport, createReview } from "../services/reviews";
import {
  addFavorite,
  getFavoriteStatus,
  removeFavorite,
} from "../services/favorites";
import type { StoreDetail as StoreDetailType } from "../types";
import { useAuth } from "../hooks/useAuth";
import { useI18n } from "../i18n/I18nContext";
import ErrorMessage from "../components/common/ErrorMessage";
import Spinner from "../components/common/Spinner";
import StoreMap from "../components/map/StoreMap";
import { fetchRoute, type RouteResult } from "../services/routing";
import { YAOUNDE_CENTER, isValidPosition } from "../utils/geo";
import { getApiErrorMessage } from "../utils/apiError";
import { telLink, whatsappLink } from "../utils/phone";
import {
  btnPrimary,
  btnSecondary,
  btnDanger,
  card,
  cardHover,
  input,
  label,
  muted,
  heading,
  badge,
  notice as noticeCls,
} from "../styles/classes";

export default function StoreDetail() {
  const { id } = useParams<{ id: string }>();
  const storeId = Number(id);
  const { user } = useAuth();
  const { t, formatNumber, formatDate } = useI18n();

  const [store, setStore] = useState<StoreDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Favori
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteBusy, setFavoriteBusy] = useState(false);

  // Formulaire d'avis
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Signalement
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("Localisation incorrecte");
  const [reportDescription, setReportDescription] = useState("");

  // Carte & itinéraire
  const [origin, setOrigin] = useState<{ lat: number; lng: number } | null>(null);
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [routing, setRouting] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getStore(storeId)
      .then(setStore)
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [storeId]);

  // Statut du favori (utilisateur connecte uniquement).
  useEffect(() => {
    if (!user) {
      setIsFavorite(false);
      return;
    }
    let cancelled = false;
    getFavoriteStatus("STORE", storeId)
      .then((status) => {
        if (!cancelled) setIsFavorite(status.is_favorite);
      })
      .catch(() => {
        /* non bloquant */
      });
    return () => {
      cancelled = true;
    };
  }, [user, storeId]);

  const storeCoordinates = () => {
    if (!store || store.latitude == null || store.longitude == null) return null;
    const pos = { lat: store.latitude, lng: store.longitude };
    return isValidPosition(pos) ? pos : null;
  };

  const computeRoute = useCallback(
    async (from: { lat: number; lng: number }) => {
      const destination = storeCoordinates();
      if (!destination) {
        setRoute(null);
        return;
      }
      setRouting(true);
      setError(null);
      setOrigin(from);
      try {
        const result = await fetchRoute(from, destination);
        setRoute(result);
      } catch (err) {
        setError(getApiErrorMessage(err));
      } finally {
        setRouting(false);
      }
    },
    [store],
  );

  const routeFromMyLocation = useCallback(() => {
    if (!navigator.geolocation) {
      void computeRoute(YAOUNDE_CENTER);
      return;
    }
    setRouting(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        void computeRoute({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      () => {
        setRouting(false);
        void computeRoute(YAOUNDE_CENTER);
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }, [computeRoute]);

  if (loading) {
    return <Spinner fullScreen />;
  }

  if (error || !store) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <ErrorMessage message={error ?? t("store.notFound")} />
        <Link to="/recherche" className={`${btnSecondary} mt-4`}>
          {t("product.backToSearch")}
        </Link>
      </div>
    );
  }

  const storePosition = storeCoordinates();

  const handleReview = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await createReview({ store_id: store.id, rating, comment: comment.trim() || undefined });
      setNotice(t("store.reviewSent"));
      setComment("");
      const fresh = await getStore(storeId);
      setStore(fresh);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleReport = async () => {
    try {
      await createReport({
        target_type: "STORE",
        target_id: store.id,
        reason: reportReason,
        description: reportDescription.trim() || undefined,
      });
      setReportOpen(false);
      setReportDescription("");
      setNotice(t("report.sent"));
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };

  const handleToggleFavorite = async () => {
    if (favoriteBusy) return;
    setFavoriteBusy(true);
    setError(null);
    try {
      if (isFavorite) {
        await removeFavorite("STORE", store.id);
        setIsFavorite(false);
        setNotice(t("favorites.removed"));
      } else {
        await addFavorite("STORE", store.id);
        setIsFavorite(true);
        setNotice(t("favorites.added"));
      }
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setFavoriteBusy(false);
    }
  };

  const mapsUrl = storePosition
    ? `https://www.google.com/maps/dir/?api=1&destination=${storePosition.lat},${storePosition.lng}`
    : null;

  const mapMarkers = [
    ...(storePosition ? [{ lat: storePosition.lat, lng: storePosition.lng, label: store.name, verified: store.is_verified }] : []),
    ...(origin ? [{ ...origin, label: "A", isOrigin: true }] : []),
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <Link to="/recherche" className="text-sm text-brand-green hover:underline">
        {t("product.backToSearch")}
      </Link>

      {notice && (
        <div className={`${noticeCls.success} mt-4`} role="status">
          {notice}
        </div>
      )}
      {error && <div className="mt-4"><ErrorMessage message={error} /></div>}

      <div className={`${card} mt-4 p-6`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className={`${heading} flex items-center gap-2 text-2xl`}>
              {store.name}
              {store.is_verified && (
                <span className={badge.green}>{t("store.verified")}</span>
              )}
            </h1>
            {store.city && <p className={`${muted} mt-1 text-sm`}>{store.city}</p>}
            {store.description && (
              <p className={`${muted} mt-3 max-w-2xl text-sm`}>{store.description}</p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {(() => {
              const wa = whatsappLink(store.phone);
              const tel = telLink(store.phone);
              return (
                <>
                  {wa && (
                    <a
                      href={wa}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`${btnSecondary} px-3 py-1.5 text-xs`}
                    >
                      {t("common.whatsapp")}
                    </a>
                  )}
                  {tel && (
                    <a href={tel} className={`${btnSecondary} px-3 py-1.5 text-xs`}>
                      {t("common.call")}
                    </a>
                  )}
                </>
              );
            })()}
            {user && (
              <button
                type="button"
                onClick={handleToggleFavorite}
                disabled={favoriteBusy}
                className={`${isFavorite ? btnSecondary : btnPrimary} shrink-0 px-3 py-1.5 text-xs`}
              >
                {isFavorite
                  ? "★ " + t("favorites.remove")
                  : "☆ " + t("favorites.add")}
              </button>
            )}
            <button type="button" onClick={() => setReportOpen(true)} className={btnSecondary}>
              {t("report.targetStore")}
            </button>
          </div>
        </div>

        <dl className="mt-6 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2 lg:grid-cols-4 dark:border-slate-700">
          <div>
            <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">{t("store.address")}</dt>
            <dd className="mt-0.5 text-sm text-slate-900 dark:text-slate-100">
              {store.address ?? t("store.locationMissing")}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">{t("store.phone")}</dt>
            <dd className="mt-0.5 text-sm text-slate-900 dark:text-slate-100">
              {store.phone ?? t("store.noPhone")}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">{t("store.hours")}</dt>
            <dd className="mt-0.5 text-sm text-slate-900 dark:text-slate-100">
              {store.opening_hours ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">{t("store.rating")}</dt>
            <dd className="mt-0.5 text-sm text-slate-900 dark:text-slate-100">
              {store.rating_avg !== null && store.rating_avg !== undefined
                ? t("store.ratingValue", {
                    value: store.rating_avg.toFixed(1),
                    count: store.rating_count,
                  })
                : t("store.noRating")}
            </dd>
          </div>
        </dl>
      </div>

      {/* ---- Carte & itinéraire ---- */}
      <h2 className={`${heading} mt-8 text-lg`}>{t("store.map")}</h2>
      <div className={`${card} mt-3 p-5`}>
        {storePosition ? (
          <>
            <StoreMap
              center={origin ?? storePosition}
              markers={mapMarkers}
              route={route?.coordinates}
            />
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={routeFromMyLocation} className={btnPrimary}>
                  {routing ? t("store.calculating") : t("store.calculateRoute")}
                </button>
                <button
                  type="button"
                  onClick={() => void computeRoute(YAOUNDE_CENTER)}
                  className={btnSecondary}
                >
                  {t("store.itineraryFromCity")}
                </button>
                {mapsUrl && (
                  <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className={btnSecondary}>
                    {t("store.openInMap")}
                  </a>
                )}
              </div>
              {route && (
                <div className="flex flex-wrap gap-4 text-sm">
                  <span className="font-semibold text-brand-green">
                    {t("store.distance")} : {formatNumber(route.distanceKm)} km
                  </span>
                  <span className={`font-semibold ${muted}`}>
                    {t("store.duration")} : {formatNumber(route.durationMin)} min
                  </span>
                  {route.geometry === "straight" && (
                    <span className={`${muted} text-xs`}>ⓘ</span>
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          <p className={`${muted} text-sm`}>{t("store.noLocation")}</p>
        )}
      </div>

      <h2 className={`${heading} mt-8 text-lg`}>
        {t("store.products")} ({store.products.length})
      </h2>
      <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {store.products.length === 0 && (
          <p className={`${muted} text-sm`}>{t("store.noProducts")}</p>
        )}
        {store.products.map((product) => (
          <Link
            key={product.id}
            to={`/produits/${product.id}`}
            className={cardHover}
          >
            <div className="p-4">
              <p className={`${heading} font-semibold`}>{product.name}</p>
              {product.brand && <p className={`${muted} text-sm`}>{product.brand}</p>}
              <p className="mt-2 font-bold text-brand-green">
                {product.min_price !== null && product.min_price !== undefined
                  ? `${formatNumber(product.min_price)} FCFA`
                  : t("merchant.noPrice")}
              </p>
            </div>
          </Link>
        ))}
      </div>

      <h2 className={`${heading} mt-8 text-lg`}>
        {t("store.reviews")} ({store.reviews.length})
      </h2>
      <div className="mt-3 space-y-3">
        {store.reviews.length === 0 && (
          <p className={`${muted} text-sm`}>{t("store.noReviews")}</p>
        )}
        {store.reviews.map((review) => (
          <div key={review.id} className={card}>
            <div className="p-4">
              <div className="flex items-center justify-between">
                <p className={`${heading} text-sm font-semibold`}>
                  {"★".repeat(review.rating)}
                  <span className="text-slate-300 dark:text-slate-600">
                    {"★".repeat(5 - review.rating)}
                  </span>
                  <span className={`${muted} ml-2 font-normal`}>
                    {review.author_name ?? t("store.author")}
                  </span>
                </p>
                <span className="text-xs text-slate-400 dark:text-slate-500">
                  {formatDate(review.created_at)}
                </span>
              </div>
              {review.comment && (
                <p className={`${muted} mt-2 text-sm`}>{review.comment}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {user && (
        <div className={`${card} mt-8 p-6`}>
          <h3 className={`${heading} text-base`}>{t("store.leaveReview")}</h3>
          <p className={`${muted} mt-1 text-sm`}>{t("store.reviewHint")}</p>
          <div className="mt-4 flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setRating(value)}
                className={`text-2xl ${value <= rating ? "text-brand-yellow" : "text-slate-300 dark:text-slate-600"}`}
                aria-label={t("store.stars", { value })}
              >
                ★
              </button>
            ))}
          </div>
          <textarea
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            rows={3}
            placeholder={t("store.reviewPlaceholder")}
            className={`${input} mt-3`}
          />
          <button
            type="button"
            disabled={submitting}
            onClick={handleReview}
            className={`${btnPrimary} mt-3`}
          >
            {submitting ? t("common.loading") : t("store.publishReview")}
          </button>
        </div>
      )}

      {reportOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setReportOpen(false)}
        >
          <div className={`${card} w-full max-w-md p-6 shadow-xl`} onClick={(event) => event.stopPropagation()}>
            <h3 className={`${heading} text-lg`}>
              {t("product.reportTitle", { name: store.name })}
            </h3>
            <label className="mt-4 block">
              <span className={label}>{t("report.reason")}</span>
              <select
                value={reportReason}
                onChange={(event) => setReportReason(event.target.value)}
                className={input}
              >
                {[
                  t("report.store"),
                  t("report.storeInfo"),
                  t("report.location"),
                  t("report.abusive"),
                  t("common.other"),
                ].map((reason) => (
                  <option key={reason} value={reason}>
                    {reason}
                  </option>
                ))}
              </select>
            </label>
            <label className="mt-3 block">
              <span className={label}>{t("report.details")}</span>
              <textarea
                value={reportDescription}
                onChange={(event) => setReportDescription(event.target.value)}
                rows={3}
                className={input}
              />
            </label>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setReportOpen(false)} className={btnSecondary}>
                {t("common.cancel")}
              </button>
              <button type="button" onClick={handleReport} className={btnDanger}>
                {t("report.send")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}