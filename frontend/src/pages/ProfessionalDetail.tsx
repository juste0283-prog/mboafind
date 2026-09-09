// Fiche professionnel : profil, services, tarifs et demande de service.
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getProfessional } from "../services/professionals";
import { createServiceRequest } from "../services/serviceRequests";
import { createReport } from "../services/reviews";
import {
  addFavorite,
  getFavoriteStatus,
  removeFavorite,
} from "../services/favorites";
import type { ProfessionalDetail as ProfessionalDetailType, Service } from "../types";
import { useAuth } from "../hooks/useAuth";
import ErrorMessage from "../components/common/ErrorMessage";
import Spinner from "../components/common/Spinner";
import { getApiErrorMessage } from "../utils/apiError";
import { whatsappLink } from "../utils/phone";
import { useI18n } from "../i18n/I18nContext";
import {
  btnPrimary,
  btnSecondary,
  btnDanger,
  card,
  input,
  label,
  muted,
  heading,
  notice as noticeCls,
  badge,
} from "../styles/classes";

export default function ProfessionalDetail() {
  const { id } = useParams<{ id: string }>();
  const professionalId = Number(id);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t, formatDate, formatNumber } = useI18n();

  const [pro, setPro] = useState<ProfessionalDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteBusy, setFavoriteBusy] = useState(false);

  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [message, setMessage] = useState("");
  const [requestSubmitting, setRequestSubmitting] = useState(false);

  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("Faux professionnel");
  const [reportDescription, setReportDescription] = useState("");

  useEffect(() => {
    setLoading(true);
    setError(null);
    getProfessional(professionalId)
      .then(setPro)
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [professionalId]);

  // Statut du favori (utilisateur connecte uniquement).
  useEffect(() => {
    if (!user) {
      setIsFavorite(false);
      return;
    }
    let cancelled = false;
    getFavoriteStatus("PROFESSIONAL", professionalId)
      .then((status) => {
        if (!cancelled) setIsFavorite(status.is_favorite);
      })
      .catch(() => {
        /* non bloquant */
      });
    return () => {
      cancelled = true;
    };
  }, [user, professionalId]);

  if (loading) {
    return <Spinner fullScreen />;
  }

  if (error || !pro) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <ErrorMessage message={error ?? t("pro.notFound")} />
        <Link to="/professionnels" className={`${btnSecondary} mt-4 inline-block`}>
          {t("pro.backToSearch")}
        </Link>
      </div>
    );
  }

  const reportReasons = [t("report.price"), t("report.location"), t("report.abusive"), t("common.other")];

  const handleRequest = async () => {
    if (!selectedService) return;
    if (!user) {
      navigate("/login", { state: { from: `/professionnels/${professionalId}` } });
      return;
    }
    setRequestSubmitting(true);
    setError(null);
    try {
      await createServiceRequest(selectedService.id, message.trim() || undefined);
      setNotice(t("pro.requestSent"));
      setMessage("");
      setSelectedService(null);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setRequestSubmitting(false);
    }
  };

  const handleToggleFavorite = async () => {
    if (favoriteBusy) return;
    setFavoriteBusy(true);
    setError(null);
    try {
      if (isFavorite) {
        await removeFavorite("PROFESSIONAL", pro.id);
        setIsFavorite(false);
        setNotice(t("favorites.removed"));
      } else {
        await addFavorite("PROFESSIONAL", pro.id);
        setIsFavorite(true);
        setNotice(t("favorites.added"));
      }
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setFavoriteBusy(false);
    }
  };

  const handleReport = async () => {
    try {
      await createReport({
        target_type: "PROFESSIONAL",
        target_id: pro.id,
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

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <Link to="/professionnels" className="text-sm text-brand-green hover:underline">
        {t("pro.backToSearch")}
      </Link>

      {notice && <div className={`${noticeCls.success} mt-4`} role="status">{notice}</div>}
      {error && <div className="mt-4"><ErrorMessage message={error} /></div>}

      <div className={`${card} mt-4 p-6`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className={`${heading} flex items-center gap-2 text-2xl`}>
              {pro.profession}
              {pro.is_verified && (
                <span className={badge.green} title={t("store.verified")}>
                  {t("store.verified")}
                </span>
              )}
            </h1>
            <p className={`${muted} mt-1 text-sm`}>
              {[pro.user_name, pro.city].filter(Boolean).join(" · ")}
            </p>
            {pro.phone && (
              <p className={`${muted} mt-1 text-sm`}>
                📞 <a href={`tel:${pro.phone}`} className="hover:text-brand-green">{pro.phone}</a>
              </p>
            )}
            {pro.bio && <p className={`${muted} mt-3 max-w-2xl text-sm`}>{pro.bio}</p>}
            <p className={`${muted} mt-2 text-xs`}>
              {pro.rating_count > 0
                ? t("store.ratingValue", { value: pro.rating_avg?.toFixed(1) ?? "0", count: pro.rating_count })
                : t("store.noRating")}
            </p>
          </div>
          {(() => {
              const wa = whatsappLink(pro.phone);
              return (
                <>
                  {wa && (
                    <a
                      href={wa}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={btnSecondary}
                    >
                      {t("common.whatsapp")}
                    </a>
                  )}
                  {user && (
                    <button
                      type="button"
                      onClick={handleToggleFavorite}
                      disabled={favoriteBusy}
                      className={`${isFavorite ? btnSecondary : btnPrimary} shrink-0`}
                    >
                      {isFavorite
                        ? "★ " + t("favorites.remove")
                        : "☆ " + t("favorites.add")}
                    </button>
                  )}
                </>
              );
            })()}
            <button
              type="button"
              onClick={() => {
                setReportReason(reportReasons[0] ?? "Autre");
                setReportOpen(true);
              }}
              className={btnDanger}
            >
              {t("report.targetProfessional")}
            </button>
        </div>
      </div>

      <h2 className={`${heading} mt-8 text-lg`}>{t("pro.servicesTitle")}</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {pro.services.length === 0 && (
          <p className={`${muted} text-sm`}>{t("pro.noServices")}</p>
        )}
        {pro.services.map((service) => (
          <div
            key={service.id}
            className={`${card} p-4 ${
              selectedService?.id === service.id
                ? "border-brand-green ring-2 ring-brand-green/20"
                : ""
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className={`${heading} font-semibold`}>{service.name}</p>
                {service.description && (
                  <p className={`${muted} mt-1 text-sm`}>{service.description}</p>
                )}
              </div>
              <p className="font-bold text-brand-green">
                {service.price !== null && service.price !== undefined
                  ? t("pro.servicePrice", { price: formatNumber(service.price) })
                  : t("pro.onRequest")}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedService(service);
                setMessage("");
              }}
              className={`${btnPrimary} mt-3`}
            >
              {t("pro.requestService")}
            </button>
          </div>
        ))}
      </div>

      {selectedService && (
        <div className={`${noticeCls.info} mt-6 p-5`}>
          <h3 className={`${heading} font-semibold`}>
            {t("pro.requestTitle")} — « {selectedService.name} »
          </h3>
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            rows={3}
            placeholder={t("pro.messagePlaceholder")}
            className={`${input} mt-3`}
          />
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={requestSubmitting}
              onClick={handleRequest}
              className={`${btnPrimary} disabled:opacity-50`}
            >
              {requestSubmitting ? t("common.loading") : t("pro.saveRequest")}
            </button>
            <button
              type="button"
              onClick={() => setSelectedService(null)}
              className={btnSecondary}
            >
              {t("common.cancel")}
            </button>
          </div>
        </div>
      )}

      <h2 className={`${heading} mt-8 text-lg`}>{t("pro.reviewsTitle")}</h2>
      <div className="mt-3 space-y-3">
        {pro.reviews.length === 0 && (
          <p className={`${muted} text-sm`}>{t("pro.noReviews")}</p>
        )}
        {pro.reviews.map((review) => (
          <div key={review.id} className={`${card} p-4`}>
            <div className="flex items-center justify-between">
              <p className={`${heading} text-sm font-semibold`}>
                {"★".repeat(review.rating)}
                <span className="text-gray-300 dark:text-slate-600">{"★".repeat(5 - review.rating)}</span>
                <span className="ml-2 font-normal text-inherit">{review.author_name ?? t("store.author")}</span>
              </p>
              <span className={`${muted} text-xs`}>{formatDate(review.created_at)}</span>
            </div>
            {review.comment && <p className={`${muted} mt-2 text-sm`}>{review.comment}</p>}
          </div>
        ))}
      </div>

      {reportOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setReportOpen(false)}
        >
          <div
            className={`${card} w-full max-w-md p-6 shadow-xl`}
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className={`${heading} text-lg`}>{t("report.targetProfessional")}</h3>
            <label className="mt-4 block">
              <span className={`${label} mb-1`}>{t("report.reason")}</span>
              <select
                value={reportReason}
                onChange={(event) => setReportReason(event.target.value)}
                className={input}
              >
                {reportReasons.map((reason) => (
                  <option key={reason} value={reason}>
                    {reason}
                  </option>
                ))}
              </select>
            </label>
            <label className="mt-3 block">
              <span className={`${label} mb-1`}>{t("report.details")}</span>
              <textarea
                value={reportDescription}
                onChange={(event) => setReportDescription(event.target.value)}
                rows={3}
                className={input}
              />
            </label>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setReportOpen(false)}
                className={btnSecondary}
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                onClick={handleReport}
                className={btnDanger}
              >
                {t("report.send")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}