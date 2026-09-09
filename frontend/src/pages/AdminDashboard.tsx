// Administration : files de moderation (signalements et avis).
import { useCallback, useEffect, useState } from "react";
import ErrorMessage from "../components/common/ErrorMessage";
import {
  decideReport,
  decideReview,
  listAdminReports,
  listAdminReviews,
  type ModerationPage,
} from "../services/admin";
import type { ReportAdmin, Review } from "../types";
import { getApiErrorMessage } from "../utils/apiError";
import { useI18n } from "../i18n/I18nContext";
import {
  btnPrimary,
  btnSecondary,
  card,
  muted,
  heading,
  badge,
  input,
} from "../styles/classes";

type Section = "reports" | "reviews";

export default function AdminDashboard() {
  const { t, formatDate } = useI18n();

  const [section, setSection] = useState<Section>("reports");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<number | null>(null);

  const [reports, setReports] = useState<ReportAdmin[]>([]);
  const [reportFilter, setReportFilter] = useState("PENDING");

  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewFilter, setReviewFilter] = useState("PENDING");

  const loadReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const page: ModerationPage<ReportAdmin> = await listAdminReports({
        status: reportFilter || undefined,
      });
      setReports(page.items);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [reportFilter]);

  const loadReviews = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const page: ModerationPage<Review> = await listAdminReviews({
        moderation_status: reviewFilter || undefined,
      });
      setReviews(page.items);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [reviewFilter]);

  useEffect(() => {
    if (section === "reports") {
      void loadReports();
    } else {
      void loadReviews();
    }
  }, [section, loadReports, loadReviews]);

  const handleDecideReport = async (reportId: number, status: "RESOLVED" | "DISMISSED") => {
    setBusy(reportId);
    setError(null);
    try {
      await decideReport(reportId, status);
      await loadReports();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const handleDecideReview = async (reviewId: number, moderationStatus: "APPROVED" | "REJECTED") => {
    setBusy(reviewId);
    setError(null);
    try {
      await decideReview(reviewId, moderationStatus);
      await loadReviews();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const reportStatusClass = (status: string): string =>
    status === "RESOLVED"
      ? badge.green
      : status === "DISMISSED"
        ? badge.slate
        : badge.yellow;

  const reportStatusLabel = (status: string): string =>
    status === "PENDING"
      ? t("admin.pending")
      : status === "RESOLVED"
        ? t("admin.resolved")
        : t("admin.dismissed");

  const reviewStatusLabel = (status: string): string =>
    status === "PENDING"
      ? t("admin.pending")
      : status === "APPROVED"
        ? t("admin.approved")
        : t("admin.rejected");

  const sectionClass = (active: Section) =>
    `border-b-2 px-4 py-2 text-sm font-medium ${
      section === active
        ? "border-brand-green text-brand-green"
        : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
    }`;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className={`${heading} text-2xl`}>{t("admin.title")}</h1>

      <div className="mt-4 flex items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-700">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setSection("reports")}
            className={sectionClass("reports")}
          >
            {t("admin.reports")}
          </button>
          <button
            type="button"
            onClick={() => setSection("reviews")}
            className={sectionClass("reviews")}
          >
            {t("admin.reviews")}
          </button>
        </div>
        {section === "reports" ? (
          <select
            value={reportFilter}
            onChange={(event) => setReportFilter(event.target.value)}
            className={input}
          >
            <option value="PENDING">{t("admin.pending")}</option>
            <option value="">{t("admin.all")}</option>
            <option value="RESOLVED">{t("admin.resolved")}</option>
            <option value="DISMISSED">{t("admin.dismissed")}</option>
          </select>
        ) : (
          <select
            value={reviewFilter}
            onChange={(event) => setReviewFilter(event.target.value)}
            className={input}
          >
            <option value="PENDING">{t("admin.pending")}</option>
            <option value="">{t("admin.all")}</option>
            <option value="APPROVED">{t("admin.approved")}</option>
            <option value="REJECTED">{t("admin.rejected")}</option>
          </select>
        )}
      </div>

      <div className="mt-4">
        {loading ? (
          <p className={`${muted} py-10 text-center text-sm`}>{t("common.loading")}</p>
        ) : error ? (
          <ErrorMessage message={error} />
        ) : section === "reports" ? (
          <div className="space-y-3">
            {reports.length === 0 && (
              <p className={`${muted} text-sm`}>{t("admin.empty")}</p>
            )}
            {reports.map((report) => (
              <div key={report.id} className={`${card} p-4`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className={`${heading} text-sm font-semibold`}>
                      {t("admin.reporter")} : {report.reporter_name ?? "â€”"}
                    </p>
                    <p className={`${muted} mt-1 text-xs`}>
                      {t("admin.target")} : {report.target_type} nÂ°{report.target_id}
                    </p>
                    <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">
                      {t("admin.reason")} : {report.reason}
                    </p>
                    {report.description && (
                      <p className="mt-2 rounded-md bg-slate-100 px-3 py-2 text-sm text-slate-600 dark:bg-slate-700/60 dark:text-slate-300">
                        {report.description}
                      </p>
                    )}
                    <p className={`${muted} mt-1 text-xs`}>
                      {t("product.updatedAt", { date: formatDate(report.created_at) })}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <span className={reportStatusClass(report.status)}>
                      {reportStatusLabel(report.status)}
                    </span>
                    {report.status === "PENDING" && (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={busy === report.id}
                          onClick={() => void handleDecideReport(report.id, "RESOLVED")}
                          className={`${btnPrimary} px-3 py-1.5 text-xs`}
                        >
                          {t("admin.resolve")}
                        </button>
                        <button
                          type="button"
                          disabled={busy === report.id}
                          onClick={() => void handleDecideReport(report.id, "DISMISSED")}
                          className={`${btnSecondary} px-3 py-1.5 text-xs`}
                        >
                          {t("admin.dismiss")}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {reviews.length === 0 && (
              <p className={`${muted} text-sm`}>{t("admin.empty")}</p>
            )}
            {reviews.map((review) => (
              <div key={review.id} className={`${card} p-4`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`${heading} text-sm`}>
                        {"â˜…".repeat(review.rating)}
                      </span>
                      <span className={reportStatusClass(review.moderation_status)}>
                        {reviewStatusLabel(review.moderation_status)}
                      </span>
                    </div>
                    <p className={`${muted} mt-1 text-sm`}>
                      {t("admin.author")} : {review.author_name ?? "â€”"}
                    </p>
                    {review.comment && (
                      <p className="mt-2 rounded-md bg-slate-100 px-3 py-2 text-sm text-slate-600 dark:bg-slate-700/60 dark:text-slate-300">
                        {review.comment}
                      </p>
                    )}
                    <p className={`${muted} mt-1 text-xs`}>
                      {review.store_id
                        ? `${t("favorites.store")} nÂ°${review.store_id}`
                        : `${t("favorites.professional")} nÂ°${review.professional_id}`}
                      {" Â· "}
                      {formatDate(review.created_at)}
                    </p>
                  </div>
                  {review.moderation_status === "PENDING" && (
                    <div className="flex shrink-0 flex-col gap-2">
                      <button
                        type="button"
                        disabled={busy === review.id}
                        onClick={() => void handleDecideReview(review.id, "APPROVED")}
                        className={`${btnPrimary} px-3 py-1.5 text-xs`}
                      >
                        {t("admin.approve")}
                      </button>
                      <button
                        type="button"
                        disabled={busy === review.id}
                        onClick={() => void handleDecideReview(review.id, "REJECTED")}
                        className={`${btnSecondary} px-3 py-1.5 text-xs`}
                      >
                        {t("admin.reject")}
                      </button>
                    </div>
                  )}
                </div>
              </div>
))}
          </div>
        )}
      </div>
    </div>
  );
}
