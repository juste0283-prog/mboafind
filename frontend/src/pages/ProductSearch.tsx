// Page Recherche Produits : barre de recherche, filtres, tri et comparaison de prix.
import { useEffect, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { searchProducts, naturalSearchProducts, listCategories } from "../services/catalog";
import type { Category, NaturalInterpretation, ProductListItem } from "../types";
import ErrorMessage from "../components/common/ErrorMessage";
import { getApiErrorMessage } from "../utils/apiError";
import { useI18n } from "../i18n/I18nContext";
import { btnPrimary, btnSecondary, card, input, label, muted, heading } from "../styles/classes";

export default function ProductSearch() {
  const { t, formatNumber } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const categoryId = searchParams.get("category_id");
  const city = searchParams.get("city") ?? "";
  const sort = searchParams.get("sort") ?? "relevance";

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [naturalMode, setNaturalMode] = useState(false);
  const [interpretation, setInterpretation] = useState<NaturalInterpretation | null>(null);

  const [keyword, setKeyword] = useState(q);
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(categoryId ?? "");
  const [selectedCity, setSelectedCity] = useState(city);
  const [selectedSort, setSelectedSort] = useState(sort);
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);

  const pageSize = 20;

  useEffect(() => {
    listCategories().then(setCategories).catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setInterpretation(null);

    const fetchProducts = () =>
      naturalMode && keyword.trim()
        ? naturalSearchProducts(keyword.trim(), { page, page_size: pageSize }).then(
            (result) => {
              if (cancelled) return;
              setProducts(result.items);
              setTotal(result.total);
              setInterpretation(result.interpretation);
            },
          )
        : searchProducts({
      search: q || undefined,
      category_id: categoryId ? Number(categoryId) : undefined,
      city: city || undefined,
      min_price: minPrice ? Number(minPrice) : undefined,
      max_price: maxPrice ? Number(maxPrice) : undefined,
      available: onlyAvailable || undefined,
      sort: selectedSort || undefined,
      lat: selectedSort === "distance" && position ? position.lat : undefined,
      lng: selectedSort === "distance" && position ? position.lng : undefined,
      page,
      page_size: pageSize,
    })
      .then((result) => {
        if (cancelled) return;
        setProducts(result.items);
        setTotal(result.total);
      })
      .catch((err) => {
        if (!cancelled) setError(getApiErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    fetchProducts();

    return () => {
      cancelled = true;
    };
  }, [keyword, naturalMode, q, categoryId, city, minPrice, maxPrice, onlyAvailable, selectedSort, position, page]);

  const locateMe = () => {
    if (!navigator.geolocation) {
      setError(t("search.geoUnsupported"));
      return;
    }
    setLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setSelectedSort("distance");
        setLocating(false);
      },
      () => {
        setError(t("search.geoError"));
        setLocating(false);
      },
      { timeout: 10000 },
    );
  };

  const handleSearch = (event: FormEvent) => {
    event.preventDefault();
    setPage(1);
    const next: Record<string, string> = {};
    if (keyword.trim()) next.q = keyword.trim();
    if (selectedCategory) next.category_id = selectedCategory;
    if (selectedCity.trim()) next.city = selectedCity.trim();
    if (selectedSort !== "relevance") next.sort = selectedSort;
    setSearchParams(next);
  };

  const sortOptions = [
    { value: "relevance", label: t("search.sortRelevance") },
    { value: "recent", label: t("search.sortRecent") },
    { value: "price_asc", label: t("search.sortPriceAsc") },
    { value: "price_desc", label: t("search.sortPriceDesc") },
    { value: "distance", label: t("search.sortDistance") },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className={`${heading} text-2xl`}>{t("search.title")}</h1>
      <p className={`${muted} mt-1 text-sm`}>{t("search.subtitle")}</p>

      <form onSubmit={handleSearch} className="mt-6 flex flex-col gap-3 sm:flex-row">
        <input
          type="search"
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          placeholder={t("search.placeholder")}
          className={input}
        />
        <button type="submit" className={`${btnPrimary} px-6`}>
          {t("common.search")}
        </button>
        <button
          type="button"
          onClick={() => setNaturalMode((m) => !m)}
          className={`${naturalMode ? btnPrimary : btnSecondary} px-4 text-sm`}
        >
          {t("search.naturalMode")}
        </button>
      </form>

      {naturalMode && (
        <div className={`${card} mt-4 p-4 text-sm`}>
          <p className={label}>{t("search.naturalTitle")}</p>
          <ol className={`${muted} mt-2 list-decimal space-y-1 pl-5`}>
            <li>{t("search.naturalStep1")}</li>
            <li>{t("search.naturalStep2")}</li>
            <li>{t("search.naturalStep3")}</li>
          </ol>
        </div>
      )}

      {interpretation && (
        <div className={`${card} mt-4 border-l-4 border-brand-green p-4 text-sm`}>
          <p className="font-semibold">
            {t("search.detectedTitle")} ✨
          </p>
          <p className={`${muted} mt-1`}>{interpretation.text}</p>
        </div>
      )}

      <div className={`${card} mt-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-6`}>
        <label className="block">
          <span className={label}>{t("search.category")}</span>
          <select
            value={selectedCategory}
            onChange={(event) => setSelectedCategory(event.target.value)}
            className={input}
          >
            <option value="">{t("search.categoryAll")}</option>
            {categories.map((cat) => (
              <option key={cat.id} value={String(cat.id)}>
                {cat.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className={label}>{t("search.city")}</span>
          <input
            type="text"
            value={selectedCity}
            onChange={(event) => setSelectedCity(event.target.value)}
            placeholder="Yaoundé, Douala…"
            className={input}
          />
        </label>

        <label className="block">
          <span className={label}>{t("search.minPrice")}</span>
          <input
            type="number"
            min="0"
            value={minPrice}
            onChange={(event) => setMinPrice(event.target.value)}
            placeholder="0"
            className={input}
          />
        </label>

        <label className="block">
          <span className={label}>{t("search.maxPrice")}</span>
          <input
            type="number"
            min="0"
            value={maxPrice}
            onChange={(event) => setMaxPrice(event.target.value)}
            placeholder="100000"
            className={input}
          />
        </label>

        <label className="block">
          <span className={label}>{t("search.sort")}</span>
          <select
            value={selectedSort}
            onChange={(event) => setSelectedSort(event.target.value)}
            className={input}
          >
            {sortOptions.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-end gap-2 pb-2 text-sm text-slate-700 dark:text-slate-200">
          <input
            type="checkbox"
            checked={onlyAvailable}
            onChange={(event) => setOnlyAvailable(event.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-brand-green focus:ring-brand-green"
          />
          {t("search.availableOnly")}
        </label>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={locateMe}
          disabled={locating}
          className={`${btnSecondary} px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50`}
        >
          {locating ? t("common.loading") : t("search.useMyLocation")}
        </button>
        {selectedSort === "distance" && !position && (
          <p className={`${muted} text-xs`}>{t("search.distanceHint")}</p>
        )}
        {selectedSort === "distance" && position && (
          <p className={`${muted} text-xs`}>
            📍 {position.lat.toFixed(4)}, {position.lng.toFixed(4)}
          </p>
        )}
      </div>

      {error && <div className="mt-4"><ErrorMessage message={error} /></div>}

      {loading ? (
        <p className={`${muted} mt-8 text-center`}>{t("common.loading")}</p>
      ) : products.length === 0 ? (
        <div className="mt-10 text-center">
          <p className="text-4xl">🔍</p>
          <p className={`${muted} mt-3`}>{t("search.noneFound")}</p>
          <p className={`${muted} text-sm`}>{t("search.tryChanging")}</p>
        </div>
      ) : (
        <>
          <p className={`${muted} mt-6 text-sm`}>{t("search.results", { count: total })}</p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <Link
                key={product.id}
                to={`/produits/${product.id}`}
                className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border-slate-700 dark:bg-slate-800/60"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className={`${heading} font-semibold`}>{product.name}</h3>
                  {product.is_available && (
                    <span className="shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/40 dark:text-green-300">
                      {t("product.available")}
                    </span>
                  )}
                </div>
                {product.brand && <p className={`${muted} mt-1 text-sm`}>{product.brand}</p>}
                {product.category && (
                  <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                    {product.category.name}
                  </p>
                )}

                <div className="mt-3 flex items-end justify-between">
                  <div>
                    {product.min_price !== null && product.min_price !== undefined ? (
                      <p className="text-xl font-bold text-brand-green">
                        {formatNumber(product.min_price)}{" "}
                        <span className="text-xs font-medium text-slate-400">FCFA</span>
                      </p>
                    ) : (
                      <p className="text-sm text-slate-400">{t("common.noResult")}</p>
                    )}
                    {product.max_price !== null &&
                      product.max_price !== undefined &&
                      product.max_price !== product.min_price && (
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {t("search.from", { price: `${formatNumber(product.max_price)} FCFA` })}
                        </p>
                      )}
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {t("search.storeCount", { count: product.store_count })}
                  </span>
                </div>

                {product.rating_count > 0 && (
                  <p className={`${muted} mt-2 text-xs`}>
                    ★ {product.rating_avg?.toFixed(1)} ({product.rating_count})
                  </p>
                )}
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