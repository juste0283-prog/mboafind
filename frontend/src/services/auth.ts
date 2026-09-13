// Appels API liés à l'authentification (routes /auth/* du backend).
import type { LoginRequest, RegisterRequest, Token, User } from "../types";
import { api } from "./api";

export async function registerUser(data: RegisterRequest): Promise<User> {
  const { data: user } = await api.post<User>("/auth/register", data);
  return user;
}

export async function loginUser(data: LoginRequest): Promise<Token> {
  const { data: token } = await api.post<Token>("/auth/login", data);
  return token;
}

export async function fetchCurrentUser(): Promise<User> {
  const { data: user } = await api.get<User>("/auth/me");
  return user;
}

export async function updateCurrentUser(
  data: Partial<Pick<User, "full_name" | "phone" | "notify_price_changes">>,
): Promise<User> {
  const { data: user } = await api.patch<User>("/users/me", data);
  return user;
}