import api from "../lib/axios";

// ==================================================================
// Types
// ==================================================================
export interface Store {
  id: string;
  name: string;
  location: string;
  owner: string;
  is_active: boolean;
}

// ==================================================================
// API
// ==================================================================
export const storesApi = {
  list: () => api.get<Store[]>("/stores/").then((r) => r.data),

  get: (id: string) =>
    api.get<Store>(`/stores/${id}/`).then((r) => r.data),

  create: (payload: { name: string; location: string }) =>
    api.post<Store>("/stores/", payload).then((r) => r.data),

  update: (id: string, payload: Partial<Store>) =>
    api.patch<Store>(`/stores/${id}/`, payload).then((r) => r.data),

  remove: (id: string) =>
    api.delete(`/stores/${id}/`).then((r) => r.data),
};