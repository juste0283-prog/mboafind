// ==================================
// Types partagés du frontend MboaFind
// Correspondent aux schémas Pydantic du backend.
// ==================================

export type UserRole =
  | "CLIENT"
  | "COMMERCANT"
  | "PROFESSIONNEL"
  | "ADMIN";

export interface User {
  id: number;
  email: string;
  full_name?: string | null;
  phone?: string | null;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface Token {
  access_token: string;
  token_type: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  full_name?: string | null;
  phone?: string | null;
  role?: UserRole;
}

export interface ApiErrorResponse {
  detail?: string;
}

// ---------------- Catalogue : catégories, produits, prix, boutiques ----------------

export interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
}

export interface CategorySummary {
  id: number;
  name: string;
  slug: string;
}

export interface ProductListItem {
  id: number;
  name: string;
  slug: string;
  brand?: string | null;
  image_url?: string | null;
  category?: CategorySummary | null;
  min_price?: number | null;
  max_price?: number | null;
  avg_price?: number | null;
  is_available: boolean;
  store_count: number;
  updated_at?: string | null;
  rating_avg?: number | null;
  rating_count: number;
}

export interface ProductImage {
  id: number;
  product_id: number;
  url: string;
  is_primary: boolean;
  position: number;
  created_at: string;
}

export interface ProductPage {
  items: ProductListItem[];
  total: number;
  page: number;
  page_size: number;
}

export interface Offer {
  id: number;
  store_id: number;
  store_name: string;
  store_city?: string | null;
  store_is_verified: boolean;
  store_latitude?: number | null;
  store_longitude?: number | null;
  store_rating_avg?: number | null;
  store_rating_count?: number;
  amount: number;
  currency: string;
  is_available: boolean;
  verification_status: "PENDING" | "VERIFIED" | "REJECTED";
  updated_at: string;
  confirmed_count: number;
  last_confirmed_at?: string | null;
  trust_score: number;
  confirmed_by_me: boolean;
}

export interface PriceHistoryEntry {
  id: number;
  amount: number;
  currency: string;
  is_available: boolean;
  changed_at: string;
}

export interface PriceConfirmResult {
  price_id: number;
  confirmed_count: number;
  last_confirmed_at?: string | null;
  message: string;
  already_confirmed: boolean;
}

export interface ProductDetail {
  id: number;
  name: string;
  slug: string;
  brand?: string | null;
  description?: string | null;
  image_url?: string | null;
  category?: CategorySummary | null;
  min_price?: number | null;
  max_price?: number | null;
  avg_price?: number | null;
  store_count: number;
  is_available: boolean;
  updated_at?: string | null;
  rating_avg?: number | null;
  rating_count: number;
  offers: Offer[];
  images: ProductImage[];
}

export interface Store {
  id: number;
  name: string;
  description?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  opening_hours?: string | null;
  is_verified: boolean;
  is_active: boolean;
  owner_id: number;
  rating_avg?: number | null;
  rating_count: number;
}

export interface StoreDetail extends Store {
  products: ProductListItem[];
  reviews: Review[];
}

export interface PriceManage {
  id: number;
  product_id: number;
  product_name?: string | null;
  amount: number;
  currency: string;
  is_available: boolean;
  verification_status: "PENDING" | "VERIFIED" | "REJECTED";
  updated_at: string;
  confirmed_count: number;
  trust_score: number;
}

export interface ProductAdmin {
  id: number;
  name: string;
  slug: string;
  brand?: string | null;
  description?: string | null;
  image_url?: string | null;
  category_id?: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  images: ProductImage[];
}

// ---------------- Professionnels & services ----------------

export interface Service {
  id: number;
  professional_id: number;
  name: string;
  description?: string | null;
  price?: number | null;
  currency: string;
  is_active: boolean;
  created_at: string;
}

export interface ProfessionalListItem {
  id: number;
  profession: string;
  bio?: string | null;
  city?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  is_verified: boolean;
  user_name?: string | null;
  rating_avg?: number | null;
  rating_count: number;
  services_count: number;
}

export interface ProfessionalDetail {
  id: number;
  profession: string;
  bio?: string | null;
  city?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  is_verified: boolean;
  user_name?: string | null;
  phone?: string | null;
  rating_avg?: number | null;
  rating_count: number;
  services: Service[];
  reviews: Review[];
}

export interface ProfessionalPage {
  items: ProfessionalListItem[];
  total: number;
  page: number;
  page_size: number;
}

// ---------------- Demandes de service ----------------

export type ServiceRequestStatus =
  | "PENDING"
  | "ACCEPTED"
  | "DECLINED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED";

export interface ServiceRequest {
  id: number;
  client_id: number;
  service_id: number;
  service_name: string;
  professional_id: number;
  professional_name: string;
  profession?: string | null;
  price?: number | null;
  currency: string;
  message?: string | null;
  status: ServiceRequestStatus;
  created_at: string;
  updated_at: string;
}

export interface ServiceRequestPage {
  items: ServiceRequest[];
  total: number;
  page: number;
  page_size: number;
}

// ---------------- Avis & signalements ----------------

export interface Review {
  id: number;
  author_id: number;
  author_name?: string | null;
  store_id?: number | null;
  professional_id?: number | null;
  rating: number;
  comment?: string | null;
  moderation_status: "PENDING" | "APPROVED" | "REJECTED";
  created_at: string;
}

export type ReportTargetType =
  | "PRICE"
  | "PRODUCT"
  | "STORE"
  | "PROFESSIONAL"
  | "SERVICE"
  | "REVIEW"
  | "USER";

export interface Report {
  id: number;
  reporter_id: number;
  target_type: ReportTargetType;
  target_id: number;
  reason: string;
  description?: string | null;
  status: "PENDING" | "RESOLVED" | "DISMISSED";
  created_at: string;
}

export interface ReportPage {
  items: Report[];
  total: number;
  page: number;
  page_size: number;
}

// ---------------- Favoris ----------------

export type FavoriteItemType = "PRODUCT" | "STORE" | "PROFESSIONAL";

export interface Favorite {
  id: number;
  item_type: FavoriteItemType;
  item_id: number;
  item_name?: string | null;
  item_city?: string | null;
  created_at: string;
}

export interface FavoriteStatus {
  item_type: FavoriteItemType;
  item_id: number;
  is_favorite: boolean;
}

// ---------------- Alertes de prix ----------------

export interface PriceAlert {
  id: number;
  product_id: number;
  product_name: string;
  product_image?: string | null;
  current_price?: number | null;
  target_price: number;
  currency: string;
  is_active: boolean;
  triggered: boolean;
  triggered_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PriceAlertCreate {
  product_id: number;
  target_price: number;
  currency?: string;
}

// ---------------- Modération admin ----------------

export interface ReportAdmin extends Report {
  reporter_name?: string | null;
}

export interface ReviewAdmin extends Review {
  target_label?: string | null;
}

// ---------------- Profil professionnel (dashboard) ----------------

export interface ProfessionalProfile {
  id: number;
  profession: string;
  bio?: string | null;
  city?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  is_verified: boolean;
  created_at: string;
  services: Service[];
}

export const FORMAT = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });
export const CURRENCY = "XAF";