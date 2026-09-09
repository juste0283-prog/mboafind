// Appels API : alertes de prix (« m'alerter sous X FCFA »).
import type { PriceAlert, PriceAlertCreate } from "../types";
import { api } from "./api";

export async function listPriceAlerts(
  triggeredOnly = false,
): Promise<PriceAlert[]> {
  const { data } = await api.get<PriceAlert[]>("/alerts", {
    params: { triggered_only: triggeredOnly },
  });
  return data;
}

export async function upsertPriceAlert(
  payload: PriceAlertCreate,
): Promise<PriceAlert> {
  const { data } = await api.post<PriceAlert>("/alerts", payload);
  return data;
}

export async function updatePriceAlert(
  id: number,
  patch: { target_price?: number; is_active?: boolean },
): Promise<PriceAlert> {
  const { data } = await api.patch<PriceAlert>(`/alerts/${id}`, patch);
  return data;
}

export async function deletePriceAlert(id: number): Promise<void> {
  await api.delete(`/alerts/${id}`);
}