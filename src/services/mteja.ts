import api from "../lib/axios";

// ==================================================================
// Types
// ==================================================================
export interface MtejaOrder {
  id: string;
  total: number | string;
  deni_iliyobaki: number | string;
  is_deni: boolean;
  deni_imekwisha: boolean;
  created_at: string;
  status?: string;
  items_count?: number;
}

// ==================================================================
// API — inatumia endpoints zilizopo
// ==================================================================
export const mtejaApi = {
  // Orders zote — backend inachuja kwa request.user
  orders: (params?: { limit?: number }) =>
    api.get<MtejaOrder[]>("/orders/", { params }).then((r) => r.data),

  // Order moja
  order: (id: string) =>
    api.get<MtejaOrder>(`/orders/${id}/`).then((r) => r.data),
};