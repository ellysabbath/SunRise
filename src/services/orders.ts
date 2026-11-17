import api from "../lib/axios";

// ==================================================================
// Types
// ==================================================================
export type OrderStatus = "inasubiri_malipo" | "imekamilika" | "imekataliwa";
export type PaymentStatus = "inasubiri" | "imethibitishwa" | "imekataliwa";
export type PaymentMethod =
  | "mpesa"
  | "tigopesa"
  | "airtel"
  | "halopesa"
  | "cash"
  | "bank";

export interface OrderItem {
  id: string;
  order: string;
  product: string;
  product_name: string;
  quantity: string;
  unit_price: string;
  unit_cost: string;
  subtotal: string;
}

export interface Payment {
  id: string;
  order: string;
  method: PaymentMethod;
  phone: string;
  reference: string;
  amount: string;
  status: PaymentStatus;
  confirmed_by: string | null;
  confirmed_at: string | null;
}

export interface Order {
  id: string;
  customer: string;
  customer_name: string;
  store: string;
  store_name?: string;         // ✅ ongeza (backend inaweza kurudisha)
  order_date: string;
  status: OrderStatus;
  subtotal: string;
  discount: string;
  total: string;
  created_by: string;
  items: OrderItem[];
  payments: Payment[];
}

// ✅ List params — ongeza hii
export interface OrdersListParams {
  store?: string;
  customer?: string;
  status?: OrderStatus;
  limit?: number;
}

// ==================================================================
// API
// ==================================================================
export const ordersApi = {
  // ✅ list ina params
  list: (params?: OrdersListParams) =>
    api.get<Order[]>("/orders/", { params }).then((r) => r.data),

  get: (id: string) =>
    api.get<Order>(`/orders/${id}/`).then((r) => r.data),

  create: (payload: {
    customer_id: string;
    store_id: string;
    items: {
      product_id: string;
      quantity: number;
      unit_price: number;
      unit_cost: number;
    }[];
    discount?: number;
  }) => api.post<Order>("/orders/", payload).then((r) => r.data),

  addPayment: (
    orderId: string,
    payload: {
      method: PaymentMethod;
      amount: number;
      phone?: string;
      reference: string;
    }
  ) =>
    api
      .post<Payment>(`/orders/${orderId}/payments/`, payload)
      .then((r) => r.data),

  confirmPayment: (orderId: string, paymentId: string) =>
    api
      .post<Order>(`/orders/${orderId}/payments/${paymentId}/confirm/`)
      .then((r) => r.data),

  rejectPayment: (orderId: string, paymentId: string) =>
    api
      .post<Payment>(`/orders/${orderId}/payments/${paymentId}/reject/`)
      .then((r) => r.data),
};