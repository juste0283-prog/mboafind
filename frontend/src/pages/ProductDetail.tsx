// Fiche produit : offre de prix par boutique (comparaison), confirmation one-shot,
// indice de confiance, historique du prix, favori et signalement.
import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getProduct, confirmPrice, getPriceHistory } from "../services/catalog";
import { createReport } from "../services/reviews";
import { addFavorite, getFavoriteStatus, removeFavorite } from "../services/favorites";
import {
  deletePriceAlert,
  listPriceAlerts,
  updatePriceAlert,
  upsertPriceAlert,
} from "../services/priceAlerts";
import type {
  Offer,
  PriceAlert,
  PriceHistoryEntry,
  ProductDetail as ProductDetailType,
} from "../types";
import { useAuth } from "../hooks/useAuth";
import { useI18n } from "../i18n/I18nContext";
import ErrorMessage from "../components/common/ErrorMessage";
import Spinner from "../components/common/Spinner";
import ProductStoresMap from "../components/map/ProductStoresMap";
import { getApiErrorMessage } from "../utils/apiError";
import {
  btnPrimary,
  btnSecondary,
  btnDanger,
  card,
  input,
  label,
  muted,
  heading,
  badge,
  notice as noticeCls,
} from "../styles/classes";

function trustColor(score: number): string {
  if (score >= 70) return "bg-brand-green";
  if (score >= 40) return "bg-brand-yellow";
  return "bg-brand-red";
}

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const productId = Number(id);
  const { user } = useAuth();
  const { t, formatNumber } = useI18n();

  const [product, setProduct] = useState<ProductDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<number | null>(null);

  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteBusy, setFavoriteBusy] = useState(false);

  const [priceAlert, setPriceAlert] = useState<PriceAlert | null>(null);
  const [alertTarget, setAlertTarget] = useState("");
  const [alertBusy, setAlertBusy] = useState(false);

  const [historyOpen, setHistoryOpen] = useState<Set<number>>(new Set());
  const [histories, setHistories] = useState<Map<number, PriceHistoryEntry[]>>(
    new Map(),
  );
  const [historyLoading, setHistoryLoading] = useState<number | null>(null);

  const [reportOpen, setReportOpen] = useState(false);
  const [reportTarget, setReportTarget] = useState<{
    type: string;
    id: number;
  } | null>(null);
  const [reportReason, setReportReason] = useState("Prix incorrect");
  const [reportDescription, setReportDescription] = useState("");

  const loadProduct = useCallback(async () => {
    const detail = await getProduct(productId);
    setProduct(detail);
    return detail;
  }, [productId]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    loadProduct()
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [loadProduct]);

  // Statut du favori (uniquement pour un utilisateur connecte).
  useEffect(() => {
    if (!user) {
      setIsFavorite(false);
      return;
    }
    let cancelled = false;
    getFavoriteStatus("PRODUCT", productId)
      .then((status) => {
        if (!cancelled) setIsFavorite(status.is_favorite);
      })
      .catch(() => {
        /* non bloquant */
      });
    return () => {
      cancelled = true;
    };
  }, [user, productId]);

  // Alerte de prix existante (utilisateur connecte uniquement).
  useEffect(() => {
    if (!user) {
      setPriceAlert(null);
      setAlertTarget("");
      return;
    }
    let cancelled = false;
    listPriceAlerts()
      .then((alerts) => {
        if (cancelled) return;
        const mine = alerts.find((a) => a.product_id === productId) ?? null;
        setPriceAlert(mine);
        setAlertTarget(mine ? String(mine.target_price) : "");
      })
      .catch(() => {
        /* non bloquant */
      });
    return () => {
      cancelled = true;
    };
  }, [user, productId]);

  if (loading) {
    return <Spinner fullScreen />;
  }

  if (error || !product) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <ErrorMessage message={error ?? t("product.notFound")} />
        <Link to="/recherche" className={`${btnSecondary} mt-4`}>
          {t("product.backToSearch")}
        </Link>
      </div>
    );
  }

  const handleConfirm = async (offer: Offer) => {
    setConfirming(offer.id);
    setNotice(null);
    try {
      const result = await confirmPrice(offer.id);
      await loadProduct();
      setNotice(
        result.already_confirmed ? result.message : t("product.priceConfirmed"),
      );
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setConfirming(null);
    }
  };

  const handleToggleFavorite = async () => {
    if (favoriteBusy) return;
    setFavoriteBusy(true);
    setError(null);
    try {
      if (isFavorite) {
        await removeFavorite("PRODUCT", productId);
        setIsFavorite(false);
        setNotice(t("product.favoriteRemoved"));
      } else {
        await addFavorite("PRODUCT", productId);
        setIsFavorite(true);
        setNotice(t("product.favoriteAdded"));
      }
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setFavoriteBusy(false);
    }
  };

  const handleToggleHistory = async (offerId: number) => {
    if (historyOpen.has(offerId)) {
      const next = new Set(historyOpen);
      next.delete(offerId);
      setHistoryOpen(next);
      return;
    }
    if (!histories.has(offerId)) {
      setHistoryLoading(offerId);
      try {
        const entries = await getPriceHistory(offerId);
        setHistories((prev) => {
          const next = new Map(prev);
          next.set(offerId, entries);
          return next;
        });
      } catch (err) {
        setError(getApiErrorMessage(err));
      } finally {
        setHistoryLoading(null);
      }
    }
    setHistoryOpen((prev) => {
      const next = new Set(prev);
      next.add(offerId);
      return next;
    });
  };

  const formatDateTime = (value: string): string => {
    const date = new Date(value);
    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const handleReport = async () => {
    if (!reportTarget) return;
    try {
      await createReport({
        target_type: reportTarget.type,
        target_id: reportTarget.id,
        reason: reportReason,
        description: reportDescription.trim() || undefined,
      });
      setReportOpen(false);
      setReportTarget(null);
      setReportDescription("");
      setNotice(t("report.sent"));
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };

  const handleSaveAlert = async () => {
    const target = Number(alertTarget);
    if (!Number.isFinite(target) || target <= 0) {
      setError(t("alerts.invalidTarget"));
      return;
    }
    setAlertBusy(true);
    setError(null);
    setNotice(null);
    try {
      const saved = await upsertPriceAlert({
        product_id: productId,
        target_price: target,
      });
      setPriceAlert(saved);
      setAlertTarget(String(saved.target_price));
      setNotice(saved.triggered ? t("alerts.savedTriggered") : t("alerts.saved"));
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setAlertBusy(false);
    }
  };

  const handleToggleAlert = async () => {
    if (!priceAlert) return;
    setAlertBusy(true);
    setError(null);
    setNotice(null);
    try {
      const updated = await updatePriceAlert(priceAlert.id, {
        is_active: !priceAlert.is_active,
      });
      setPriceAlert(updated);
      setNotice(t("alerts.updated"));
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setAlertBusy(false);
    }
  };

  const handleRemoveAlert = async () => {
    if (!priceAlert) return;
    if (!window.confirm(t("common.deleteConfirm"))) return;
    setAlertBusy(true);
    setError(null);
    setNotice(null);
    try {
      await deletePriceAlert(priceAlert.id);
      setPriceAlert(null);
      setAlertTarget("");
      setNotice(t("alerts.removed"));
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setAlertBusy(false);
    }
  };

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
      {error && (
        <div className="mt-4">
          <ErrorMessage message={error} />
        </div>
      )}

      <div className={`${card} mt-4 p-6`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            {product.brand && (
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                {product.brand}
              </p>
            )}
            <h1 className={`${heading} text-2xl`}>{product.name}</h1>
            {product.category && (
              <p className={`${muted} mt-1 text-sm`}>
                {t("search.category")} : {product.category.name}
              </p>
            )}
            {product.description && (
              <p className={`${muted} mt-3 text-sm`}>{product.description}</p>
            )}
          </div>
          {user && (
            <button
              type="button"
              onClick={handleToggleFavorite}
              disabled={favoriteBusy}
              className={`${isFavorite ? btnSecondary : btnPrimary} shrink-0`}
            >
              {isFavorite ? "★ " + t("product.favoriteRemove") : "☆ " + t("product.favoriteAdd")}
            </button>
          )}
        </div>

        {product.min_price !== null && product.min_price !== undefined ? (
          <div className="mt-4 flex flex-wrap items-center gap-6 border-t border-slate-100 pt-4 dark:border-slate-700">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">{t("product.minPrice")}</p>
              <p className="text-2xl font-bold text-brand-green">
                {formatNumber(product.min_price)}{" "}
                <span className="text-sm font-medium text-slate-400">FCFA</span>
              </p>
            </div>
            {product.max_price !== null &&
              product.max_price !== undefined &&
              product.max_price !== product.min_price && (
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{t("product.maxPrice")}</p>
                  <p className="text-lg font-semibold text-slate-700 dark:text-slate-200">
                    {formatNumber(product.max_price)} FCFA
                  </p>
                </div>
              )}
            {product.avg_price !== null && product.avg_price !== undefined && (
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">{t("product.avgPrice")}</p>
                <p className="text-lg font-semibold text-slate-700 dark:text-slate-200">
                  {formatNumber(product.avg_price)} FCFA
                </p>
              </div>
            )}
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">{t("product.storeCount")}</p>
              <p className="text-lg font-semibold text-slate-700 dark:text-slate-200">
                {product.store_count}
              </p>
            </div>
          </div>
        ) : (
          <p className={`${muted} mt-4 border-t border-slate-100 pt-4 text-sm dark:border-slate-700`}>
            {t("product.noOffers")}
          </p>
        )}

        {user ? (
          <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-700">
            {priceAlert?.triggered ? (
              <p className="text-sm font-medium text-brand-green">{t("alerts.triggered")}</p>
            ) : priceAlert ? (
              <p className={`${muted} text-sm`}>
                {priceAlert.is_active
                  ? t("alerts.watching", { price: formatNumber(priceAlert.target_price) })
                  : t("alerts.pausedNotice")}
                {priceAlert.current_price !== null &&
                  priceAlert.current_price !== undefined && (
                    <>
                      {" · "}
                      {t("alerts.currentPrice", {
                        price: formatNumber(priceAlert.current_price),
                      })}
                    </>
                  )}
              </p>
            ) : (
              <p className={`${muted} text-sm`}>
                {product.min_price !== null && product.min_price !== undefined
                  ? t("alerts.notifyOn", { price: formatNumber(product.min_price) })
                  : t("alerts.noOffersNotice")}
              </p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <label className="sr-only" htmlFor="alert-target">
                {t("alerts.target")}
              </label>
              <div className="relative">
                <input
                  id="alert-target"
                  type="number"
                  min="1"
                  step="100"
                  value={alertTarget}
                  onChange={(event) => setAlertTarget(event.target.value)}
                  className={`${input} w-44 pr-12`}
                  placeholder={t("alerts.target")}
                />
                <span className="absolute inset-y-0 right-3 flex items-center text-xs text-slate-400">
                  FCFA
                </span>
              </div>
              <button
                type="button"
                onClick={handleSaveAlert}
                disabled={alertBusy}
                className={btnSecondary}
              >
                {priceAlert ? t("alerts.update") : t("alerts.save")}
              </button>
              {priceAlert && (
                <>
                  <button
                    type="button"
                    onClick={handleToggleAlert}
                    disabled={alertBusy}
                    className="text-xs font-medium text-slate-500 hover:underline dark:text-slate-300"
                  >
                    {priceAlert.is_active ? t("alerts.pause") : t("alerts.resume")}
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoveAlert}
                    disabled={alertBusy}
                    className="text-xs font-medium text-brand-red hover:underline"
                  >
                    {t("alerts.delete")}
                  </button>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-700">
            <Link to="/login" className="text-sm text-brand-green hover:underline">
              {t("alerts.login")}
            </Link>
          </div>
        )}
      </div>

      <div className="mt-6 flex items-center justify-between">
        <h2 className={`${heading} text-lg`}>
          {t("product.compare")} ({product.offers.length})
        </h2>
        <span
          className="text-xs text-slate-400 underline decoration-dotted hover:text-slate-600 dark:hover:text-slate-300"
          title={t("product.trustHelp")}
        >
          {t("product.trust")}
        </span>
      </div>
      <div className={`${card} mt-3 overflow-hidden`}>
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800/80 dark:text-slate-400">
            <tr>
              <th className="px-4 py-3">{t("merchant.productCol")}</th>
              <th className="px-4 py-3">{t("merchant.priceCol")}</th>
              <th className="px-4 py-3">{t("merchant.availableCol")}</th>
              <th className="px-4 py-3">{t("product.trust")}</th>
              <th className="px-4 py-3 text-right">{t("merchant.actionsCol")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {product.offers.map((offer) => (
              <ProductOfferRows
                key={offer.id}
                offer={offer}
                productName={product.name}
                confirming={confirming === offer.id}
                user={user ?? null}
                historyOpen={historyOpen.has(offer.id)}
                history={histories.get(offer.id) ?? null}
                historyLoading={historyLoading === offer.id}
                formatNumber={formatNumber}
                formatDateTime={formatDateTime}
                onConfirm={() => handleConfirm(offer)}
                onToggleHistory={() => handleToggleHistory(offer.id)}
                onReport={() => {
                  setReportTarget({ type: "PRICE", id: offer.id });
                  setReportOpen(true);
                }}
                t={t}
              />
            ))}
          </tbody>
        </table>
      </div>

      {product.offers.length > 0 && <ProductStoresMap offers={product.offers} />}

      {reportOpen && reportTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setReportOpen(false)}
        >
          <div className={`${card} w-full max-w-md p-6 shadow-xl`} onClick={(event) => event.stopPropagation()}>
            <h3 className={`${heading} text-lg`}>{t("product.reportTitle", { name: product.name })}</h3>
            <p className={`${muted} mt-1 text-sm`}>{t("report.triggered")}</p>
            <label className="mt-4 block">
              <span className={label}>{t("report.reason")}</span>
              <select
                value={reportReason}
                onChange={(event) => setReportReason(event.target.value)}
                className={input}
              >
                {[
                  t("report.price"),
                  t("report.store"),
                  t("report.product"),
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

interface OfferRowProps {
  offer: Offer;
  productName: string;
  confirming: boolean;
  user: { role: string } | null;
  historyOpen: boolean;
  history: PriceHistoryEntry[] | null;
  historyLoading: boolean;
  formatNumber: (value: number) => string;
  formatDateTime: (value: string) => string;
  onConfirm: () => void;
  onToggleHistory: () => void;
  onReport: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: (key: string, params?: Record<string, string | number>) => string;
}

function ProductOfferRows({
  offer,
  confirming,
  user,
  historyOpen,
  history,
  historyLoading,
  formatNumber,
  formatDateTime,
  onConfirm,
  onToggleHistory,
  onReport,
  t,
}: OfferRowProps) {
  const confirmedByMe = offer.confirmed_by_me;
  const confirmedLabel = confirmedByMe
    ? t("product.confirmedByMe")
    : t("product.alreadyConfirmed");

  return (
    <>
      <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
        <td className="px-4 py-3">
          <Link
            to={`/boutiques/${offer.store_id}`}
            className="font-medium text-slate-900 hover:text-brand-green hover:underline dark:text-slate-100"
          >
            {offer.store_name}
          </Link>
          {offer.store_is_verified && (
            <span className={`${badge.green} ml-2`}>{t("store.verified")}</span>
          )}
          {offer.store_city && <p className={`${muted} text-xs`}>{offer.store_city}</p>}
        </td>
        <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">
          {formatNumber(offer.amount)} FCFA
        </td>
        <td className="px-4 py-3">
          {offer.is_available ? (
            <span className={badge.green}>{t("product.available")}</span>
          ) : (
            <span className={badge.red}>{t("product.unavailable")}</span>
          )}
        </td>
        <td className="px-4 py-3">
          <div className="min-w-[120px]">
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
              <div
                className={`h-2 rounded-full ${trustColor(offer.trust_score)}`}
                style={{ width: `${Math.max(0, Math.min(100, offer.trust_score))}%` }}
              />
            </div>
            <p className={`${muted} mt-1 text-xs`}>{offer.trust_score} / 100</p>
          </div>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center justify-end gap-2">
            {!user && (
              <span className="text-xs text-slate-400">{t("product.verified", { count: offer.confirmed_count })}</span>
            )}
            {user && (
              <button
                type="button"
                disabled={confirming || confirmedByMe}
                onClick={onConfirm}
                title={confirmedByMe ? confirmedLabel : undefined}
                className={`${confirmedByMe ? btnSecondary : btnPrimary} px-3 py-1.5 text-xs`}
              >
                {confirming
                  ? "…"
                  : confirmedByMe
                    ? confirmedLabel
                    : t("product.confirmPrice")}
              </button>
            )}
            <button
              type="button"
              onClick={onToggleHistory}
              className={`${btnSecondary} px-3 py-1.5 text-xs`}
            >
              {historyLoading ? "…" : t("product.historyToggle")}
            </button>
            <button
              type="button"
              onClick={onReport}
              className={`${btnSecondary} px-3 py-1.5 text-xs`}
            >
              {t("report.targetProduct")}
            </button>
          </div>
        </td>
      </tr>
      {historyOpen && (
        <tr>
          <td colSpan={5} className="bg-slate-50/60 px-4 py-3 dark:bg-slate-800/40">
            <p className={`${heading} mb-2 text-xs uppercase tracking-wide`}>
              {t("product.priceHistory")}
            </p>
            {history === null ? (
              <p className={`${muted} text-sm`}>…</p>
            ) : history.length === 0 ? (
              <p className={`${muted} text-sm`}>{t("product.historyEmpty")}</p>
            ) : (
              <ul className="space-y-1">
                {history.map((entry) => (
                  <li
                    key={entry.id}
                    className="flex flex-wrap items-center justify-between gap-2 text-sm"
                  >
                    <span className={`${muted} text-xs`}>
                      {t("product.historyChanged", {
                        date: formatDateTime(entry.changed_at),
                      })}
                    </span>
                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                      {formatNumber(entry.amount)} FCFA
                      {!entry.is_available && (
                        <span className={`${badge.red} ml-2`}>{t("product.unavailable")}</span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </td>
        </tr>
      )}
    </>
  );
}