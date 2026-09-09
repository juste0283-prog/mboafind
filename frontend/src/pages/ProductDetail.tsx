// Fiche produit : offre de prix par boutique (comparaison), confirmation et signalement.
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getProduct, confirmPrice } from "../services/catalog";
import { createReport } from "../services/reviews";
import type { ProductDetail as ProductDetailType } from "../types";
import { FORMAT } from "../types";
import { useAuth } from "../hooks/useAuth";
import ErrorMessage from "../components/common/ErrorMessage";
import Spinner from "../components/common/Spinner";
import { getApiErrorMessage } from "../utils/apiError";

const REPORT_REASONS = [
  { value: "Prix incorrect", label: "Le prix affiché est incorrect" },
  { value: "Produit indisponible", label: "Le produit n'est plus disponible" },
  { value: "Boutique fermée", label: "La boutique est fermée" },
  { value: "Localisation incorrecte", label: "La localisation est fausse" },
  { value: "Contenu abusif", label: "Contenu abusif ou trompeur" },
  { value: "Autre", label: "Autre problème" },
];

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const productId = Number(id);
  const { user } = useAuth();

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
  const [reportReason, setReportReason] = useState(REPORT_REASONS[0]?.value ?? "Autre");
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
        <ErrorMessage message={error ?? "Produit introuvable."} />
        <Link to="/recherche" className="mt-4 inline-block text-brand-green hover:underline">
          ← Retour à la recherche
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
      setNotice("Merci ! Votre confirmation a bien été enregistrée.");
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
            {product.brand && (
              <p className="text-sm font-medium text-gray-500">{product.brand}</p>
            )}
            <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>
            {product.category && (
              <p className="mt-1 text-sm text-gray-500">Catégorie : {product.category.name}</p>
            )}
            {product.description && (
              <p className="mt-3 text-sm text-gray-600">{product.description}</p>
            )}
          </div>
        </div>

        {product.min_price !== null && product.min_price !== undefined ? (
          <div className="mt-4 flex flex-wrap items-center gap-6 border-t border-gray-100 pt-4">
            <div>
              <p className="text-xs text-gray-500">Prix constaté</p>
              <p className="text-2xl font-bold text-brand-green">
                {FORMAT.format(product.min_price)} <span className="text-sm font-medium text-gray-400">FCFA</span>
              </p>
            </div>
            {product.max_price !== null &&
              product.max_price !== undefined &&
              product.max_price !== product.min_price && (
                <div>
                  <p className="text-xs text-gray-500">Maximum observé</p>
                  <p className="text-lg font-semibold text-gray-700">
                    {FORMAT.format(product.max_price)} FCFA
                  </p>
                </div>
              )}
            {product.avg_price !== null && product.avg_price !== undefined && (
              <div>
                <p className="text-xs text-gray-500">Prix moyen</p>
                <p className="text-lg font-semibold text-gray-700">
                  {FORMAT.format(product.avg_price)} FCFA
                </p>
              </div>
            )}
            <div>
              <p className="text-xs text-gray-500">Vendeurs</p>
              <p className="text-lg font-semibold text-gray-700">{product.store_count}</p>
            </div>
          </div>
        ) : (
          <p className="mt-4 border-t border-gray-100 pt-4 text-sm text-gray-500">
            Aucun prix publié pour le moment.
          </p>
        )}
      </div>

      <h2 className="mt-8 text-lg font-semibold text-gray-900">
        Comparer les offres ({product.offers.length})
      </h2>
      <div className="mt-3 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Boutique</th>
              <th className="px-4 py-3">Prix</th>
              <th className="px-4 py-3">Disponibilité</th>
              <th className="px-4 py-3">Mis à jour</th>
              <th className="px-4 py-3">Confiance</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {product.offers.map((offer) => (
              <tr key={offer.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <Link
                    to={`/boutiques/${offer.store_id}`}
                    className="font-medium text-gray-900 hover:text-brand-green hover:underline"
                  >
                    {offer.store_name}
                  </Link>
                  {offer.store_is_verified && (
                    <span className="ml-1 text-xs text-brand-green" title="Boutique vérifiée">
                      ✓
                    </span>
                  )}
                  {offer.store_city && (
                    <p className="text-xs text-gray-500">{offer.store_city}</p>
                  )}
                </td>
                <td className="px-4 py-3 font-semibold text-gray-900">
                  {FORMAT.format(offer.amount)} FCFA
                </td>
                <td className="px-4 py-3">
                  {offer.is_available ? (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                      Disponible
                    </span>
                  ) : (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                      Indisponible
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {new Date(offer.updated_at).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {offer.verification_status === "VERIFIED" ? (
                    <span className="text-brand-green">Prix confirmé</span>
                  ) : offer.confirmed_count > 0 ? (
                    <span>{offer.confirmed_count} confirmation(s)</span>
                  ) : (
                    <span className="text-gray-400">À confirmer</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    {user && (
                      <button
                        type="button"
                        disabled={confirming === offer.id}
                        onClick={() => handleConfirm(offer.id)}
                        className="rounded-md bg-brand-green px-3 py-1.5 text-xs font-semibold text-white hover:brightness-110 disabled:opacity-50"
                      >
                        {confirming === offer.id ? "…" : "Confirmer le prix"}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setReportTarget({ type: "PRICE", id: offer.id });
                        setReportOpen(true);
                      }}
                      className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                    >
                      Signaler
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setReportOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-gray-900">Signaler une information</h3>
            <p className="mt-1 text-sm text-gray-600">
              Aidez la communauté en signalant les informations incorrectes.
            </p>
            <label className="mt-4 block">
              <span className="mb-1 block text-sm font-medium text-gray-700">Motif</span>
              <select
                value={reportReason}
                onChange={(event) => setReportReason(event.target.value)}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/30"
              >
                {REPORT_REASONS.map((reason) => (
                  <option key={reason.label} value={reason.value}>
                    {reason.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="mt-3 block">
              <span className="mb-1 block text-sm font-medium text-gray-700">
                Détails <span className="font-normal text-gray-400">(optionnel)</span>
              </span>
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