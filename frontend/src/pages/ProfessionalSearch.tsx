// Page Recherche Professionnels : annuaire, filtres et envoi de demande de service.
import { useEffect, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { searchProfessionals } from "../services/professionals";
import type { ProfessionalListItem } from "../types";
import ErrorMessage from "../components/common/ErrorMessage";
import { getApiErrorMessage } from "../utils/apiError";

const SORTS = [
  { value: "relevance", label: "Pertinence" },
  { value: "rating", label: "Meilleure note" },
  { value: "price_asc", label: "Tarif croissant" },
  { value: "price_desc", label: "Tarif décroissant" },
];

const inputClass =
  "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/30";

export default function ProfessionalSearch() {
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const city = searchParams.get("city") ?? "";

  const [items, setItems] = useState<ProfessionalListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [keyword, setKeyword] = useState(q);
  const [selectedCity, setSelectedCity] = useState(city);
  const [selectedSort, setSelectedSort] = useState("relevance");

  const pageSize = 20;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    searchProfessionals({
      search: q || undefined,
      city: city || undefined,
      sort: selectedSort || undefined,
      page,
      page_size: pageSize,
    })
      .then((result) => {
        if (cancelled) return;
        setItems(result.items);
        setTotal(result.total);
      })
      .catch((err) => {
        if (!cancelled) setError(getApiErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [q, city, selectedSort, page]);

  const handleSearch = (event: FormEvent) => {
    event.preventDefault();
    setPage(1);
    const next: Record<string, string> = {};
    if (keyword.trim()) next.q = keyword.trim();
    if (selectedCity.trim()) next.city = selectedCity.trim();
    if (selectedSort !== "relevance") next.sort = selectedSort;
    setSearchParams(next);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900">Trouver un professionnel</h1>
      <p className="mt-1 text-sm text-gray-600">
        Mécanicien, maçon, informaticien… envoyez une demande de service en quelques clics.
      </p>

      <form onSubmit={handleSearch} className="mt-6 flex flex-col gap-3 sm:flex-row">
        <input
          type="search"
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          placeholder="Ex : réparateur de téléphone, électricien…"
          className={`${inputClass} flex-1`}
        />
        <input
          type="text"
          value={selectedCity}
          onChange={(event) => setSelectedCity(event.target.value)}
          placeholder="Ville (ex : Yaoundé)"
          className={`${inputClass} sm:w-56`}
        />
        <select
          value={selectedSort}
          onChange={(event) => setSelectedSort(event.target.value)}
          className={`${inputClass} sm:w-48`}
        >
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-md bg-brand-green px-6 py-2 font-semibold text-white hover:brightness-110"
        >
          Rechercher
        </button>
      </form>

      {error && <div className="mt-4"><ErrorMessage message={error} /></div>}

      {loading ? (
        <p className="mt-8 text-center text-gray-500">Recherche en cours…</p>
      ) : items.length === 0 ? (
        <p className="mt-8 text-center text-gray-500">
          Aucun professionnel trouvé. Essayez un autre mot-clé.
        </p>
      ) : (
        <>
          <p className="mt-6 text-sm text-gray-600">{total} professionnel(s)</p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((pro) => (
              <Link
                key={pro.id}
                to={`/professionnels/${pro.id}`}
                className="flex flex-col rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-gray-900">{pro.profession}</h3>
                  {pro.is_verified && (
                    <span className="shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                      Vérifié
                    </span>
                  )}
                </div>
                {pro.user_name && <p className="mt-1 text-sm text-gray-500">{pro.user_name}</p>}
                {pro.city && <p className="mt-1 text-xs text-gray-400">📍 {pro.city}</p>}
                {pro.bio && (
                  <p className="mt-2 line-clamp-2 text-sm text-gray-600">{pro.bio}</p>
                )}
                <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                  <span>
                    {pro.rating_count > 0
                      ? `★ ${pro.rating_avg?.toFixed(1)} (${pro.rating_count} avis)`
                      : "Aucun avis"}
                  </span>
                  <span>{pro.services_count} service(s)</span>
                </div>
              </Link>
            ))}
          </div>

          {total > pageSize && (
            <div className="mt-8 flex items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                ← Précédent
              </button>
              <span className="text-sm text-gray-600">
                Page {page} / {Math.max(1, Math.ceil(total / pageSize))}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= Math.ceil(total / pageSize)}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Suivant →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}