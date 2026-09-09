// Page Recherche Professionnels : annuaire, filtres et envoi de demande de service.
import { useEffect, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { searchProfessionals } from "../services/professionals";
import type { ProfessionalListItem } from "../types";
import ErrorMessage from "../components/common/ErrorMessage";
import { getApiErrorMessage } from "../utils/apiError";
import { useI18n } from "../i18n/I18nContext";
import { heading, muted, input, btnPrimary, btnSecondary } from "../styles/classes";

export default function ProfessionalSearch() {
  const { t } = useI18n();
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

  const sortOptions = [
    { value: "relevance", label: t("search.sortRelevance") },
    { value: "rating", label: t("pro.results") },
    { value: "price_asc", label: t("search.sortPriceAsc") },
    { value: "price_desc", label: t("search.sortPriceDesc") },
  ];

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
      <h1 className={`${heading} text-2xl`}>{t("pro.title")}</h1>
      <p className={`${muted} mt-1 text-sm`}>{t("pro.subtitle")}</p>

      <form onSubmit={handleSearch} className="mt-6 flex flex-col gap-3 sm:flex-row">
        <input
          type="search"
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          placeholder={t("pro.searchPlaceholder")}
          className={`${input} flex-1`}
        />
        <input
          type="text"
          value={selectedCity}
          onChange={(event) => setSelectedCity(event.target.value)}
          placeholder={t("merchant.storeCityField")}
          className={`${input} sm:w-56`}
        />
        <select
          value={selectedSort}
          onChange={(event) => setSelectedSort(event.target.value)}
          className={`${input} sm:w-48`}
        >
          {sortOptions.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <button type="submit" className={`${btnPrimary} px-6`}>
          {t("common.search")}
        </button>
      </form>

      {error && <div className="mt-4"><ErrorMessage message={error} /></div>}

      {loading ? (
        <p className={`${muted} mt-8 text-center`}>{t("common.loading")}</p>
      ) : items.length === 0 ? (
        <div className="mt-10 text-center">
          <p className="text-4xl">🛠️</p>
          <p className={`${muted} mt-3`}>{t("pro.noResults")}</p>
        </div>
      ) : (
        <>
          <p className={`${muted} mt-6 text-sm`}>{t("pro.results", { count: total })}</p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((pro) => (
              <Link
                key={pro.id}
                to={`/professionnels/${pro.id}`}
                className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border-slate-700 dark:bg-slate-800/60"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className={`${heading} font-semibold`}>{pro.profession}</h3>
                  {pro.is_verified && (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/40 dark:text-green-300">
                      {t("store.verified")}
                    </span>
                  )}
                </div>
                {pro.user_name && <p className={`${muted} mt-1 text-sm`}>{pro.user_name}</p>}
                {pro.city && (
                  <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">📍 {pro.city}</p>
                )}
                {pro.bio && (
                  <p className={`${muted} mt-2 line-clamp-2 text-sm`}>{pro.bio}</p>
                )}
                <div className={`${muted} mt-3 flex items-center justify-between text-xs`}>
                  <span>
                    {pro.rating_count > 0
                      ? t("pro.ratingValue", {
                          value: pro.rating_avg?.toFixed(1) ?? "0",
                          count: pro.rating_count,
                        })
                      : t("pro.ratingNone")}
                  </span>
                  <span>{t("pro.services", { count: pro.services_count })}</span>
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
                className={`${btnSecondary} disabled:cursor-not-allowed disabled:opacity-50`}
              >
                {t("search.pagePrev")}
              </button>
              <span className={`${muted} text-sm`}>
                {t("search.pageInfo", { page, pages: Math.max(1, Math.ceil(total / pageSize)) })}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= Math.ceil(total / pageSize)}
                className={`${btnSecondary} disabled:cursor-not-allowed disabled:opacity-50`}
              >
                {t("search.pageNext")}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}