// Instance Axios centralisée : préfixe /api/v1, token Bearer injecté
// automatiquement, et purge du stockage en cas de 401.
import axios from "axios";
import { clearStoredUser, clearToken, getToken } from "../utils/storage";

export const api = axios.create({
  baseURL: "/api/v1",
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      // Token expiré ou invalide : on nettoie la session locale.
      clearToken();
      clearStoredUser();
    }
    throw error;
  }
);