// Appels API : avis (notation, commentaire) et signalements.
import type { Report, ReportPage, Review } from "../types";
import { api } from "./api";

export interface ReviewCreatePayload {
  store_id?: number;
  professional_id?: number;
  rating: number;
  comment?: string;
}

export async function createReview(payload: ReviewCreatePayload): Promise<Review> {
  const { data } = await api.post<Review>("/reviews", payload);
  return data;
}

export async function listStoreReviews(storeId: number): Promise<Review[]> {
  const { data } = await api.get<Review[]>("/reviews", {
    params: { store_id: storeId },
  });
  return data;
}

export async function listProfessionalReviews(
  professionalId: number,
): Promise<Review[]> {
  const { data } = await api.get<Review[]>("/reviews", {
    params: { professional_id: professionalId },
  });
  return data;
}

export async function listMyReviews(): Promise<Review[]> {
  const { data } = await api.get<Review[]>("/reviews/mine");
  return data;
}

// ---------------- Signalements ----------------

export interface ReportCreatePayload {
  target_type: string;
  target_id: number;
  reason: string;
  description?: string;
}

export async function createReport(
  payload: ReportCreatePayload,
): Promise<Report> {
  const { data } = await api.post<Report>("/reports", payload);
  return data;
}

export async function listMyReports(
  page = 1,
  pageSize = 20,
): Promise<ReportPage> {
  const { data } = await api.get<ReportPage>("/reports/mine", {
    params: { page, page_size: pageSize },
  });
  return data;
}