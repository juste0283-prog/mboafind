// ==================================
// Types partagés du frontend MboaFind
// Correspondent aux schémas Pydantic du backend.
// ==================================

export type UserRole =
  | "CLIENT"
  | "COMMERCANT"
  | "PROFESSIONNEL"
  | "ADMIN";

export interface User {
  id: number;
  email: string;
  full_name?: string | null;
  phone?: string | null;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface Token {
  access_token: string;
  token_type: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  full_name?: string | null;
  phone?: string | null;
  role?: UserRole;
}

export interface ApiErrorResponse {
  detail?: string;
}