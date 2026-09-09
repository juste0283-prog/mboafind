// Appels API : catalogue (produits, boutiques, prix), recherche & comparaison.
import type {
  Category,
  PriceConfirmResult,
  PriceHistoryEntry,
  PriceManage,
  ProductAdmin,
  ProductDetail,
  ProductPage,
  Store,
  StoreDetail,
} from "../types";
import { api } from "./api";

export interface ProductSearchParams {
  search?: string;
  category_id?: number;
  city?: string;
  min_price?: number;
  max_price?: number;
  available?: boolean;
  min_rating?: number;
  sort?: string;
  lat?: number;
  lng?: number;
  page?: number;
  page_size?: number;
}

export async function listCategories(): Promise<Category[]> {
  const { data } = await api.get<Category[]>("/categories");
  return data;
}

export async function searchProducts(
  params: ProductSearchParams,
): Promise<ProductPage> {
  const { data } = await api.get<ProductPage>("/products", { params });
  return data;
}

export async function getProduct(productId: number): Promise<ProductDetail> {
  const { data } = await api.get<ProductDetail>(`/products/${productId}`);
  return data;
}

export async function getStore(storeId: number): Promise<StoreDetail> {
  const { data } = await api.get<StoreDetail>(`/stores/${storeId}`);
  return data;
}

export async function confirmPrice(priceId: number): Promise<PriceConfirmResult> {
  const { data } = await api.post<PriceConfirmResult>(`/prices/${priceId}/confirm`);
  return data;
}

export async function getPriceHistory(
  priceId: number,
): Promise<PriceHistoryEntry[]> {
  const { data } = await api.get<PriceHistoryEntry[]>(
    `/prices/${priceId}/history`,
  );
  return data;
}

// ---------------- Commençant : gestion de sa boutique ----------------

export interface StoreCreatePayload {
  name: string;
  description?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  opening_hours?: string | null;
}

export type StoreUpdatePayload = Partial<StoreCreatePayload>;

export async function createStore(payload: StoreCreatePayload): Promise<Store> {
  const { data } = await api.post<Store>("/stores", payload);
  return data;
}

export async function listMyStores(): Promise<Store[]> {
  const { data } = await api.get<Store[]>("/stores");
  return data;
}

export async function updateStore(
  storeId: number,
  payload: StoreUpdatePayload,
): Promise<Store> {
  const { data } = await api.patch<Store>(`/stores/${storeId}`, payload);
  return data;
}

export async function deleteStore(storeId: number): Promise<void> {
  await api.delete(`/stores/${storeId}`);
}

export interface ProductCreatePayload {
  name: string;
  description?: string | null;
  brand?: string | null;
  image_url?: string | null;
  category_id?: number | null;
}

export type ProductUpdatePayload = Partial<ProductCreatePayload>;

export async function createProduct(
  storeId: number,
  payload: ProductCreatePayload,
): Promise<ProductAdmin> {
  const { data } = await api.post<ProductAdmin>(
    `/stores/${storeId}/products`,
    payload,
  );
  return data;
}

export async function listStoreProducts(storeId: number): Promise<ProductAdmin[]> {
  const { data } = await api.get<ProductAdmin[]>(`/stores/${storeId}/products`);
  return data;
}

export async function updateProduct(
  productId: number,
  payload: ProductUpdatePayload,
): Promise<ProductAdmin> {
  const { data } = await api.patch<ProductAdmin>(
    `/stores/products/${productId}`,
    payload,
  );
  return data;
}

export async function deleteProduct(productId: number): Promise<void> {
  await api.delete(`/stores/products/${productId}`);
}

export interface PriceCreatePayload {
  amount: number;
  is_available: boolean;
}

export async function createOrUpdatePrice(
  storeId: number,
  productId: number,
  payload: PriceCreatePayload,
): Promise<PriceManage> {
  const { data } = await api.post<PriceManage>(
    `/stores/${storeId}/prices`,
    payload,
    { params: { product_id: productId } },
  );
  return data;
}

export async function listStorePrices(storeId: number): Promise<PriceManage[]> {
  const { data } = await api.get<PriceManage[]>(`/stores/${storeId}/prices`);
  return data;
}

export async function updatePrice(
  priceId: number,
  payload: Partial<PriceCreatePayload>,
): Promise<PriceManage> {
  const { data } = await api.patch<PriceManage>(`/prices/${priceId}`, payload);
  return data;
}

export async function deletePrice(priceId: number): Promise<void> {
  await api.delete(`/prices/${priceId}`);
}