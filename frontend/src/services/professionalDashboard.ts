// Appels API : profil professionnel (dashboard).
import type { ProfessionalProfile, Service } from "../types";
import { api } from "./api";

export interface ProfessionalProfilePayload {
  profession: string;
  bio?: string | null;
  city?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export async function getProfessionalProfile(): Promise<ProfessionalProfile> {
  const { data } = await api.get<ProfessionalProfile>("/me/professional");
  return data;
}

export async function upsertProfessionalProfile(
  payload: ProfessionalProfilePayload,
): Promise<ProfessionalProfile> {
  const { data } = await api.put<ProfessionalProfile>("/me/professional", payload);
  return data;
}

export async function createService(payload: {
  name: string;
  description?: string;
  price?: number;
}): Promise<Service> {
  const { data } = await api.post<Service>("/me/professional/services", payload);
  return data;
}

export async function updateService(
  serviceId: number,
  payload: { name?: string; description?: string; price?: number },
): Promise<Service> {
  const { data } = await api.patch<Service>(
    `/me/professional/services/${serviceId}`,
    payload,
  );
  return data;
}

export async function deleteService(serviceId: number): Promise<void> {
  await api.delete(`/me/professional/services/${serviceId}`);
}