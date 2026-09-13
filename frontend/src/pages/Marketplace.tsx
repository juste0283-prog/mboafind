// Page « Marketplace » : vitrine multi-boutiques (catégories, prix, bons plans).
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Spinner from "../components/common/Spinner";
import ErrorMessage from "../components/common/ErrorMessage";
import { getMarketplace } from "../services/catalog";
import { useI18n } from "../i18n/I18nContext";
import {
  btnSecondary,
  card,
  heading,
  input,
  label,
  muted,
  badge,
} from "../styles/classes";
import type { MarketplaceItem, MarketplacePage } from "../types";
import { getApiErrorMessage } from "../utils/apiError";

type SortMode = "price_asc" | "price_desc" | "recent" | "deals";

const PAGE_SIZE = 12;

export default function Marketplace() {
  const { t, formatNumber } = useI18n();

  const [data, setData] = useState<MarketplacePage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [sort, setSort] = useState<SortMode>("price_asc");
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getMarketplace({
        category_id: categoryId ?? undefined,
        sort,
        page,
        page_size: PAGE_SIZE,
      });
      setData(result);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [categoryId, sort, page]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  const cardImage = (item: MarketplaceItem) =>
    item.image_url ? (
      <img
        src={item.image_url}
        alt={item.name}
        className="h-28 w-full rounded-xl object-cover"
      />
    ) : (
      <div className="grid h-28 w-full place-items-center rounded-xl bg-brand-green/10 text-3xl">
        🛍️
      </div>
    );

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className={`${heading} text-2xl`}>{t("marketplace.title")}</h1>
      <p className={`${muted} mt-1 text-sm`}>{t("marketplace.subtitle")}</p>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="block">
          <span className={label}>{t("marketplace.sort")}</span>
          <select
            value={sort}
            onChange={(event) => {
              setSort(event.target.value as SortMode);
              setPage(1);
            }}
            className={`${input} sm:w-64`}
          >
            <option value="price_asc">{t("marketplace.sortPriceAsc")}</option>
            <option value="price_desc">{t("marketplace.sortPriceDesc")}</option>
            <option value="recent">{t("marketplace.sortRecent")}</option>
            <option value="deals">{t("marketplace.sortDeals")}</option>
          </select>
        </label>
      </div>

      {data && data.categories.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setCategoryId(null);
              setPage(1);
            }}
            className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
              categoryId === null
                ? "border-brand-green bg-brand-green text-white"
                : "border-slate-300 text-slate-600 hover:border-brand-green dark:border-slate-600 dark:text-slate-300"
            }`}
          >
            {t("marketplace.all")}
          </button>
          {data.categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                setCategoryId(cat.id);
                setPage(1);
              }}
              className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
                categoryId === cat.id
                  ? "border-brand-green bg-brand-green text-white"
                  : "border-slate-300 text-slate-600 hover:border-brand-green dark:border-slate-600 dark:text-slate-300"
              }`}
            >
              {cat.name} <span className="opacity-70">({cat.count})</span>
            </button>
          ))}
        </div>
      )}

      {error && (
        <div className="mt-4">
          <ErrorMessage message={error} />
        </div>
      )}

      {loading ? (
        <div className="mt-10 flex justify-center">
          <Spinner />
        </div>
      ) : !data || data.items.length === 0 ? (
        <div className={`${card} mt-8 p-10 text-center`}>
          <p className="text-4xl">🛒</p>
          <p className={`${muted} mt-3`}>{t("marketplace.empty")}</p>
        </div>
      ) : (
        <>
          <p className={`${muted} mt-6 text-sm`}>
            {t("marketplace.results", { count: data.total })}
          </p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {data.items.map((item) => (
              <Link
                key={item.id}
                to={`/produits/${item.id}`}
                className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md dark:border-slate-700 dark:bg-slate-800/60"
              >
                {cardImage(item)}
                <div className="mt-3 flex items-start justify-between gap-2">
                  <h3 className={`${heading} font-semibold`}>{item.name}</h3>
                  {item.deal_drop_percent != null && (
                    <span className={`${badge.red} shrink-0`}>
                      -{formatNumber(item.deal_drop_percent)}%
                    </span>
                  )}
                </div>
                {item.brand && <p className={`${muted} mt-1 text-xs`}>{item.brand}</p>}
                {item.category && (
                  <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
                    {item.category.name}
                  </p>
                )}

                <div className="mt-auto pt-3">
                  {item.min_price != null ? (
                    <p className="text-xl font-bold text-brand-green">
                      {formatNumber(item.min_price)}{" "}
                      <span className="text-xs font-medium text-slate-400">FCFA</span>
                      {item.max_price != null && item.max_price !== item.min_price && (
                        <span className={`${muted} ml-1 text-xs font-normal line-through`}>
                          {formatNumber(item.max_price)}
                        </span>
                      )}
                    </p>
                  ) : (
                    <p className="text-sm text-slate-400">{t("common.noResult")}</p>
                  )}
                  <div className="mt-1 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span>{t("marketplace.stores", { count: item.store_count })}</span>
                    {item.rating_count > 0 && (
                      <span>★ {item.rating_avg?.toFixed(1)}</span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {data.total > PAGE_SIZE && (
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
                {t("search.pageInfo", { page, pages: totalPages })}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
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