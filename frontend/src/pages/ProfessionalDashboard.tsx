// Tableau de bord professionnel : profil, services et demandes reçues.
import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  createService,
  deleteService,
  getProfessionalProfile,
  upsertProfessionalProfile,
} from "../services/professionalDashboard";
import {
  acceptRequest,
  completeRequest,
  declineRequest,
  listInboxRequests,
  startRequest,
} from "../services/serviceRequests";
import type { ProfessionalProfile, Service, ServiceRequest } from "../types";
import { FORMAT } from "../types";
import ErrorMessage from "../components/common/ErrorMessage";
import Spinner from "../components/common/Spinner";
import { getApiErrorMessage } from "../utils/apiError";

const inputClass =
  "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/30";

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Créée",
  ACCEPTED: "Acceptée",
  DECLINED: "Refusée",
  IN_PROGRESS: "En cours",
  COMPLETED: "Terminée",
  CANCELLED: "Annulée",
};

export default function ProfessionalDashboard() {
  const [profile, setProfile] = useState<ProfessionalProfile | null>(null);
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Profil
  const [profession, setProfession] = useState("");
  const [bio, setBio] = useState("");
  const [city, setCity] = useState("");
  const [profileSubmitting, setProfileSubmitting] = useState(false);

  // Services
  const [serviceName, setServiceName] = useState("");
  const [servicePrice, setServicePrice] = useState("");
  const [serviceSubmitting, setServiceSubmitting] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [prof, inbox] = await Promise.all([
        getProfessionalProfile(),
        listInboxRequests(),
      ]);
      setProfile(prof);
      setProfession(prof.profession);
      setBio(prof.bio ?? "");
      setCity(prof.city ?? "");
      setRequests(inbox.items);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleProfileSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setProfileSubmitting(true);
    setError(null);
    try {
      const updated = await upsertProfessionalProfile({
        profession,
        bio: bio.trim() || undefined,
        city: city.trim() || undefined,
      });
      setProfile(updated);
      setProfession(updated.profession);
      setBio(updated.bio ?? "");
      setCity(updated.city ?? "");
      setNotice("Profil enregistré.");
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setProfileSubmitting(false);
    }
  };

  const handleServiceSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setServiceSubmitting(true);
    setError(null);
    try {
      await createService({
        name: serviceName,
        price: servicePrice ? Number(servicePrice) : undefined,
      });
      setNotice("Service ajouté.");
      setServiceName("");
      setServicePrice("");
      const fresh = await getProfessionalProfile();
      setProfile(fresh);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setServiceSubmitting(false);
    }
  };

  const handleDeleteService = async (service: Service) => {
    if (!window.confirm(`Supprimer le service « ${service.name} » ?`)) return;
    try {
      await deleteService(service.id);
      const fresh = await getProfessionalProfile();
      setProfile(fresh);
      setNotice("Service supprimé.");
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };

  const refreshRequests = useCallback(async () => {
    const inbox = await listInboxRequests();
    setRequests(inbox.items);
  }, []);

  const handleRequestAction = async (requestId: number, action: "accept" | "decline" | "start" | "complete") => {
    setError(null);
    try {
      const handlers = {
        accept: acceptRequest,
        decline: declineRequest,
        start: startRequest,
        complete: completeRequest,
      };
      await handlers[action](requestId);
      await refreshRequests();
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };

  if (loading) {
    return <Spinner fullScreen />;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900">Espace professionnel</h1>
      <p className="mt-1 text-sm text-gray-600">
        Gérez votre profil, vos services et les demandes de vos clients.
      </p>

      {notice && (
        <div
          className="mt-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"
          role="status"
        >
          {notice}
        </div>
      )}
      {error && <div className="mt-4"><ErrorMessage message={error} /></div>}

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* ---- Profil ---- */}
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Mon profil</h2>
          <form onSubmit={handleProfileSubmit} className="mt-4 space-y-3">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700">Métier</span>
              <input
                type="text"
                required
                value={profession}
                onChange={(event) => setProfession(event.target.value)}
                placeholder="Ex : Réparateur de téléphones"
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700">Ville</span>
              <input
                type="text"
                value={city}
                onChange={(event) => setCity(event.target.value)}
                placeholder="Ex : Yaoundé"
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700">Présentation</span>
              <textarea
                value={bio}
                onChange={(event) => setBio(event.target.value)}
                rows={3}
                placeholder="Votre expérience, votre zone d'intervention…"
                className={inputClass}
              />
            </label>
            <button
              type="submit"
              disabled={profileSubmitting}
              className="rounded-md bg-brand-green px-5 py-2 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-50"
            >
              {profileSubmitting ? "Enregistrement…" : "Enregistrer mon profil"}
            </button>
          </form>
        </section>

        {/* ---- Services ---- */}
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Mes services</h2>
          <form onSubmit={handleServiceSubmit} className="mt-4 space-y-3">
            <input
              type="text"
              required
              value={serviceName}
              onChange={(event) => setServiceName(event.target.value)}
              placeholder="Nom du service (ex : Changement d'écran)"
              className={inputClass}
            />
            <input
              type="number"
              min="0"
              value={servicePrice}
              onChange={(event) => setServicePrice(event.target.value)}
              placeholder="Tarif indicatif (FCFA)"
              className={inputClass}
            />
            <button
              type="submit"
              disabled={serviceSubmitting}
              className="rounded-md bg-brand-green px-5 py-2 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-50"
            >
              {serviceSubmitting ? "Enregistrement…" : "Ajouter le service"}
            </button>
          </form>

          <div className="mt-4 space-y-2">
            {profile?.services.length === 0 && (
              <p className="text-sm text-gray-500">Aucun service publié.</p>
            )}
            {profile?.services.map((service) => (
              <div
                key={service.id}
                className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2"
              >
                <div>
                  <p className="font-medium text-gray-900">{service.name}</p>
                  <p className="text-xs text-gray-500">
                    {service.price !== null && service.price !== undefined
                      ? `${FORMAT.format(service.price)} ${service.currency}`
                      : "Tarif sur demande"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteService(service)}
                  className="text-xs font-medium text-brand-red hover:underline"
                >
                  Supprimer
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* ---- Demandes reçues ---- */}
      <section className="mt-8 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">
          Demandes reçues ({requests.length})
        </h2>
        {requests.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">
            Aucune demande pour le moment. Publiez vos services pour recevoir des clients.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {requests.map((request) => (
              <div key={request.id} className="rounded-lg border border-gray-200 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-gray-900">{request.service_name}</p>
                    <p className="text-sm text-gray-500">
                      Client : {request.client_id} · {request.profession}
                    </p>
                    {request.price !== null && request.price !== undefined && (
                      <p className="text-sm text-gray-500">
                        Tarif : {FORMAT.format(request.price)} {request.currency}
                      </p>
                    )}
                    {request.message && (
                      <p className="mt-2 rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-600">
                        {request.message}
                      </p>
                    )}
                  </div>
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
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {request.status === "PENDING" && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleRequestAction(request.id, "accept")}
                        className="rounded-md bg-brand-green px-3 py-1.5 text-xs font-semibold text-white hover:brightness-110"
                      >
                        Accepter
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRequestAction(request.id, "decline")}
                        className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-semibold text-brand-red hover:bg-red-50"
                      >
                        Refuser
                      </button>
                    </>
                  )}
                  {request.status === "ACCEPTED" && (
                    <button
                      type="button"
                      onClick={() => handleRequestAction(request.id, "start")}
                      className="rounded-md bg-brand-yellow/40 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:brightness-95"
                    >
                      Démarrer l'intervention
                    </button>
                  )}
                  {request.status === "IN_PROGRESS" && (
                    <button
                      type="button"
                      onClick={() => handleRequestAction(request.id, "complete")}
                      className="rounded-md bg-brand-green px-3 py-1.5 text-xs font-semibold text-white hover:brightness-110"
                    >
                      Terminer
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}