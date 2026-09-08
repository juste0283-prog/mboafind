import axios from "axios";

// Extrait un message lisible depuis une erreur d'API (FastAPI renvoie {"detail": "..."}).
export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { detail?: unknown } | undefined;
    if (typeof data?.detail === "string") {
      return data.detail;
    }
    return error.message;
  }
  return "Une erreur inattendue est survenue. Veuillez réessayer.";
}