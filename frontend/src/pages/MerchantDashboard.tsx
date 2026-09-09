// Tableau de bord commençant : gestion des boutiques (avec carte), produits et prix.
import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  createOrUpdatePrice,
  createProduct,
  createStore,
  deletePrice,
  deleteProduct,
  deleteStore,
  listCategories,
  listMyStores,
  listStorePrices,
  listStoreProducts,
  updatePrice,
  updateProduct,
  updateStore,
} from "../services/catalog";
import type { Category, PriceManage, ProductAdmin, Store } from "../types";
import ErrorMessage from "../components/common/ErrorMessage";
import Spinner from "../components/common/Spinner";
import LocationPicker from "../components/map/LocationPicker";
import { useI18n } from "../i18n/I18nContext";
import { getApiErrorMessage } from "../utils/apiError";
import {
  btnPrimary,
  btnSecondary,
  card,
  input,
  label,
  muted,
  heading,
  badge,
  notice as noticeCls,
  tableHead,
  tableRow,
} from "../styles/classes";

interface StoreFormState {
  name: string;
  description: string;
  city: string;
  address: string;
  phone: string;
  opening_hours: string;
  latitude: string;
  longitude: string;
}

const createEmptyForm = (): StoreFormState => ({
  name: "",
  description: "",
  city: "",
  address: "",
  phone: "",
  opening_hours: "",
  latitude: "",
  longitude: "",
});

