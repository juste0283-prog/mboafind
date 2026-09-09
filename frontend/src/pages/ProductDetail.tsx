// Fiche produit : offre de prix par boutique (comparaison), confirmation et signalement.
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getProduct, confirmPrice } from "../services/catalog";
import { createReport } from "../services/reviews";
import type { ProductDetail as ProductDetailType } from "../types";
import { useAuth } from "../hooks/useAuth";
import { useI18n } from "../i18n/I18nContext";
import ErrorMessage from "../components/common/ErrorMessage";
import Spinner from "../components/common/Spinner";
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

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const productId = Number(id);
  const { user } = useAuth();
  const { t, formatNumber } = useI18n();

  const [product, setProduct] = useState<ProductDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportTarget, setReportTarget] = useState<{
    type: string;
    id: number;
  } | null>(null);
  const [reportReason, setReportReason] = useState("Prix incorrect");
  const [reportDescription, setReportDescription] = useState("");

  useEffect(() => {
    setLoading(true);
    setError(null);
    getProduct(productId)
      .then(setProduct)
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [productId]);

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

  const handleConfirm = async (priceId: number) => {
    setConfirming(priceId);
    setNotice(null);
    try {
      await confirmPrice(priceId);
      const updated = await getProduct(productId);
      setProduct(updated);
      setNotice(t("product.priceConfirmed"));
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setConfirming(null);
    }
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
      </div>

      <h2 className={`${heading} mt-8 text-lg`}>
        {t("product.compare")} ({product.offers.length})
      </h2>
      <div className={`${card} mt-3 overflow-hidden`}>
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800/80 dark:text-slate-400">
            <tr>
              <th className="px-4 py-3">{t("merchant.productCol")}</th>
              <th className="px-4 py-3">{t("merchant.priceCol")}</th>
              <th className="px-4 py-3">{t("merchant.availableCol")}</th>
              <th className="px-4 py-3">Confiance</th>
              <th className="px-4 py-3 text-right">{t("merchant.actionsCol")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {product.offers.map((offer) => (
              <tr key={offer.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
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
                  {offer.store_city && (
                    <p className={`${muted} text-xs`}>{offer.store_city}</p>
                  )}
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
                <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                  {offer.verification_status === "VERIFIED" ? (
                    <span className="text-brand-green">{t("product.verified", { count: offer.confirmed_count })}</span>
                  ) : offer.confirmed_count > 0 ? (
                    <span>{t("product.verified", { count: offer.confirmed_count })}</span>
                  ) : (
                    <span className="text-slate-400">{t("product.confirmPrice")}</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    {user && (
                      <button
                        type="button"
                        disabled={confirming === offer.id}
                        onClick={() => handleConfirm(offer.id)}
                        className={`${btnPrimary} px-3 py-1.5 text-xs`}
                      >
                        {confirming === offer.id ? "…" : t("product.confirmPrice")}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setReportTarget({ type: "PRICE", id: offer.id });
                        setReportOpen(true);
                      }}
                      className={`${btnSecondary} px-3 py-1.5 text-xs`}
                    >
                      {t("report.targetProduct")}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
              <span className={label}>
                {t("report.details")}
              </span>
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