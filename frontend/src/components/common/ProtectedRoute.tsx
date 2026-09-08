// Garde de route : redirige vers /login si l'utilisateur n'est pas connecté.
import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import Spinner from "./Spinner";

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, isInitializing } = useAuth();
  const location = useLocation();

  if (isInitializing) {
    return <Spinner fullScreen />;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}