// Fiche boutique : informations, produits vendus, avis et signalement.
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getStore } from "../services/catalog";
import { createReport, createReview } from "../services/reviews";
import type { StoreDetail as StoreDetailType } from "../types";
import { FORMAT } from "../types";
import { useAuth } from "../hooks/useAuth";
import ErrorMessage from "../components/common/ErrorMessage";
import Spinner from "../components/common/Spinner";
import { getApiErrorMessage } from "../utils/apiError";

function formatDate(value?: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function StoreDetail() {
  const { id } = useParams<{ id: string }>();
  const storeId = Number(id);
  const { user } = useAuth();

  const [store, setStore] = useState<StoreDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Formulaire d'avis
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Signalement
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("Boutique fermée");
  const [reportDescription, setReportDescription] = useState("");

  useEffect(() => {
    setLoading(true);
    setError(null);
    getStore(storeId)
      .then(setStore)
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [storeId]);

  if (loading) {
    return <Spinner fullScreen />;
  }

  if (error || !store) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <ErrorMessage message={error ?? "Boutique introuvable."} />
        <Link to="/recherche" className="mt-4 inline-block text-brand-green hover:underline">
          ← Retour à la recherche
        </Link>
      </div>
    );
  }

  const handleReview = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await createReview({ store_id: store.id, rating, comment: comment.trim() || undefined });
      setNotice("Avis envoyé. Merci pour votre contribution !");
      setComment("");
      const fresh = await getStore(storeId);
      setStore(fresh);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleReport = async () => {
    try {
      await createReport({
        target_type: "STORE",
        target_id: store.id,
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
      <Link to="/recherche" className="text-sm text-brand-green hover:underline">
        ← Recherche
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
              {store.name}
              {store.is_verified && (
                <span
                  className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700"
                  title="Boutique vérifiée par l'équipe MboaFind"
                >
                  Vérifié
                </span>
              )}
            </h1>
            {store.city && <p className="mt-1 text-sm text-gray-500">{store.city}</p>}
            {store.description && (
              <p className="mt-3 max-w-2xl text-sm text-gray-600">{store.description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setReportOpen(true)}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
          >
            Signaler cette boutique
          </button>
        </div>

        <dl className="mt-6 grid gap-3 border-t border-gray-100 pt-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-xs font-medium text-gray-500">Adresse</dt>
            <dd className="mt-0.5 text-sm text-gray-900">{store.address ?? "Non renseignée"}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-500">Téléphone</dt>
            <dd className="mt-0.5 text-sm text-gray-900">{store.phone ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-500">Horaires</dt>
            <dd className="mt-0.5 text-sm text-gray-900">{store.opening_hours ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-500">Note moyenne</dt>
            <dd className="mt-0.5 text-sm text-gray-900">
              {store.rating_avg !== null && store.rating_avg !== undefined
                ? `★ ${store.rating_avg.toFixed(1)} (${store.rating_count} avis)`
                : "Aucun avis"}
            </dd>
          </div>
        </dl>
      </div>

      <h2 className="mt-8 text-lg font-semibold text-gray-900">
        Produits disponibles ({store.products.length})
      </h2>
      <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {store.products.length === 0 && (
          <p className="text-sm text-gray-500">Aucun produit enregistré pour le moment.</p>
        )}
        {store.products.map((product) => (
          <Link
            key={product.id}
            to={`/produits/${product.id}`}
            className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
          >
            <p className="font-semibold text-gray-900">{product.name}</p>
            {product.brand && <p className="text-sm text-gray-500">{product.brand}</p>}
            <p className="mt-2 font-bold text-brand-green">
              {product.min_price !== null && product.min_price !== undefined
                ? `${FORMAT.format(product.min_price)} FCFA`
                : "Prix non publié"}
            </p>
          </Link>
        ))}
      </div>

      <h2 className="mt-8 text-lg font-semibold text-gray-900">
        Avis clients ({store.reviews.length})
      </h2>
      <div className="mt-3 space-y-3">
        {store.reviews.length === 0 && (
          <p className="text-sm text-gray-500">Aucun avis publié pour le moment.</p>
        )}
        {store.reviews.map((review) => (
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

      {user && (
        <div className="mt-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="text-base font-semibold text-gray-900">Laisser un avis</h3>
          <p className="mt-1 text-sm text-gray-600">
            Partagez votre expérience avec cette boutique (éligible après une visite).
          </p>
          <div className="mt-4 flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setRating(value)}
                className={`text-2xl ${value <= rating ? "text-brand-yellow" : "text-gray-300"}`}
                aria-label={`${value} étoiles`}
              >
                ★
              </button>
            ))}
          </div>
          <textarea
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            rows={3}
            placeholder="Votre commentaire…"
            className="mt-3 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/30"
          />
          <button
            type="button"
            disabled={submitting}
            onClick={handleReview}
            className="mt-3 rounded-md bg-brand-green px-5 py-2 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-50"
          >
            {submitting ? "Envoi…" : "Publier mon avis"}
          </button>
        </div>
      )}

      {reportOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setReportOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-gray-900">Signaler « {store.name} »</h3>
            <label className="mt-4 block">
              <span className="mb-1 block text-sm font-medium text-gray-700">Motif</span>
              <select
                value={reportReason}
                onChange={(event) => setReportReason(event.target.value)}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/30"
              >
                {["Boutique fermée", "Information incorrecte", "Localisation incorrecte", "Contenu abusif", "Autre"].map(
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