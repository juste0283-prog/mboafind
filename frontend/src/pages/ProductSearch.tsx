// Page Recherche Produits : barre de recherche, filtres, tri et comparaison de prix.
import { useEffect, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { searchProducts, listCategories } from "../services/catalog";
import type { Category, ProductListItem } from "../types";
import ErrorMessage from "../components/common/ErrorMessage";
import { getApiErrorMessage } from "../utils/apiError";
import { FORMAT } from "../types";

const SORTS = [
  { value: "relevance", label: "Pertinence" },
  { value: "recent", label: "Plus récentes" },
  { value: "price_asc", label: "Prix croissant" },
  { value: "price_desc", label: "Prix décroissant" },
];

const inputClass =
  "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/30";

export default function ProductSearch() {
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

  const [keyword, setKeyword] = useState(q);
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(categoryId ?? "");
  const [selectedCity, setSelectedCity] = useState(city);
  const [selectedSort, setSelectedSort] = useState(sort);

  const pageSize = 20;

  useEffect(() => {
    listCategories().then(setCategories).catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    searchProducts({
      search: q || undefined,
      category_id: categoryId ? Number(categoryId) : undefined,
      city: city || undefined,
      min_price: minPrice ? Number(minPrice) : undefined,
      max_price: maxPrice ? Number(maxPrice) : undefined,
      available: onlyAvailable || undefined,
      sort: selectedSort || undefined,
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
    return () => {
      cancelled = true;
    };
  }, [q, categoryId, city, minPrice, maxPrice, onlyAvailable, selectedSort, page]);

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

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900">Rechercher un produit</h1>
      <p className="mt-1 text-sm text-gray-600">
        Comparez les prix entre les commerces de votre ville.
      </p>

      <form
        onSubmit={handleSearch}
        className="mt-6 flex flex-col gap-3 sm:flex-row"
      >
        <input
          type="search"
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          placeholder="Ex : SSD 512 Go, Galaxy A15, chargeur…"
          className={`${inputClass} flex-1`}
        />
        <button
          type="submit"
          className="rounded-md bg-brand-green px-6 py-2 font-semibold text-white hover:brightness-110"
        >
          Rechercher
        </button>
      </form>

      <div className="mt-4 grid gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-6">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-gray-500">Catégorie</span>
          <select
            value={selectedCategory}
            onChange={(event) => setSelectedCategory(event.target.value)}
            className={inputClass}
          >
            <option value="">Toutes</option>
            {categories.map((cat) => (
              <option key={cat.id} value={String(cat.id)}>
                {cat.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-gray-500">Ville</span>
          <input
            type="text"
            value={selectedCity}
            onChange={(event) => setSelectedCity(event.target.value)}
            placeholder="Yaoundé, Douala…"
            className={inputClass}
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-gray-500">Prix min</span>
          <input
            type="number"
            min="0"
            value={minPrice}
            onChange={(event) => setMinPrice(event.target.value)}
            placeholder="0"
            className={inputClass}
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-gray-500">Prix max</span>
          <input
            type="number"
            min="0"
            value={maxPrice}
            onChange={(event) => setMaxPrice(event.target.value)}
            placeholder="100000"
            className={inputClass}
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-gray-500">Tri</span>
          <select
            value={selectedSort}
            onChange={(event) => setSelectedSort(event.target.value)}
            className={inputClass}
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-end gap-2 pb-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={onlyAvailable}
            onChange={(event) => setOnlyAvailable(event.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-brand-green focus:ring-brand-green"
          />
          Disponible
        </label>
      </div>

      {error && <div className="mt-4"><ErrorMessage message={error} /></div>}

      {loading ? (
        <p className="mt-8 text-center text-gray-500">Recherche en cours…</p>
      ) : products.length === 0 ? (
        <p className="mt-8 text-center text-gray-500">
          Aucun produit trouvé. Essayez d'élargir votre recherche.
        </p>
      ) : (
        <>
          <p className="mt-6 text-sm text-gray-600">
            {total} résultat{total > 1 ? "s" : ""}
          </p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <Link
                key={product.id}
                to={`/produits/${product.id}`}
                className="flex flex-col rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-gray-900">{product.name}</h3>
                  {product.is_available && (
                    <span className="shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                      Disponible
                    </span>
                  )}
                </div>
                {product.brand && (
                  <p className="mt-1 text-sm text-gray-500">{product.brand}</p>
                )}
                {product.category && (
                  <p className="mt-1 text-xs text-gray-400">{product.category.name}</p>
                )}

                <div className="mt-3 flex items-end justify-between">
                  <div>
                    {product.min_price !== null && product.min_price !== undefined ? (
                      <p className="text-xl font-bold text-brand-green">
                        {FORMAT.format(product.min_price)}{" "}
                        <span className="text-xs font-medium text-gray-400">FCFA</span>
                      </p>
                    ) : (
                      <p className="text-sm text-gray-400">Prix non publié</p>
                    )}
                    {product.max_price !== null &&
                      product.max_price !== undefined &&
                      product.max_price !== product.min_price && (
                        <p className="text-xs text-gray-500">
                          jusqu'à {FORMAT.format(product.max_price)} FCFA
                        </p>
                      )}
                  </div>
                  <span className="text-xs text-gray-500">
                    {product.store_count} boutique{product.store_count > 1 ? "s" : ""}
                  </span>
                </div>

                {product.rating_count > 0 && (
                  <p className="mt-2 text-xs text-gray-500">
                    ★ {product.rating_avg?.toFixed(1)} ({product.rating_count} avis)
                  </p>
                )}
                {product.updated_at && (
                  <p className="mt-1 text-[11px] text-gray-400">
                    Mis à jour le{" "}
                    {new Date(product.updated_at).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "short",
                    })}
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