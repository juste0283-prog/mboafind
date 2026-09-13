// Administration : console complète (stats, modération, boutiques,
// professionnels et comptes utilisateurs).
import { useCallback, useEffect, useState } from "react";
import ErrorMessage from "../components/common/ErrorMessage";
import {
  decideReport,
  decideReview,
  getAdminOverview,
  listAdminProfessionals,
  listAdminReports,
  listAdminReviews,
  listAdminStores,
  listAdminUsers,
  setProfessionalVerified,
  setStoreVerified,
  setUserStatus,
  type ModerationPage,
} from "../services/admin";
import type {
  AdminOverview,
  AdminProfessionalItem,
  AdminStoreItem,
  AdminUserItem,
  ReportAdmin,
  Review,
} from "../types";
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
  btnDanger,
} from "../styles/classes";

type Section =
  | "overview"
  | "reports"
  | "reviews"
  | "stores"
  | "professionals"
  | "users";

const ROLE_LABELS: Record<string, string> = {
  CLIENT: "auth.roles.client",
  COMMERCANT: "auth.roles.merchant",
  PROFESSIONNEL: "auth.roles.pro",
  ADMIN: "auth.role.admin",
};

export default function AdminDashboard() {
  const { t, formatNumber, formatDate } = useI18n();

  const [section, setSection] = useState<Section>("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<number | null>(null);

  const [overview, setOverview] = useState<AdminOverview | null>(null);

  const [reports, setReports] = useState<ReportAdmin[]>([]);
  const [reportFilter, setReportFilter] = useState("PENDING");

  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewFilter, setReviewFilter] = useState("PENDING");

  const [stores, setStores] = useState<AdminStoreItem[]>([]);
  const [professionals, setProfessionals] = useState<AdminProfessionalItem[]>([]);
  const [users, setUsers] = useState<AdminUserItem[]>([]);

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setOverview(await getAdminOverview());
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

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

  const loadStores = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await listAdminStores();
      setStores(list.items);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadProfessionals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await listAdminProfessionals();
      setProfessionals(list.items);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await listAdminUsers();
      setUsers(list.items);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (section === "overview") void loadOverview();
    else if (section === "reports") void loadReports();
    else if (section === "reviews") void loadReviews();
    else if (section === "stores") void loadStores();
    else if (section === "professionals") void loadProfessionals();
    else void loadUsers();
  }, [section, loadOverview, loadReports, loadReviews, loadStores, loadProfessionals, loadUsers]);

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

  const handleToggleStoreVerify = async (store: AdminStoreItem) => {
    setBusy(store.id);
    setError(null);
    try {
      await setStoreVerified(store.id, !store.is_verified);
      await loadStores();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const handleToggleProVerify = async (pro: AdminProfessionalItem) => {
    setBusy(pro.id);
    setError(null);
    try {
      await setProfessionalVerified(pro.id, !pro.is_verified);
      await loadProfessionals();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const handleToggleUserStatus = async (user: AdminUserItem) => {
    setBusy(user.id);
    setError(null);
    try {
      await setUserStatus(user.id, !user.is_active);
      await loadUsers();
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

  const statCard = (label: string, value: string | number, highlight = false) => (
    <div className={`${card} ${highlight ? "border-brand-green/60" : ""} p-4`}>
      <p className={`${muted} text-xs`}>{label}</p>
      <p className={`${heading} mt-1 text-2xl font-bold`}>{value}</p>
    </div>
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className={`${heading} text-2xl`}>{t("admin.title")}</h1>

      <div className="mt-4 flex items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-700">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSection("overview")}
            className={sectionClass("overview")}
          >
            {t("admin.overview")}
          </button>
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
          <button
            type="button"
            onClick={() => setSection("stores")}
            className={sectionClass("stores")}
          >
            {t("admin.stores")}
          </button>
          <button
            type="button"
            onClick={() => setSection("professionals")}
            className={sectionClass("professionals")}
          >
            {t("admin.professionals")}
          </button>
          <button
            type="button"
            onClick={() => setSection("users")}
            className={sectionClass("users")}
          >
            {t("admin.users")}
          </button>
        </div>
        {(section === "reports" || section === "reviews") && (
          <select
            value={section === "reports" ? reportFilter : reviewFilter}
            onChange={(event) =>
              section === "reports"
                ? setReportFilter(event.target.value)
                : setReviewFilter(event.target.value)
            }
            className={input}
          >
            <option value="PENDING">{t("admin.pending")}</option>
            <option value="">{t("admin.all")}</option>
            {section === "reports" ? (
              <>
                <option value="RESOLVED">{t("admin.resolved")}</option>
                <option value="DISMISSED">{t("admin.dismissed")}</option>
              </>
            ) : (
              <>
                <option value="APPROVED">{t("admin.approved")}</option>
                <option value="REJECTED">{t("admin.rejected")}</option>
              </>
            )}
          </select>
        )}
      </div>

      <div className="mt-4">
        {loading ? (
          <p className={`${muted} py-10 text-center text-sm`}>{t("common.loading")}</p>
        ) : error ? (
          <ErrorMessage message={error} />
        ) : section === "overview" && overview ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {statCard(t("admin.statUsers"), formatNumber(overview.users_total))}
            {statCard(t("admin.statClients"), formatNumber(overview.users_clients))}
            {statCard(t("admin.statCommersants"), formatNumber(overview.users_commersants))}
            {statCard(t("admin.statPros"), formatNumber(overview.users_professionals))}
            {statCard(
              t("admin.statStoresVerified"),
              `${formatNumber(overview.stores_verified)} / ${formatNumber(overview.stores_total)}`,
              overview.stores_pending > 0,
            )}
            {statCard(t("admin.statProducts"), formatNumber(overview.products_total))}
            {statCard(t("admin.statPrices"), formatNumber(overview.prices_total))}
            {statCard(t("admin.statCategories"), formatNumber(overview.categories_total))}
            {statCard(
              t("admin.statPendingReports"),
              formatNumber(overview.reports_pending),
              overview.reports_pending > 0,
            )}
            {statCard(
              t("admin.statPendingReviews"),
              formatNumber(overview.reviews_pending),
              overview.reviews_pending > 0,
            )}
            {statCard(t("admin.statServiceRequests"), formatNumber(overview.service_requests_total))}
            {statCard(t("admin.statPriceUpdates"), formatNumber(overview.price_updates_total))}
          </div>
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
                      {t("admin.reporter")} : {report.reporter_name ?? "—"}
                    </p>
                    <p className={`${muted} mt-1 text-xs`}>
                      {t("admin.target")} : {report.target_type} n°{report.target_id}
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
        ) : section === "reviews" ? (
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
                        {"★".repeat(review.rating)}
                      </span>
                      <span className={reportStatusClass(review.moderation_status)}>
                        {reviewStatusLabel(review.moderation_status)}
                      </span>
                    </div>
                    <p className={`${muted} mt-1 text-sm`}>
                      {t("admin.author")} : {review.author_name ?? "—"}
                    </p>
                    {review.comment && (
                      <p className="mt-2 rounded-md bg-slate-100 px-3 py-2 text-sm text-slate-600 dark:bg-slate-700/60 dark:text-slate-300">
                        {review.comment}
                      </p>
                    )}
                    <p className={`${muted} mt-1 text-xs`}>
                      {review.store_id
                        ? `${t("favorites.store")} n°${review.store_id}`
                        : `${t("favorites.professional")} n°${review.professional_id}`}
                      {" · "}
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
        ) : section === "stores" ? (
          <div className="space-y-3">
            {stores.length === 0 && (
              <p className={`${muted} text-sm`}>{t("admin.empty")}</p>
            )}
            {stores.map((store) => (
              <div key={store.id} className={`${card} p-4`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className={`${heading} text-sm font-semibold`}>
                      {store.name}
                      <span
                        className={`ml-2 ${store.is_verified ? badge.green : badge.yellow}`}
                      >
                        {store.is_verified ? t("admin.verified") : t("admin.notVerified")}
                      </span>
                    </p>
                    <p className={`${muted} mt-1 text-xs`}>
                      {[store.city, store.province].filter(Boolean).join(" · ") || "—"}
                      {" · "}
                      {t("admin.owner")} : {store.owner_email ?? "—"}
                    </p>
                    <p className={`${muted} mt-1 text-xs`}>
                      {t("admin.productsCount", { count: store.products_count })}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      disabled={busy === store.id}
                      onClick={() => void handleToggleStoreVerify(store)}
                      className={`${store.is_verified ? btnSecondary : btnPrimary} px-3 py-1.5 text-xs`}
                    >
                      {store.is_verified ? t("admin.unverify") : t("admin.verify")}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : section === "professionals" ? (
          <div className="space-y-3">
            {professionals.length === 0 && (
              <p className={`${muted} text-sm`}>{t("admin.empty")}</p>
            )}
            {professionals.map((pro) => (
              <div key={pro.id} className={`${card} p-4`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className={`${heading} text-sm font-semibold`}>
                      {pro.user_name ?? pro.user_email}
                      <span
                        className={`ml-2 ${pro.is_verified ? badge.green : badge.yellow}`}
                      >
                        {pro.is_verified ? t("admin.verified") : t("admin.notVerified")}
                      </span>
                    </p>
                    <p className={`${muted} mt-1 text-xs`}>
                      {t("admin.profession")} : {pro.profession}
                      {pro.city ? ` · ${pro.city}` : ""}
                    </p>
                    <p className={`${muted} mt-1 text-xs`}>
                      {t("admin.email")} : {pro.user_email}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      disabled={busy === pro.id}
                      onClick={() => void handleToggleProVerify(pro)}
                      className={`${pro.is_verified ? btnSecondary : btnPrimary} px-3 py-1.5 text-xs`}
                    >
                      {pro.is_verified ? t("admin.unverify") : t("admin.verify")}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {users.length === 0 && (
              <p className={`${muted} text-sm`}>{t("admin.empty")}</p>
            )}
            {users.map((user) => (
              <div key={user.id} className={`${card} p-4`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className={`${heading} text-sm font-semibold`}>
                      {user.full_name ?? user.email}
                      <span
                        className={`ml-2 ${user.is_active ? badge.green : badge.red}`}
                      >
                        {user.is_active ? t("admin.active") : t("admin.suspended")}
                      </span>
                    </p>
                    <p className={`${muted} mt-1 text-xs`}>
                      {t("admin.email")} : {user.email}
                    </p>
                    <p className={`${muted} mt-1 text-xs`}>
                      {t("admin.role")} : {t(ROLE_LABELS[user.role] ?? "admin.all")}
                      {" · "}
                      {t("admin.joined", { date: formatDate(user.created_at) })}
                    </p>
                  </div>
                  {user.role !== "ADMIN" && (
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        disabled={busy === user.id}
                        onClick={() => void handleToggleUserStatus(user)}
                        className={`${user.is_active ? btnDanger : btnPrimary} px-3 py-1.5 text-xs`}
                      >
                        {user.is_active ? t("admin.suspend") : t("admin.reactivate")}
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