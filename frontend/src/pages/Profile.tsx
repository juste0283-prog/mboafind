// Profil utilisateur : identité + historique (demandes, avis, signalements) selon le rôle.
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Spinner from "../components/common/Spinner";
import ErrorMessage from "../components/common/ErrorMessage";
import { useAuth } from "../hooks/useAuth";
import { cancelRequest, listMyRequests } from "../services/serviceRequests";
import { listMyReports, listMyReviews } from "../services/reviews";
import { listFavorites, removeFavorite } from "../services/favorites";
import type {
  Favorite,
  Report,
  Review,
  ServiceRequest,
  UserRole,
} from "../types";
import { getApiErrorMessage } from "../utils/apiError";
import { useI18n } from "../i18n/I18nContext";
import {
  btnPrimary,
  btnDanger,
  card,
  muted,
  heading,
  badge,
  notice as noticeCls,
} from "../styles/classes";

export default function Profile() {
  const { user, isLoading, logout } = useAuth();
  const { t, formatNumber, formatDate } = useI18n();

  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [tab, setTab] = useState<
    "requests" | "reviews" | "reports" | "favorites"
  >("requests");
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const roleLabel = (role: UserRole): string =>
    ({
      CLIENT: t("auth.roles.client"),
      COMMERCANT: t("auth.roles.merchant"),
      PROFESSIONNEL: t("auth.roles.pro"),
      ADMIN: t("auth.role.admin"),
    })[role] ?? role;

  const statusClass = (status: string): string => {
    switch (status) {
      case "COMPLETED":
        return badge.green;
      case "DECLINED":
      case "CANCELLED":
        return badge.red;
      case "IN_PROGRESS":
        return badge.yellow;
      case "ACCEPTED":
        return badge.blue;
      default:
        return badge.slate;
    }
  };

  const statusLabel = (status: string): string => {
    const labels: Record<string, string> = {
      PENDING: t("profile.status.created"),
      ACCEPTED: t("profile.status.accepted"),
      DECLINED: t("profile.status.declined"),
      IN_PROGRESS: t("profile.status.in_progress"),
      COMPLETED: t("profile.status.completed"),
      CANCELLED: t("profile.status.cancelled"),
    };
    return labels[status] ?? status;
  };

  const reportStatusClass = (status: string): string =>
    status === "RESOLVED"
      ? badge.green
      : status === "DISMISSED"
        ? badge.slate
        : badge.yellow;

  const reportStatusLabel = (status: string): string =>
    status === "PENDING"
      ? t("profile.reportStatus.pending")
      : status === "RESOLVED"
        ? t("profile.reportStatus.resolved")
        : t("profile.reportStatus.dismissed");

  const loadHistory = useCallback(async () => {
    if (!user) return;
    setLoadingHistory(true);
    setError(null);
    try {
      const [requestsPage, reviewsList, reportsPage, favoritesList] =
        await Promise.all([
          listMyRequests(),
          listMyReviews(),
          listMyReports(),
          listFavorites(),
        ]);
      setRequests(requestsPage.items);
      setReviews(reviewsList);
      setReports(reportsPage.items);
      setFavorites(favoritesList);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoadingHistory(false);
    }
  }, [user]);

  useEffect(() => {
    if (user?.role === "CLIENT") {
      loadHistory();
    }
  }, [user, loadHistory]);

  if (isLoading || !user) {
    return <Spinner fullScreen />;
  }

  const handleCancelRequest = async (requestId: number) => {
    if (!window.confirm(t("common.deleteConfirm"))) return;
    try {
      await cancelRequest(requestId);
      setNotice(t("profile.cancelled"));
      const page = await listMyRequests();
      setRequests(page.items);
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };

  const handleRemoveFavorite = async (favoriteId: number) => {
    try {
      const favorite = favorites.find((f) => f.id === favoriteId);
      if (!favorite) return;
      await removeFavorite(favorite.item_type, favorite.item_id);
      setFavorites((prev) => prev.filter((f) => f.id !== favoriteId));
      setNotice(t("favorites.removed"));
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };

  const favoriteLink = (favorite: Favorite): string =>
    favorite.item_type === "PRODUCT"
      ? `/produits/${favorite.item_id}`
      : favorite.item_type === "STORE"
        ? `/boutiques/${favorite.item_id}`
        : `/professionnels/${favorite.item_id}`;

  const isClient = user.role === "CLIENT";

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className={`${heading} text-2xl`}>{t("profile.title")}</h1>
      <p className={`${muted} mt-1 text-sm`}>{t("profile.subtitle")}</p>

      <div className={`${card} mt-6 p-6`}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-green text-2xl font-bold text-white">
              {(user.full_name ?? user.email).charAt(0).toUpperCase()}
            </div>
            <div>
              <p className={`${heading} text-lg`}>{user.full_name ?? "—"}</p>
              <p className={`${muted} text-sm`}>{user.email}</p>
            </div>
          </div>
          <span className="rounded-full bg-brand-yellow/20 px-3 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200">
            {roleLabel(user.role)}
          </span>
        </div>

        <dl className="mt-6 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className={`${muted} text-sm font-medium`}>{t("profile.phone")}</dt>
            <dd className={`${heading} mt-1`}>{user.phone ?? t("profile.notSet")}</dd>
          </div>
          <div>
            <dt className={`${muted} text-sm font-medium`}>{t("profile.memberSince")}</dt>
            <dd className={`${heading} mt-1`}>{formatDate(user.created_at)}</dd>
          </div>
        </dl>

        <div className="mt-6 flex flex-wrap gap-2 border-t border-slate-100 pt-4 dark:border-slate-700">
          {user.role === "COMMERCANT" && (
            <Link to="/commercant" className={btnPrimary}>
              {t("profile.manager")}
            </Link>
          )}
          {user.role === "PROFESSIONNEL" && (
            <Link to="/professionnel" className={btnPrimary}>
              {t("profile.space")}
            </Link>
          )}
          <button type="button" onClick={logout} className={btnDanger}>
            {t("profile.logout")}
          </button>
        </div>
      </div>

      {isClient && (
        <div className="mt-8">
          {notice && <div className={`${noticeCls.success} mb-4`} role="status">{notice}</div>}
          {error && <div className="mb-4"><ErrorMessage message={error} /></div>}

          <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700">
            {(
              [
                { key: "requests", label: t("profile.tabs.requests") },
                { key: "reviews", label: t("profile.tabs.reviews") },
                { key: "reports", label: t("profile.tabs.reports") },
                { key: "favorites", label: t("favorites.tab") },
              ] as const
            ).map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setTab(item.key)}
                className={`border-b-2 px-4 py-2 text-sm font-medium ${
                  tab === item.key
                    ? "border-brand-green text-brand-green"
                    : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {loadingHistory ? (
            <p className={`${muted} py-8 text-center text-sm`}>{t("common.loading")}</p>
          ) : tab === "requests" ? (
            <div className="mt-4 space-y-3">
              {requests.length === 0 && (
                <p className={`${muted} text-sm`}>
                  {t("profile.noRequests")}{" "}
                  <Link to="/professionnels" className="text-brand-green hover:underline">
                    {t("profile.findPro")}
                  </Link>
                </p>
              )}
              {requests.map((request) => (
                <div key={request.id} className={`${card} p-4`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className={`${heading} font-semibold`}>{request.service_name}</p>
                      <p className={`${muted} text-sm`}>
                        {request.professional_name} · {request.profession}
                      </p>
                      {request.price !== null && request.price !== undefined && (
                        <p className={`${muted} text-xs`}>
                          {formatNumber(request.price)} {request.currency}
                        </p>
                      )}
                      {request.message && (
                        <p className="mt-2 rounded-md bg-slate-100 px-3 py-2 text-sm text-slate-600 dark:bg-slate-700/60 dark:text-slate-300">
                          {request.message}
                        </p>
                      )}
                      <p className={`${muted} mt-1 text-xs`}>
                        {t("profile.sentOn", { date: formatDate(request.created_at) })}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={statusClass(request.status)}>{statusLabel(request.status)}</span>
                      {(request.status === "PENDING" || request.status === "ACCEPTED") && (
                        <button
                          type="button"
                          onClick={() => handleCancelRequest(request.id)}
                          className="text-xs font-medium text-brand-red hover:underline"
                        >
                          {t("profile.cancel")}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : tab === "reviews" ? (
            <div className="mt-4 space-y-3">
              {reviews.length === 0 && (
                <p className={`${muted} text-sm`}>{t("profile.noReviews")}</p>
              )}
              {reviews.map((review) => (
                <div key={review.id} className={`${card} p-4`}>
                  <p className={`${heading} text-sm`}>
                    {"★".repeat(review.rating)}
                    <span className="text-gray-300 dark:text-slate-600">{"★".repeat(5 - review.rating)}</span>
                  </p>
                  {review.comment && <p className={`${muted} mt-1 text-sm`}>{review.comment}</p>}
                  <p className={`${muted} mt-1 text-xs`}>
                    {t("profile.by", { date: formatDate(review.created_at) })}
                  </p>
                  <p className={`${muted} mt-1 text-xs`}>
                    {t("profile.moderated", { status: review.moderation_status })}
                  </p>
                </div>
              ))}
            </div>
          ) : tab === "favorites" ? (
            <div className="mt-4 space-y-3">
              {favorites.length === 0 && (
                <p className={`${muted} text-sm`}>{t("favorites.empty")}</p>
              )}
              {favorites.map((favorite) => (
                <div key={favorite.id} className={`${card} p-4`}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className={`${heading} truncate font-semibold`}>
                        <Link
                          to={favoriteLink(favorite)}
                          className="hover:text-brand-green hover:underline"
                        >
                          {favorite.item_name ?? favorite.item_type}
                        </Link>
                      </p>
                      <p className={`${muted} text-xs`}>
                        {favorite.item_type === "PRODUCT"
                          ? t("favorites.product")
                          : favorite.item_type === "STORE"
                            ? t("favorites.store")
                            : t("favorites.professional")}
                        {favorite.item_city ? ` · ${favorite.item_city}` : ""}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleRemoveFavorite(favorite.id)}
                      className="text-xs font-medium text-brand-red hover:underline"
                    >
                      {t("favorites.remove")}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {reports.length === 0 && (
                <p className={`${muted} text-sm`}>{t("profile.noReports")}</p>
              )}
              {reports.map((report) => (
                <div key={report.id} className={`${card} p-4`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className={`${heading} text-sm font-medium`}>
                      {report.target_type} n°{report.target_id} — {report.reason}
                    </p>
                    <span className={reportStatusClass(report.status)}>
                      {reportStatusLabel(report.status)}
                    </span>
                  </div>
                  {report.description && (
                    <p className={`${muted} mt-1 text-sm`}>{report.description}</p>
                  )}
                  <p className={`${muted} mt-1 text-xs`}>
                    {t("profile.by", { date: formatDate(report.created_at) })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}