export default function MerchantDashboard() {
  const { t, formatNumber } = useI18n();
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Formulaire création / édition boutique
  const [storeForm, setStoreForm] = useState<StoreFormState>(createEmptyForm);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [storeSubmitting, setStoreSubmitting] = useState(false);

  // Produits & prix
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<ProductAdmin[]>([]);
  const [prices, setPrices] = useState<PriceManage[]>([]);
  const [productModal, setProductModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductAdmin | null>(null);
  const [productName, setProductName] = useState("");
  const [productBrand, setProductBrand] = useState("");
  const [productCategory, setProductCategory] = useState("");
  const [priceAmount, setPriceAmount] = useState("");
  const [priceAvailable, setPriceAvailable] = useState(true);
  const [priceSubmitting, setPriceSubmitting] = useState(false);

  // Ecoutes du géocode inversé (remplissage adresse / ville).
  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ address: string; city: string }>).detail;
      if (detail?.address) {
        setStoreForm((form) => ({
          ...form,
          address: form.address || detail.address,
          city: form.city || detail.city,
        }));
      } else if (detail?.city) {
        setStoreForm((form) => (form.city ? form : { ...form, city: detail.city }));
      }
    };
    window.addEventListener("mboafind:geocode", handler);
    return () => window.removeEventListener("mboafind:geocode", handler);
  }, []);

  const loadStores = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await listMyStores();
      setStores(list);
      setSelectedStore((current) => {
        if (current) {
          const fresh = list.find((s) => s.id === current.id);
          return fresh ?? null;
        }
        return list[0] ?? null;
      });
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStores();
    listCategories().then(setCategories).catch(() => setCategories([]));
  }, [loadStores]);

  useEffect(() => {
    if (!selectedStore) {
      setProducts([]);
      setPrices([]);
      return;
    }
    listStoreProducts(selectedStore.id)
      .then(setProducts)
      .catch(() => setProducts([]));
    listStorePrices(selectedStore.id)
      .then(setPrices)
      .catch(() => setPrices([]));
  }, [selectedStore]);

  const buildPayload = () => ({
    name: storeForm.name,
    description: storeForm.description.trim() || null,
    city: storeForm.city.trim() || null,
    address: storeForm.address.trim() || null,
    phone: storeForm.phone.trim() || null,
    opening_hours: storeForm.opening_hours.trim() || null,
    latitude: storeForm.latitude ? Number(storeForm.latitude) : null,
    longitude: storeForm.longitude ? Number(storeForm.longitude) : null,
  });

  const handleStoreSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setStoreSubmitting(true);
    setError(null);
    try {
      const payload = buildPayload();
      if (editingStore) {
        await updateStore(editingStore.id, payload);
        setNotice(t("merchant.storeSaved"));
      } else {
        const created = await createStore(payload);
        setSelectedStore(created);
        setNotice(t("merchant.storeCreated"));
      }
      setEditingStore(null);
      setStoreForm(createEmptyForm());
      await loadStores();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setStoreSubmitting(false);
    }
  };

  const startEditStore = (store: Store) => {
    setEditingStore(store);
    setStoreForm({
      name: store.name,
      description: store.description ?? "",
      city: store.city ?? "",
      address: store.address ?? "",
      phone: store.phone ?? "",
      opening_hours: store.opening_hours ?? "",
      latitude: store.latitude !== null && store.latitude !== undefined ? String(store.latitude) : "",
      longitude: store.longitude !== null && store.longitude !== undefined ? String(store.longitude) : "",
    });
  };

  const resetStoreForm = () => {
    setEditingStore(null);
    setStoreForm(createEmptyForm());
  };

  const handleDeleteStore = async (store: Store) => {
    if (!window.confirm(t("merchant.deleteStoreConfirm", { name: store.name }))) return;
    try {
      await deleteStore(store.id);
      setNotice(t("merchant.deleteStoreDone"));
      if (selectedStore?.id === store.id) setSelectedStore(null);
      await loadStores();
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };

  const openAddProduct = () => {
    setSelectedProduct(null);
    setProductName("");
    setProductBrand("");
    setProductCategory("");
    setPriceAmount("");
    setPriceAvailable(true);
    setProductModal(true);
  };

  const openEditProduct = (product: ProductAdmin) => {
    const price = prices.find((p) => p.product_id === product.id);
    setSelectedProduct(product);
    setProductName(product.name);
    setProductBrand(product.brand ?? "");
    setProductCategory(product.category_id ? String(product.category_id) : "");
    setPriceAmount(price ? String(price.amount) : "");
    setPriceAvailable(price ? price.is_available : true);
    setProductModal(true);
  };

  const handleProductSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedStore) return;
    setPriceSubmitting(true);
    setError(null);
    try {
      let product: ProductAdmin;
      if (selectedProduct) {
        product = await updateProduct(selectedProduct.id, {
          name: productName,
          brand: productBrand || undefined,
          category_id: productCategory ? Number(productCategory) : null,
        });
      } else {
        product = await createProduct(selectedStore.id, {
          name: productName,
          brand: productBrand || undefined,
          category_id: productCategory ? Number(productCategory) : null,
        });
      }
      if (priceAmount) {
        await createOrUpdatePrice(selectedStore.id, product.id, {
          amount: Number(priceAmount),
          is_available: priceAvailable,
        });
      }
      setNotice(selectedProduct ? t("merchant.productSaved") : t("merchant.productAdded"));
      setProductModal(false);
      const freshProducts = await listStoreProducts(selectedStore.id);
      setProducts(freshProducts);
      const freshPrices = await listStorePrices(selectedStore.id);
      setPrices(freshPrices);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setPriceSubmitting(false);
    }
  };

  const handleProductDelete = async (product: ProductAdmin) => {
    if (!window.confirm(t("merchant.deleteProductConfirm", { name: product.name }))) return;
    try {
      await deleteProduct(product.id);
      const freshProducts = await listStoreProducts(selectedStore!.id);
      setProducts(freshProducts);
      setNotice(t("merchant.productDeleted"));
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };

  const quickToggleAvailability = async (price: PriceManage) => {
    if (!selectedStore) return;
    try {
      await updatePrice(price.id, { is_available: !price.is_available });
      const fresh = await listStorePrices(selectedStore.id);
      setPrices(fresh);
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };

  const handlePriceDelete = async (price: PriceManage) => {
    if (!window.confirm(t("merchant.deletePriceConfirm"))) return;
    try {
      await deletePrice(price.id);
      const fresh = await listStorePrices(selectedStore!.id);
      setPrices(fresh);
      setNotice(t("merchant.priceDeleted"));
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };

  if (loading) {
    return <Spinner fullScreen />;
  }

  const pickedPosition =
    storeForm.latitude && storeForm.longitude
      ? { lat: Number(storeForm.latitude), lng: Number(storeForm.longitude) }
      : null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className={`${heading} text-2xl`}>{t("merchant.title")}</h1>
      <p className={`${muted} mt-1 text-sm`}>{t("merchant.subtitle")}</p>

      {notice && (
        <div className={`${noticeCls.success} mt-4`} role="status">
          {notice}
        </div>
      )}
      {error && <div className="mt-4"><ErrorMessage message={error} /></div>}

      <section className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className={card}>
          <div className="p-5">
            <h2 className={`${heading} flex items-center justify-between text-lg`}>
              {t("merchant.stores")}
              <button
                type="button"
                onClick={resetStoreForm}
                className={`${btnPrimary} px-3 py-1.5 text-xs`}
              >
                {t("merchant.newStore")}
              </button>
            </h2>
            {stores.length === 0 ? (
              <p className={`${muted} mt-3 text-sm`}>{t("merchant.noStores")}</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {stores.map((store) => (
                  <li
                    key={store.id}
                    className={`rounded-lg border p-3 ${
                      selectedStore?.id === store.id
                        ? "border-brand-green bg-green-50 dark:bg-green-900/20"
                        : "border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    <button
                      type="button"
                      className="w-full text-left"
                      onClick={() => setSelectedStore(store)}
                    >
                      <p className={`${heading} font-semibold`}>{store.name}</p>
                      <p className={`${muted} text-xs`}>
                        {t("merchant.storeCityValue", {
                          city: store.city ?? t("merchant.storeCity"),
                          verified: store.is_verified ? t("merchant.verified") : "",
                        })}
                      </p>
                      {(store.latitude == null || store.longitude == null) && (
                        <p className={`${badge.yellow} mt-1 inline-block`}>
                          {t("merchant.noLocationBadge")}
                        </p>
                      )}
                    </button>
                    <div className="mt-2 flex gap-3">
                      <button
                        type="button"
                        onClick={() => startEditStore(store)}
                        className="text-xs font-medium text-brand-green hover:underline"
                      >
                        {t("merchant.editStore")}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteStore(store)}
                        className="text-xs font-medium text-brand-red hover:underline"
                      >
                        {t("merchant.deleteStore")}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <form onSubmit={handleStoreSubmit} className="mt-4 space-y-3 border-t border-slate-100 pt-4 dark:border-slate-700">
              <p className={`${heading} text-sm font-semibold`}>
                {editingStore
                  ? t("merchant.storeFormEdit", { name: editingStore.name })
                  : t("merchant.storeFormTitle")}
              </p>
              <input
                type="text"
                required
                placeholder={t("merchant.storeName")}
                value={storeForm.name}
                onChange={(event) => setStoreForm({ ...storeForm, name: event.target.value })}
                className={input}
              />
              <input
                type="text"
                placeholder={t("merchant.storeCityField")}
                value={storeForm.city}
                onChange={(event) => setStoreForm({ ...storeForm, city: event.target.value })}
                className={input}
              />
              <input
                type="text"
                placeholder={t("merchant.storeAddress")}
                value={storeForm.address}
                onChange={(event) => setStoreForm({ ...storeForm, address: event.target.value })}
                className={input}
              />
              <input
                type="text"
                placeholder={t("merchant.storePhone")}
                value={storeForm.phone}
                onChange={(event) => setStoreForm({ ...storeForm, phone: event.target.value })}
                className={input}
              />
              <input
                type="text"
                placeholder={t("merchant.storeHours")}
                value={storeForm.opening_hours}
                onChange={(event) => setStoreForm({ ...storeForm, opening_hours: event.target.value })}
                className={input}
              />
              <textarea
                placeholder={t("merchant.storeDescription")}
                value={storeForm.description}
                onChange={(event) => setStoreForm({ ...storeForm, description: event.target.value })}
                rows={2}
                className={input}
              />

              <details className="rounded-lg border border-slate-200 p-2 dark:border-slate-700">
                <summary className="cursor-pointer text-xs font-medium text-slate-600 dark:text-slate-300">
                  🗺️ Localisation
                </summary>
                <div className="mt-2">
                  {editingStore &&
                    (editingStore.latitude == null || editingStore.longitude == null) && (
                      <p className={`${noticeCls.warning} mb-2`}>
                        {t("merchant.locationMissingWarning")}
                      </p>
                    )}
                  <LocationPicker
                    value={pickedPosition}
                    onChange={(position) =>
                      setStoreForm((form) => ({
                        ...form,
                        latitude: String(position.lat),
                        longitude: String(position.lng),
                      }))
                    }
                  />
                  {pickedPosition && (
                    <p className={`${muted} mt-2 text-xs`}>
                      {pickedPosition.lat.toFixed(5)}, {pickedPosition.lng.toFixed(5)}
                    </p>
                  )}
                </div>
              </details>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={storeSubmitting}
                  className={`${btnPrimary} flex-1`}
                >
                  {storeSubmitting
                    ? t("common.saving")
                    : editingStore
                      ? t("common.save")
                      : t("merchant.storeCreate")}
                </button>
                {editingStore && (
                  <button type="button" onClick={resetStoreForm} className={btnSecondary}>
                    {t("common.cancel")}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>

        {selectedStore ? (
          <div className={`${card} lg:col-span-2`}>
            <div className="p-5">
              <h2 className={`${heading} text-lg`}>
                {t("merchant.productsOf", { name: selectedStore.name })}
              </h2>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={openAddProduct} className={`${btnPrimary} px-3 py-1.5 text-xs`}>
                  {t("merchant.addProduct")}
                </button>
                {products.length > 0 && (
                  <button type="button" onClick={openAddProduct} className={`${btnSecondary} px-3 py-1.5 text-xs`}>
                    {t("merchant.addPriceToProduct")}
                  </button>
                )}
              </div>

              {products.length === 0 ? (
                <p className={`${muted} mt-4 text-sm`}>{t("merchant.noProducts")}</p>
              ) : (
                <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
                  <table className="w-full text-left text-sm">
                    <thead className={tableHead}>
                      <tr>
                        <th className="px-3 py-2">{t("merchant.productCol")}</th>
                        <th className="px-3 py-2">{t("merchant.priceCol")}</th>
                        <th className="px-3 py-2">{t("merchant.availableCol")}</th>
                        <th className="px-3 py-2">{t("merchant.confirmationsCol")}</th>
                        <th className="px-3 py-2 text-right">{t("merchant.actionsCol")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {products.map((product) => {
                        const price = prices.find((p) => p.product_id === product.id);
                        return (
                          <tr key={product.id} className={tableRow}>
                            <td className="px-3 py-2 align-top">
                              <p className={`${heading} font-medium`}>{product.name}</p>
                              {product.brand && (
                                <p className={`${muted} text-xs`}>{product.brand}</p>
                              )}
                            </td>
                            <td className="px-3 py-2 font-semibold">
                              {price ? `${formatNumber(price.amount)} FCFA` : "—"}
                            </td>
                            <td className="px-3 py-2">
                              {price ? (
                                <button
                                  type="button"
                                  onClick={() => quickToggleAvailability(price)}
                                  title={t("merchant.toggleAvailability")}
                                  className={price.is_available ? badge.green : badge.red}
                                >
                                  {price.is_available ? t("merchant.available") : t("merchant.unavailable")}
                                </button>
                              ) : (
                                <span className={`${muted} text-xs`}>{t("merchant.noPrice")}</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-xs text-slate-500 dark:text-slate-400">
                              {price?.confirmed_count ?? 0}
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex justify-end gap-2 text-xs">
                                <button
                                  type="button"
                                  onClick={() => openEditProduct(product)}
                                  className="font-medium text-brand-green hover:underline"
                                >
                                  {t("merchant.editProduct")}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleProductDelete(product)}
                                  className="font-medium text-brand-red hover:underline"
                                >
                                  {t("merchant.deleteProduct")}
                                </button>
                                {price && (
                                  <button
                                    type="button"
                                    onClick={() => handlePriceDelete(price)}
                                    className="font-medium text-slate-400 hover:underline dark:text-slate-500"
                                    title={t("merchant.removePrice")}
                                  >
                                    {t("merchant.removePrice")}
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              <p className={`${muted} mt-3 text-xs`}>{t("merchant.tip")}</p>
            </div>
          </div>
        ) : (
          <div className={`${card} p-8 text-center text-sm lg:col-span-2`}>
            <p className={`${muted}`}>{t("merchant.selectStore")}</p>
          </div>
        )}
      </section>

      {productModal && selectedStore && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setProductModal(false)}
        >
          <form
            onSubmit={handleProductSubmit}
            className={`${card} w-full max-w-md p-6 shadow-xl`}
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className={`${heading} text-lg`}>
              {selectedProduct ? t("merchant.editProductTitle") : t("merchant.newProduct")}
            </h3>
            <div className="mt-4 space-y-3">
              <label className="block">
                <span className={label}>{t("merchant.productName")}</span>
                <input
                  type="text"
                  required
                  value={productName}
                  onChange={(event) => setProductName(event.target.value)}
                  className={input}
                />
              </label>
              <label className="block">
                <span className={label}>{t("merchant.productBrand")}</span>
                <input
                  type="text"
                  value={productBrand}
                  onChange={(event) => setProductBrand(event.target.value)}
                  className={input}
                />
              </label>
              <label className="block">
                <span className={label}>{t("merchant.productCategory")}</span>
                <select
                  value={productCategory}
                  onChange={(event) => setProductCategory(event.target.value)}
                  className={input}
                >
                  <option value="">{t("merchant.noCategory")}</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={String(cat.id)}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className={label}>{t("merchant.productPrice")}</span>
                <input
                  type="number"
                  min="1"
                  value={priceAmount}
                  onChange={(event) => setPriceAmount(event.target.value)}
                  placeholder={t("merchant.pricePlaceholder")}
                  className={input}
                />
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                <input
                  type="checkbox"
                  checked={priceAvailable}
                  onChange={(event) => setPriceAvailable(event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-brand-green focus:ring-brand-green"
                />
                {t("merchant.availableCheck")}
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setProductModal(false)} className={btnSecondary}>
                {t("common.cancel")}
              </button>
              <button type="submit" disabled={priceSubmitting} className={btnPrimary}>
                {priceSubmitting ? t("common.saving") : t("common.save")}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}