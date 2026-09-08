// Hook d'accès au contexte d'authentification (utiliser dans les composants).
import { useContext } from "react";
import { AuthContext, type AuthContextValue } from "../context/AuthContext";

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth doit être utilisé à l'intérieur d'un <AuthProvider>");
  }
  return context;
}