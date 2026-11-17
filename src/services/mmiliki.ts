import api from "../lib/axios";

// ==================================================================
// Types
// ==================================================================
export type UserRole = "mteja" | "muuzaji" | "mmiliki" | "admin" | "mhazini";

export interface MmilikiUser {
  id: string;
  phone: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  date_joined: string;
  last_login: string | null;
  last_login_display: string | null;
}

export interface CreateUserPayload {
  phone: string;
  full_name: string;
  role: UserRole;
  password: string;
  is_active?: boolean;
}

export interface UpdateUserPayload {
  phone?: string;
  full_name?: string;
  role?: UserRole;
  is_active?: boolean;
}

export interface UsersSummary {
  total: number;
  active: number;
  inactive: number;
  by_role: Record<string, number>;
}

// ==================================================================
// API
// ==================================================================
export const mmilikiUsersApi = {
  list: (params?: {
    role?: string;
    is_active?: boolean;
    search?: string;
  }) =>
    api
      .get<MmilikiUser[]>("/mmiliki/users/", { params })
      .then((r) => r.data),

  get: (id: string) =>
    api.get<MmilikiUser>(`/mmiliki/users/${id}/`).then((r) => r.data),

  create: (payload: CreateUserPayload) =>
    api.post<MmilikiUser>("/mmiliki/users/", payload).then((r) => r.data),

  update: (id: string, payload: UpdateUserPayload) =>
    api
      .patch<MmilikiUser>(`/mmiliki/users/${id}/`, payload)
      .then((r) => r.data),

  remove: (id: string) =>
    api.delete(`/mmiliki/users/${id}/`).then((r) => r.data),

  setPassword: (id: string, password: string) =>
    api
      .post(`/mmiliki/users/${id}/set-password/`, { password })
      .then((r) => r.data),

  toggleActive: (id: string) =>
    api
      .post(`/mmiliki/users/${id}/toggle-active/`)
      .then((r) => r.data),

  changeRole: (id: string, role: UserRole) =>
    api
      .post(`/mmiliki/users/${id}/change-role/`, { role })
      .then((r) => r.data),

  summary: () =>
    api.get<UsersSummary>("/mmiliki/users/summary/").then((r) => r.data),
};