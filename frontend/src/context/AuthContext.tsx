// Contexte d'authentification global : utilisateur courant, login, register, logout.
import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { LoginRequest, RegisterRequest, User } from "../types";
import { fetchCurrentUser, loginUser, registerUser } from "../services/auth";
import {
  clearStoredUser,
  clearToken,
  getStoredUser,
  getToken,
  setStoredUser,
  setToken,
} from "../utils/storage";

export interface AuthContextValue {
  user: User | null;
  // Vérification du token au premier chargement de la page.

  isInitializing: boolean;
  // Requête d'authentification en cours (login / register).
  isLoading: boolean;
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => getStoredUser());
  const [isInitializing, setIsInitializing] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  // Au chargement : si un token existe, on rafraîchit le profil.

  useEffect(() => {
    if (!getToken()) {
      setIsInitializing(false);
      return;
    }

    fetchCurrentUser()
      .then((current) => {
        setUser(current);
        setStoredUser(current);
      })
      .catch(() => {
        clearToken();
        clearStoredUser();
        setUser(null);
      })
      .finally(() => setIsInitializing(false));
  }, []);

  const login = useCallback(async (data: LoginRequest) => {
    setIsLoading(true);
    try {
      const token = await loginUser(data);
      setToken(token.access_token);
      const current = await fetchCurrentUser();
      setUser(current);
      setStoredUser(current);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (data: RegisterRequest) => {
    setIsLoading(true);
    try {
      await registerUser(data);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    clearToken();
    clearStoredUser();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, isInitializing, isLoading, login, register, logout }),
    [user, isInitializing, isLoading, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}