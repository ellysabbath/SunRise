import api from "../lib/axios";

// ==================================================================
// Types
// ==================================================================
export type MalipoNjia = "mpesa" | "tigo" | "airtel" | "halopesa" | "cash" | "bank";
export type MalipoHali = "inasubiri" | "imethibitishwa" | "imekataliwa";

export interface OrderItem {
  product_id: string;
  quantity: number;
}

export interface CreateOrderPayload {
  customer_id: string;
  store_id: string;
  items: OrderItem[];
  is_deni?: boolean;
  note?: string;
}

export interface MalipoPayload {
  order_id: string;
  njia: MalipoNjia;
  simu: string;
  kumbukumbu?: string;
  kiasi: number;
  hali?: MalipoHali;
}

export interface Order {
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
// API
// ==================================================================
export const ordersApi = {
  create: (payload: CreateOrderPayload) =>
    api.post<Order>("/orders/", payload).then((r) => r.data),

  get: (id: string) =>
    api.get<Order>(`/orders/${id}/`).then((r) => r.data),

  createMalipo: (payload: MalipoPayload) =>
    api.post("/malipo/", payload).then((r) => r.data),

  // ✅ Deni la mteja
  deni: () =>
    api
      .get<{ total_deni: number; orders: Order[] }>("/orders/deni/")
      .then((r) => r.data),
};