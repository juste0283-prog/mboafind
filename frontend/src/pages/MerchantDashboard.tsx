// Tableau de bord commençant : gestion des boutiques, produits et prix.
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
import { FORMAT } from "../types";
import ErrorMessage from "../components/common/ErrorMessage";
import Spinner from "../components/common/Spinner";
import { getApiErrorMessage } from "../utils/apiError";

const inputClass =
  "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/30";

const emptyStoreForm = {
  name: "",
  description: "",
  city: "",
  address: "",
  phone: "",
  opening_hours: "",
};

export default function MerchantDashboard() {
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Formulaire création / édition boutique
  const [storeForm, setStoreForm] = useState(emptyStoreForm);
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

  const handleStoreSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setStoreSubmitting(true);
    setError(null);
    try {
      if (editingStore) {
        await updateStore(editingStore.id, storeForm);
        setNotice("Boutique mise à jour.");
      } else {
        const created = await createStore(storeForm);
        setSelectedStore(created);
        setNotice("Boutique créée avec succès.");
      }
      setEditingStore(null);
      setStoreForm(emptyStoreForm);
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
    });
  };

  const handleDeleteStore = async (store: Store) => {
    if (!window.confirm(`Supprimer définitivement la boutique « ${store.name} » ?`)) return;
    try {
      await deleteStore(store.id);
      setNotice("Boutique supprimée.");
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
      setNotice(selectedProduct ? "Produit et prix mis à jour." : "Produit ajouté à votre boutique.");
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
    if (!window.confirm(`Supprimer le produit « ${product.name} » ?`)) return;
    try {
      await deleteProduct(product.id);
      const freshProducts = await listStoreProducts(selectedStore!.id);
      setProducts(freshProducts);
      setNotice("Produit supprimé.");
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
    if (!window.confirm("Supprimer cette offre de prix ?")) return;
    try {
      await deletePrice(price.id);
      const fresh = await listStorePrices(selectedStore!.id);
      setPrices(fresh);
      setNotice("Offre de prix supprimée.");
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };

  if (loading) {
    return <Spinner fullScreen />;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900">Espace commençant</h1>
      <p className="mt-1 text-sm text-gray-600">
        Gérez vos boutiques, vos produits et vos prix en toute simplicité.
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

      {/* ---- Gestion des boutiques ---- */}
      <section className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="flex items-center justify-between text-lg font-semibold text-gray-900">
            Mes boutiques
            <button
              type="button"
              onClick={() => {
                setEditingStore(null);
                setStoreForm(emptyStoreForm);
              }}
              className="rounded-md bg-brand-green px-3 py-1.5 text-xs font-semibold text-white hover:brightness-110"
            >
              + Nouvelle
            </button>
          </h2>
          {stores.length === 0 ? (
            <p className="mt-3 text-sm text-gray-500">
              Aucune boutique. Créez-en une pour publier vos produits.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {stores.map((store) => (
                <li
                  key={store.id}
                  className={`rounded-lg border p-3 ${
                    selectedStore?.id === store.id
                      ? "border-brand-green bg-green-50"
                      : "border-gray-200"
                  }`}
                >
                  <button
                    type="button"
                    className="w-full text-left"
                    onClick={() => setSelectedStore(store)}
                  >
                    <p className="font-semibold text-gray-900">{store.name}</p>
                    <p className="text-xs text-gray-500">
                      {store.city ?? "Ville non renseignée"}
                      {store.is_verified && " · Vérifiée"}
                    </p>
                  </button>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => startEditStore(store)}
                      className="text-xs font-medium text-brand-green hover:underline"
                    >
                      Modifier
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteStore(store)}
                      className="text-xs font-medium text-brand-red hover:underline"
                    >
                      Supprimer
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <form onSubmit={handleStoreSubmit} className="mt-4 space-y-3 border-t border-gray-100 pt-4">
            <p className="text-sm font-semibold text-gray-700">
              {editingStore ? `Modifier « ${editingStore.name} »` : "Créer une boutique"}
            </p>
            <input
              type="text"
              required
              placeholder="Nom de la boutique"
              value={storeForm.name}
              onChange={(event) => setStoreForm({ ...storeForm, name: event.target.value })}
              className={inputClass}
            />
            <input
              type="text"
              placeholder="Ville (ex : Yaoundé)"
              value={storeForm.city}
              onChange={(event) => setStoreForm({ ...storeForm, city: event.target.value })}
              className={inputClass}
            />
            <input
              type="text"
              placeholder="Adresse"
              value={storeForm.address}
              onChange={(event) => setStoreForm({ ...storeForm, address: event.target.value })}
              className={inputClass}
            />
            <input
              type="text"
              placeholder="Téléphone"
              value={storeForm.phone}
              onChange={(event) => setStoreForm({ ...storeForm, phone: event.target.value })}
              className={inputClass}
            />
            <input
              type="text"
              placeholder="Horaires (ex : 8h00 - 18h00)"
              value={storeForm.opening_hours}
              onChange={(event) => setStoreForm({ ...storeForm, opening_hours: event.target.value })}
              className={inputClass}
            />
            <textarea
              placeholder="Description"
              value={storeForm.description}
              onChange={(event) => setStoreForm({ ...storeForm, description: event.target.value })}
              rows={2}
              className={inputClass}
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={storeSubmitting}
                className="flex-1 rounded-md bg-brand-green px-4 py-2 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-50"
              >
                {storeSubmitting
                  ? "Enregistrement…"
                  : editingStore
                    ? "Enregistrer"
                    : "Créer la boutique"}
              </button>
              {editingStore && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingStore(null);
                    setStoreForm(emptyStoreForm);
                  }}
                  className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
                >
                  Annuler
                </button>
              )}
            </div>
          </form>
        </div>

        {/* ---- Produits & prix de la boutique sélectionnée ---- */}
        {selectedStore ? (
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm lg:col-span-2">
            <h2 className="text-lg font-semibold text-gray-900">
              Produits de « {selectedStore.name} »
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={openAddProduct}
                className="rounded-md bg-brand-green px-3 py-1.5 text-xs font-semibold text-white hover:brightness-110"
              >
                + Ajouter un produit
              </button>
              {products.length > 0 && (
                <button
                  type="button"
                  onClick={openAddProduct}
                  className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                >
                  Ajouter un prix à un produit existant
                </button>
              )}
            </div>

            {products.length === 0 ? (
              <p className="mt-4 text-sm text-gray-500">
                Aucun produit dans cette boutique. Ajoutez votre premier produit pour être visible
                par les clients.
              </p>
            ) : (
              <div className="mt-4 overflow-hidden rounded-lg border border-gray-200">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                    <tr>
                      <th className="px-3 py-2">Produit</th>
                      <th className="px-3 py-2">Prix</th>
                      <th className="px-3 py-2">Dispo</th>
                      <th className="px-3 py-2">Confirmations</th>
                      <th className="px-3 py-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {products.map((product) => {
                      const price = prices.find((p) => p.product_id === product.id);
                      return (
                        <tr key={product.id} className="align-top hover:bg-gray-50">
                          <td className="px-3 py-2">
                            <p className="font-medium text-gray-900">{product.name}</p>
                            {product.brand && (
                              <p className="text-xs text-gray-500">{product.brand}</p>
                            )}
                          </td>
                          <td className="px-3 py-2 font-semibold">
                            {price ? `${FORMAT.format(price.amount)} FCFA` : "—"}
                          </td>
                          <td className="px-3 py-2">
                            {price ? (
                              <button
                                type="button"
                                onClick={() => quickToggleAvailability(price)}
                                title="Basculer la disponibilité"
                                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                  price.is_available
                                    ? "bg-green-100 text-green-700"
                                    : "bg-red-100 text-red-700"
                                }`}
                              >
                                {price.is_available ? "Disponible" : "Indisponible"}
                              </button>
                            ) : (
                              <span className="text-xs text-gray-400">Aucun prix</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-xs text-gray-500">
                            {price?.confirmed_count ?? 0}
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex justify-end gap-2 text-xs">
                              <button
                                type="button"
                                onClick={() => openEditProduct(product)}
                                className="font-medium text-brand-green hover:underline"
                              >
                                Modifier
                              </button>
                              <button
                                type="button"
                                onClick={() => handleProductDelete(product)}
                                className="font-medium text-brand-red hover:underline"
                              >
                                Supprimer
                              </button>
                              {price && (
                                <button
                                  type="button"
                                  onClick={() => handlePriceDelete(price)}
                                  className="font-medium text-gray-400 hover:underline"
                                  title="Retirer ce prix (le produit reste au catalogue)"
                                >
                                  Retirer le prix
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
            <p className="mt-3 text-xs text-gray-400">
              Astuce : chaque produit peut avoir un prix par boutique. La date de mise à jour est
              enregistrée automatiquement.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500 lg:col-span-2">
            Sélectionnez une boutique pour gérer ses produits et ses prix.
          </div>
        )}
      </section>

      {/* ---- Modal produit ---- */}
      {productModal && selectedStore && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setProductModal(false)}
        >
          <form
            onSubmit={handleProductSubmit}
            className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-gray-900">
              {selectedProduct ? "Modifier le produit" : "Ajouter un produit"}
            </h3>
            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-gray-700">Nom du produit</span>
                <input
                  type="text"
                  required
                  value={productName}
                  onChange={(event) => setProductName(event.target.value)}
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-gray-700">Marque (optionnel)</span>
                <input
                  type="text"
                  value={productBrand}
                  onChange={(event) => setProductBrand(event.target.value)}
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-gray-700">Catégorie</span>
                <select
                  value={productCategory}
                  onChange={(event) => setProductCategory(event.target.value)}
                  className={inputClass}
                >
                  <option value="">Aucune</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={String(cat.id)}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-gray-700">Prix (FCFA)</span>
                <input
                  type="number"
                  min="1"
                  value={priceAmount}
                  onChange={(event) => setPriceAmount(event.target.value)}
                  placeholder="Ex : 25000"
                  className={inputClass}
                />
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={priceAvailable}
                  onChange={(event) => setPriceAvailable(event.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-brand-green focus:ring-brand-green"
                />
                Produit disponible
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setProductModal(false)}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={priceSubmitting}
                className="rounded-md bg-brand-green px-4 py-2 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-50"
              >
                {priceSubmitting ? "Enregistrement…" : "Enregistrer"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}