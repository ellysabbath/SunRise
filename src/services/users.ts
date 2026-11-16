import api from "../lib/axios";

// ==================================================================
// Types
// ==================================================================
export type UserRole = "mteja" | "muuzaji" | "mhazini" | "mmiliki" | "admin";

export interface User {
  id: string;
  phone: string;
  full_name: string;
  role: UserRole;
  store: string | null;
  is_active: boolean;
  created_at: string;
}

export interface CreateUserPayload {
  phone: string;
  full_name: string;
  password: string;
  role: UserRole;
  store_id?: string | null;
  is_active?: boolean;
}

// ==================================================================
// API
// ==================================================================
// Kumbuka: Backend ina routes chini ya `/auth/` (accounts/urls.py)
export const usersApi = {
  list: (params?: {
    role?: UserRole;
    store?: string;
    search?: string;
  }) =>
    api.get<User[]>("/auth/users/", { params }).then((r) => r.data),

  withoutStore: () =>
    api.get<User[]>("/auth/users/without-store/").then((r) => r.data),

  get: (id: string) =>
    api.get<User>(`/auth/users/${id}/`).then((r) => r.data),

  create: (payload: CreateUserPayload) =>
    api.post<User>("/auth/users/", payload).then((r) => r.data),

  update: (id: string, payload: Partial<User> | { store: string | null }) =>
    api.patch<User>(`/auth/users/${id}/`, payload).then((r) => r.data),
};