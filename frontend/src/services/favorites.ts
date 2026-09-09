// Appels API : favoris (produits, boutiques, professionnels).
import type { Favorite, FavoriteItemType, FavoriteStatus } from "../types";
import { api } from "./api";

export async function listFavorites(
  itemType?: FavoriteItemType,
): Promise<Favorite[]> {
  const { data } = await api.get<Favorite[]>("/favorites", {
    params: { item_type: itemType },
  });
  return data;
}

export async function getFavoriteStatus(
  itemType: FavoriteItemType,
  itemId: number,
): Promise<FavoriteStatus> {
  const { data } = await api.get<FavoriteStatus>("/favorites/status", {
    params: { item_type: itemType, item_id: itemId },
  });
  return data;
}

export async function addFavorite(
  itemType: FavoriteItemType,
  itemId: number,
): Promise<Favorite> {
  const { data } = await api.post<Favorite>("/favorites", {
    item_type: itemType,
    item_id: itemId,
  });
  return data;
}

export async function removeFavorite(
  itemType: FavoriteItemType,
  itemId: number,
): Promise<void> {
  await api.delete(`/favorites/${itemType}/${itemId}`);
}