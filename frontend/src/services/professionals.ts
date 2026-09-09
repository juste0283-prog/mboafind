// Appels API : professionnels, services (recherche publique).
import type {
  ProfessionalDetail,
  ProfessionalPage,
} from "../types";
import { api } from "./api";

export interface ProfessionalSearchParams {
  search?: string;
  city?: string;
  min_rating?: number;
  sort?: string;
  lat?: number;
  lng?: number;
  page?: number;
  page_size?: number;
}

export async function searchProfessionals(
  params: ProfessionalSearchParams,
): Promise<ProfessionalPage> {
  const { data } = await api.get<ProfessionalPage>("/professionals", { params });
  return data;
}

export async function getProfessional(
  professionalId: number,
): Promise<ProfessionalDetail> {
  const { data } = await api.get<ProfessionalDetail>(
    `/professionals/${professionalId}`,
  );
  return data;
}