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
import ErrorMessage from "../components/common/ErrorMessage";
import Spinner from "../components/common/Spinner";
import { getApiErrorMessage } from "../utils/apiError";
import { useI18n } from "../i18n/I18nContext";
import {
  btnPrimary,
  btnDanger,
  card,
  input,
  label,
  muted,
  heading,
  notice as noticeCls,
  badge,
} from "../styles/classes";

export default function ProfessionalDashboard() {
  const { t, formatNumber, formatDate } = useI18n();
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

  const statusLabel = (status: ServiceRequest["status"]): string => {
    const labels: Record<string, string> = {
      PENDING: t("prow.pending"),
      ACCEPTED: t("prow.accepted"),
      DECLINED: t("prow.declined"),
      IN_PROGRESS: t("prow.inProgress"),
      COMPLETED: t("prow.completed"),
      CANCELLED: t("prow.cancelled"),
    };
    return labels[status] ?? status;
  };

  const statusClass = (status: ServiceRequest["status"]): string => {
    switch (status) {
      case "COMPLETED":
        return badge.green;
      case "DECLINED":
      case "CANCELLED":
        return badge.red;
      case "IN_PROGRESS":
        return "inline-flex rounded-full bg-brand-yellow/30 px-2 py-0.5 text-xs font-medium text-slate-700 dark:text-slate-200";
      case "ACCEPTED":
        return "inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-300";
      default:
        return "inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300";
    }
  };

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
      setNotice(t("prow.profileSaved"));
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
      setNotice(t("prow.serviceSaved"));
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
    if (!window.confirm(t("prow.deleteServiceConfirm", { name: service.name }))) return;
    try {
      await deleteService(service.id);
      const fresh = await getProfessionalProfile();
      setProfile(fresh);
      setNotice(t("prow.serviceDeleted"));
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
      <h1 className={`${heading} text-2xl`}>{t("prow.title")}</h1>
      <p className={`${muted} mt-1 text-sm`}>{t("prow.subtitle")}</p>

      {notice && <div className={`${noticeCls.success} mt-4`} role="status">{notice}</div>}
      {error && <div className="mt-4"><ErrorMessage message={error} /></div>}

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* ---- Profil ---- */}
        <section className={card}>
          <div className="p-5">
            <h2 className={`${heading} text-lg`}>{t("prow.profile")}</h2>
            <form onSubmit={handleProfileSubmit} className="mt-4 space-y-3">
              <label className="block">
                <span className={`${label} mb-1`}>{t("prow.profession")}</span>
                <input
                  type="text"
                  required
                  value={profession}
                  onChange={(event) => setProfession(event.target.value)}
                  placeholder={t("prow.professionPlaceholder")}
                  className={input}
                />
              </label>
              <label className="block">
                <span className={`${label} mb-1`}>{t("prow.city")}</span>
                <input
                  type="text"
                  value={city}
                  onChange={(event) => setCity(event.target.value)}
                  placeholder={t("merchant.storeCityField")}
                  className={input}
                />
              </label>
              <label className="block">
                <span className={`${label} mb-1`}>{t("prow.bio")}</span>
                <textarea
                  value={bio}
                  onChange={(event) => setBio(event.target.value)}
                  rows={3}
                  placeholder={t("prow.bioPlaceholder")}
                  className={input}
                />
              </label>
              <button
                type="submit"
                disabled={profileSubmitting}
                className={`${btnPrimary} disabled:opacity-50`}
              >
                {profileSubmitting ? t("common.saving") : t("prow.saveProfile")}
              </button>
            </form>
          </div>
        </section>

        {/* ---- Services ---- */}
        <section className={card}>
          <div className="p-5">
            <h2 className={`${heading} text-lg`}>{t("prow.services")}</h2>
            <form onSubmit={handleServiceSubmit} className="mt-4 space-y-3">
              <input
                type="text"
                required
                value={serviceName}
                onChange={(event) => setServiceName(event.target.value)}
                placeholder={t("prow.serviceNamePlaceholder")}
                className={input}
              />
              <input
                type="number"
                min="0"
                value={servicePrice}
                onChange={(event) => setServicePrice(event.target.value)}
                placeholder={t("prow.servicePrice")}
                className={input}
              />
              <button
                type="submit"
                disabled={serviceSubmitting}
                className={`${btnPrimary} disabled:opacity-50`}
              >
                {serviceSubmitting ? t("common.saving") : t("prow.addService")}
              </button>
            </form>

            <div className="mt-4 space-y-2">
              {profile?.services.length === 0 && (
                <p className={`${muted} text-sm`}>{t("pro.noServices")}</p>
              )}
              {profile?.services.map((service) => (
                <div
                  key={service.id}
                  className="rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className={`${heading} font-medium`}>{service.name}</p>
                    <button
                      type="button"
                      onClick={() => handleDeleteService(service)}
                      className="text-xs font-medium text-brand-red hover:underline"
                    >
                      {t("common.delete")}
                    </button>
                  </div>
                  <p className={`${muted} text-xs`}>
                    {service.price !== null && service.price !== undefined
                      ? `${formatNumber(service.price)} FCFA`
                      : t("pro.onRequest")}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* ---- Demandes reçues ---- */}
      <section className={`${card} mt-8 p-5`}>
        <h2 className={`${heading} text-lg`}>
          {t("prow.inbox")} ({requests.length})
        </h2>
        {requests.length === 0 ? (
          <p className={`${muted} mt-3 text-sm`}>{t("prow.inboxEmpty")}</p>
        ) : (
          <div className="mt-4 space-y-3">
            {requests.map((request) => (
              <div key={request.id} className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className={`${heading} font-semibold`}>{request.service_name}</p>
                    <p className={`${muted} text-sm`}>
                      {t("prow.requestFrom", {
                        client: String(request.client_id),
                        service: request.profession ?? request.service_name,
                      })}
                    </p>
                    {request.price !== null && request.price !== undefined && (
                      <p className={`${muted} text-sm`}>
                        {formatNumber(request.price)} {request.currency}
                      </p>
                    )}
                    <p className={`${muted} text-xs`}>
                      {t("prow.sentOn", { date: formatDate(request.created_at) })}
                    </p>
                    {request.message && (
                      <p className="mt-2 rounded-md bg-slate-100 px-3 py-2 text-sm text-slate-600 dark:bg-slate-700/60 dark:text-slate-300">
                        {request.message}
                      </p>
                    )}
                  </div>
                  <span className={statusClass(request.status)}>{statusLabel(request.status)}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {request.status === "PENDING" && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleRequestAction(request.id, "accept")}
                        className={`${btnPrimary} px-3 py-1.5 text-xs`}
                      >
                        {t("prow.accept")}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRequestAction(request.id, "decline")}
                        className={`${btnDanger} px-3 py-1.5 text-xs`}
                      >
                        {t("prow.decline")}
                      </button>
                    </>
                  )}
                  {request.status === "ACCEPTED" && (
                    <button
                      type="button"
                      onClick={() => handleRequestAction(request.id, "start")}
                      className="rounded-md bg-brand-yellow/40 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:brightness-95 dark:text-slate-200"
                    >
                      {t("prow.start")}
                    </button>
                  )}
                  {request.status === "IN_PROGRESS" && (
                    <button
                      type="button"
                      onClick={() => handleRequestAction(request.id, "complete")}
                      className={`${btnPrimary} px-3 py-1.5 text-xs`}
                    >
                      {t("prow.complete")}
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