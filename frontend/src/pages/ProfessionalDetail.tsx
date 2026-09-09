// Fiche professionnel : profil, services, tarifs et demande de service.
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getProfessional } from "../services/professionals";
import { createServiceRequest } from "../services/serviceRequests";
import { createReport } from "../services/reviews";
import type { ProfessionalDetail as ProfessionalDetailType, Service } from "../types";
import { FORMAT } from "../types";
import { useAuth } from "../hooks/useAuth";
import ErrorMessage from "../components/common/ErrorMessage";
import Spinner from "../components/common/Spinner";
import { getApiErrorMessage } from "../utils/apiError";

function formatDate(value?: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("fr-FR", { dateStyle: "long" });
}

export default function ProfessionalDetail() {
  const { id } = useParams<{ id: string }>();
  const professionalId = Number(id);
  const { user } = useAuth();
  const navigate = useNavigate();

  const [pro, setPro] = useState<ProfessionalDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

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

  if (loading) {
    return <Spinner fullScreen />;
  }

  if (error || !pro) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <ErrorMessage message={error ?? "Professionnel introuvable."} />
        <Link to="/professionnels" className="mt-4 inline-block text-brand-green hover:underline">
          ← Annuaire des professionnels
        </Link>
      </div>
    );
  }

  const handleRequest = async () => {
    if (!selectedService) return;
    if (!user) {
      navigate("/login", { state: { from: `/professionnels/${professionalId}` } });
      return;
    }
    setRequestSubmitting(true);
    setError(null);
    try {
      const created = await createServiceRequest(selectedService.id, message.trim() || undefined);
      setNotice(
        `Demande n°${created.id} envoyée ! Le professionnel vous répondra bientôt (statut : ${created.status}).`,
      );
      setMessage("");
      setSelectedService(null);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setRequestSubmitting(false);
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
      setNotice("Signalement envoyé. Merci d'avoir aidé la communauté !");
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <Link to="/professionnels" className="text-sm text-brand-green hover:underline">
        ← Annuaire des professionnels
      </Link>

      {notice && (
        <div
          className="mt-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"
          role="status"
        >
          {notice}
        </div>
      )}
      {error && <div className="mt-4"><ErrorMessage message={error} /></div>}

      <div className="mt-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
              {pro.profession}
              {pro.is_verified && (
                <span
                  className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700"
                  title="Profil vérifié par l'équipe MboaFind"
                >
                  Vérifié
                </span>
              )}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {[pro.user_name, pro.city].filter(Boolean).join(" · ")}
            </p>
            {pro.phone && (
              <p className="mt-1 text-sm text-gray-500">
                📞 <a href={`tel:${pro.phone}`} className="hover:text-brand-green">{pro.phone}</a>
              </p>
            )}
            {pro.bio && <p className="mt-3 max-w-2xl text-sm text-gray-600">{pro.bio}</p>}
            <p className="mt-2 text-xs text-gray-400">
              {pro.rating_count > 0
                ? `Note moyenne : ★ ${pro.rating_avg?.toFixed(1)} (${pro.rating_count} avis)`
                : "Aucun avis pour le moment"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setReportOpen(true)}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
          >
            Signaler ce profil
          </button>
        </div>
      </div>

      <h2 className="mt-8 text-lg font-semibold text-gray-900">Services proposés</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {pro.services.length === 0 && (
          <p className="text-sm text-gray-500">Aucun service publié pour le moment.</p>
        )}
        {pro.services.map((service) => (
          <div
            key={service.id}
            className={`rounded-xl border bg-white p-4 shadow-sm ${
              selectedService?.id === service.id ? "border-brand-green ring-2 ring-brand-green/20" : "border-gray-200"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-gray-900">{service.name}</p>
                {service.description && (
                  <p className="mt-1 text-sm text-gray-600">{service.description}</p>
                )}
              </div>
              <p className="font-bold text-brand-green">
                {service.price !== null && service.price !== undefined
                  ? `${FORMAT.format(service.price)} ${service.currency}`
                  : "Tarif sur demande"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedService(service);
                setMessage("");
              }}
              className="mt-3 rounded-md bg-brand-green px-4 py-2 text-sm font-semibold text-white hover:brightness-110"
            >
              Demander ce service
            </button>
          </div>
        ))}
      </div>

      {selectedService && (
        <div className="mt-6 rounded-xl border border-brand-green bg-green-50 p-5">
          <h3 className="font-semibold text-gray-900">
            Demande pour « {selectedService.name} »
          </h3>
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            rows={3}
            placeholder="Décrivez votre besoin : marque, modèle, urgence, adresse…"
            className="mt-3 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/30"
          />
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={requestSubmitting}
              onClick={handleRequest}
              className="rounded-md bg-brand-green px-5 py-2 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-50"
            >
              {requestSubmitting ? "Envoi en cours…" : "Envoyer la demande"}
            </button>
            <button
              type="button"
              onClick={() => setSelectedService(null)}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      <h2 className="mt-8 text-lg font-semibold text-gray-900">Avis clients</h2>
      <div className="mt-3 space-y-3">
        {pro.reviews.length === 0 && (
          <p className="text-sm text-gray-500">Aucun avis publié pour le moment.</p>
        )}
        {pro.reviews.map((review) => (
          <div key={review.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-900">
                {"★".repeat(review.rating)}
                <span className="text-gray-300">{"★".repeat(5 - review.rating)}</span>
                <span className="ml-2 font-normal text-gray-500">
                  {review.author_name ?? "Utilisateur"}
                </span>
              </p>
              <span className="text-xs text-gray-400">{formatDate(review.created_at)}</span>
            </div>
            {review.comment && <p className="mt-2 text-sm text-gray-600">{review.comment}</p>}
          </div>
        ))}
      </div>

      {reportOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setReportOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-gray-900">Signaler ce professionnel</h3>
            <label className="mt-4 block">
              <span className="mb-1 block text-sm font-medium text-gray-700">Motif</span>
              <select
                value={reportReason}
                onChange={(event) => setReportReason(event.target.value)}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/30"
              >
                {["Faux professionnel", "Localisation incorrecte", "Contenu abusif", "Autre"].map(
                  (reason) => (
                    <option key={reason} value={reason}>
                      {reason}
                    </option>
                  ),
                )}
              </select>
            </label>
            <label className="mt-3 block">
              <span className="mb-1 block text-sm font-medium text-gray-700">Détails (optionnel)</span>
              <textarea
                value={reportDescription}
                onChange={(event) => setReportDescription(event.target.value)}
                rows={3}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/30"
              />
            </label>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setReportOpen(false)}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleReport}
                className="rounded-md bg-brand-red px-4 py-2 text-sm font-semibold text-white hover:brightness-110"
              >
                Envoyer le signalement
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}