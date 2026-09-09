// Profil utilisateur : identité + historique (demandes, avis, signalements) selon le rôle.
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Spinner from "../components/common/Spinner";
import ErrorMessage from "../components/common/ErrorMessage";
import { useAuth } from "../hooks/useAuth";
import { cancelRequest, listMyRequests } from "../services/serviceRequests";
import { listMyReports, listMyReviews } from "../services/reviews";
import type { Report, Review, ServiceRequest, UserRole } from "../types";
import { FORMAT } from "../types";
import { getApiErrorMessage } from "../utils/apiError";

const ROLE_LABELS: Record<UserRole, string> = {
  CLIENT: "Client",
  COMMERCANT: "Commerçant",
  PROFESSIONNEL: "Professionnel",
  ADMIN: "Administrateur",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Créée",
  ACCEPTED: "Acceptée",
  DECLINED: "Refusée",
  IN_PROGRESS: "En cours",
  COMPLETED: "Terminée",
  CANCELLED: "Annulée",
};

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function Profile() {
  const { user, isLoading, logout } = useAuth();

  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [tab, setTab] = useState<"requests" | "reviews" | "reports">("requests");
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    if (!user) return;
    setLoadingHistory(true);
    setError(null);
    const tasks: Promise<unknown>[] = [];
    const isClient = user.role === "CLIENT";
    if (isClient) {
      tasks.push(
        listMyRequests().then((page) => setRequests(page.items)),
        listMyReviews().then(setReviews),
        listMyReports().then((page) => setReports(page.items)),
      );
    }
    try {
      await Promise.all(tasks);
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
    if (!window.confirm("Annuler cette demande de service ?")) return;
    try {
      await cancelRequest(requestId);
      setNotice("Demande annulée.");
      const page = await listMyRequests();
      setRequests(page.items);
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };

  const isClient = user.role === "CLIENT";

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-2xl font-bold text-gray-900">Mon profil</h1>
      <p className="mt-1 text-sm text-gray-600">
        Gérez les informations de votre compte MboaFind.
      </p>

      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-green text-2xl font-bold text-white">
              {(user.full_name ?? user.email).charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-lg font-semibold text-gray-900">
                {user.full_name ?? "—"}
              </p>
              <p className="text-sm text-gray-500">{user.email}</p>
            </div>
          </div>
          <span className="rounded-full bg-brand-yellow/20 px-3 py-1 text-xs font-semibold text-gray-700">
            {ROLE_LABELS[user.role]}
          </span>
        </div>

        <dl className="mt-6 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm font-medium text-gray-500">Téléphone</dt>
            <dd className="mt-1 text-gray-900">{user.phone ?? "Non renseigné"}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Membre depuis</dt>
            <dd className="mt-1 text-gray-900">{formatDate(user.created_at)}</dd>
          </div>
        </dl>

        <div className="mt-6 flex flex-wrap gap-2 border-t border-gray-100 pt-4">
          {user.role === "COMMERCANT" && (
            <Link
              to="/commercant"
              className="rounded-md bg-brand-green px-4 py-2 text-sm font-semibold text-white hover:brightness-110"
            >
              Gérer ma boutique →
            </Link>
          )}
          {user.role === "PROFESSIONNEL" && (
            <Link
              to="/professionnel"
              className="rounded-md bg-brand-green px-4 py-2 text-sm font-semibold text-white hover:brightness-110"
            >
              Mon espace professionnel →
            </Link>
          )}
          <button
            type="button"
            onClick={logout}
            className="rounded-md bg-brand-red px-4 py-2 text-sm font-semibold text-white hover:brightness-110"
          >
            Déconnexion
          </button>
        </div>
      </div>

      {isClient && (
        <div className="mt-8">
          {notice && (
            <div
              className="mb-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"
              role="status"
            >
              {notice}
            </div>
          )}
          {error && <div className="mb-4"><ErrorMessage message={error} /></div>}

          <div className="flex gap-2 border-b border-gray-200">
            {(
              [
                { key: "requests", label: "Mes demandes" },
                { key: "reviews", label: "Mes avis" },
                { key: "reports", label: "Mes signalements" },
              ] as const
            ).map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setTab(item.key)}
                className={`border-b-2 px-4 py-2 text-sm font-medium ${
                  tab === item.key
                    ? "border-brand-green text-brand-green"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {loadingHistory ? (
            <p className="py-8 text-center text-sm text-gray-500">Chargement…</p>
          ) : tab === "requests" ? (
            <div className="mt-4 space-y-3">
              {requests.length === 0 && (
                <p className="text-sm text-gray-500">
                  Aucune demande de service.{" "}
                  <Link to="/professionnels" className="text-brand-green hover:underline">
                    Trouver un professionnel →
                  </Link>
                </p>
              )}
              {requests.map((request) => (
                <div key={request.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-gray-900">{request.service_name}</p>
                      <p className="text-sm text-gray-500">
                        {request.professional_name} · {request.profession}
                      </p>
                      {request.price !== null && request.price !== undefined && (
                        <p className="text-xs text-gray-400">
                          {FORMAT.format(request.price)} {request.currency}
                        </p>
                      )}
                      {request.message && (
                        <p className="mt-2 rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-600">
                          {request.message}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-gray-400">Envoyée le {formatDate(request.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          request.status === "COMPLETED"
                            ? "bg-green-100 text-green-700"
                            : request.status === "DECLINED" || request.status === "CANCELLED"
                              ? "bg-red-100 text-red-700"
                              : request.status === "IN_PROGRESS"
                                ? "bg-brand-yellow/30 text-gray-700"
                                : request.status === "ACCEPTED"
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {STATUS_LABELS[request.status]}
                      </span>
                      {(request.status === "PENDING" || request.status === "ACCEPTED") && (
                        <button
                          type="button"
                          onClick={() => handleCancelRequest(request.id)}
                          className="text-xs font-medium text-brand-red hover:underline"
                        >
                          Annuler
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
                <p className="text-sm text-gray-500">
                  Aucun avis publié. Laissez un avis après une visite ou une prestation.
                </p>
              )}
              {reviews.map((review) => (
                <div key={review.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                  <p className="text-sm text-gray-500">
                    {"★".repeat(review.rating)}
                    <span className="text-gray-300">{"★".repeat(5 - review.rating)}</span>
                  </p>
                  {review.comment && <p className="mt-1 text-sm text-gray-600">{review.comment}</p>}
                  <p className="mt-1 text-xs text-gray-400">Le {formatDate(review.created_at)}</p>
                  <p className="mt-1 text-xs text-gray-400">
                    Statut de modération : {review.moderation_status}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {reports.length === 0 && (
                <p className="text-sm text-gray-500">
                  Aucun signalement. Aidez la communauté en signalant les informations incorrectes.
                </p>
              )}
              {reports.map((report) => (
                <div key={report.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900">
                      {report.target_type} n°{report.target_id} — {report.reason}
                    </p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        report.status === "RESOLVED"
                          ? "bg-green-100 text-green-700"
                          : report.status === "DISMISSED"
                            ? "bg-gray-100 text-gray-500"
                            : "bg-brand-yellow/30 text-gray-700"
                      }`}
                    >
                      {report.status === "PENDING"
                        ? "En attente"
                        : report.status === "RESOLVED"
                          ? "Résolu"
                          : "Rejeté"}
                    </span>
                  </div>
                  {report.description && (
                    <p className="mt-1 text-sm text-gray-600">{report.description}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-400">Le {formatDate(report.created_at)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}