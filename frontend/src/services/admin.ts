// Appels API : modération admin (signalements et avis).
import type { ReportAdmin, Review } from "../types";
import { api } from "./api";

export interface ModerationPage<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
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