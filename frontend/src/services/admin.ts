// Appels API : console d'administration (stats, boutiques, professionnels,
// comptes et moderation des signalements / avis).
import type {
  AdminOverview,
  AdminProfessionalItem,
  AdminProfessionalList,
  AdminStoreItem,
  AdminStoreList,
  AdminUserItem,
  AdminUserList,
  ReportAdmin,
  Review,
} from "../types";
import { api } from "./api";

export interface ModerationPage<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export async function getAdminOverview(): Promise<AdminOverview> {
  const { data } = await api.get<AdminOverview>("/admin/overview");
  return data;
}

export async function listAdminStores(): Promise<AdminStoreList> {
  const { data } = await api.get<AdminStoreList>("/admin/stores");
  return data;
}

export async function setStoreVerified(
  storeId: number,
  isVerified: boolean,
): Promise<AdminStoreItem> {
  const { data } = await api.patch<AdminStoreItem>(
    `/admin/stores/${storeId}/verify`,
    { is_verified: isVerified },
  );
  return data;
}

export async function listAdminProfessionals(): Promise<AdminProfessionalList> {
  const { data } = await api.get<AdminProfessionalList>("/admin/professionals");
  return data;
}

export async function setProfessionalVerified(
  professionalId: number,
  isVerified: boolean,
): Promise<AdminProfessionalItem> {
  const { data } = await api.patch<AdminProfessionalItem>(
    `/admin/professionals/${professionalId}/verify`,
    { is_verified: isVerified },
  );
  return data;
}

export async function listAdminUsers(): Promise<AdminUserList> {
  const { data } = await api.get<AdminUserList>("/admin/users");
  return data;
}

export async function setUserStatus(
  userId: number,
  isActive: boolean,
): Promise<AdminUserItem> {
  const { data } = await api.patch<AdminUserItem>(
    `/admin/users/${userId}/status`,
    { is_active: isActive },
  );
  return data;
}

export async function listAdminReports(params?: {
  status?: string;
  target_type?: string;
  page?: number;
  page_size?: number;
}): Promise<ModerationPage<ReportAdmin>> {
  const { data } = await api.get<ModerationPage<ReportAdmin>>("/admin/reports", {
    params,
  });
  return data;
}

export async function decideReport(
  reportId: number,
  status: "RESOLVED" | "DISMISSED",
): Promise<ReportAdmin> {
  const { data } = await api.patch<ReportAdmin>(`/admin/reports/${reportId}`, {
    status,
  });
  return data;
}

export async function listAdminReviews(params?: {
  moderation_status?: string;
  page?: number;
  page_size?: number;
}): Promise<ModerationPage<Review>> {
  const { data } = await api.get<ModerationPage<Review>>("/admin/reviews", {
    params,
  });
  return data;
}

export async function decideReview(
  reviewId: number,
  moderationStatus: "PENDING" | "APPROVED" | "REJECTED",
): Promise<Review> {
  const { data } = await api.patch<Review>(`/admin/reviews/${reviewId}`, {
    moderation_status: moderationStatus,
  });
  return data;
}