import api from "../lib/axios";

// ==================================================================
// Types
// ==================================================================
export type CustomerType = "rejareja" | "jumla" | "mkandarasi";

export interface Customer {
  id: string;
  full_name: string;
  phone: string;
  location: string;
  customer_type: CustomerType;
  credit_limit: string;
  store?: string | null;        // ✅ ongeza
  store_id?: string | null;     // ✅ ongeza
  store_name?: string | null;   // ✅ ongeza
  created_at: string;
  updated_at?: string;
}

// ✅ List params
export interface CustomersListParams {
  store?: string;
}

// ==================================================================
// API
// ==================================================================
export const customersApi = {
  // ✅ list ina params
  list: (params?: CustomersListParams) =>
    api.get<Customer[]>("/customers/", { params }).then((r) => r.data),

  get: (id: string) =>
    api.get<Customer>(`/customers/${id}/`).then((r) => r.data),

  create: (payload: {
    full_name: string;
    phone: string;
    location?: string;
    customer_type?: CustomerType;
    credit_limit?: number;
    store?: string;             // ✅ ongeza
  }) =>
    api.post<Customer>("/customers/", payload).then((r) => r.data),

  update: (id: string, payload: Partial<Customer>) =>
    api.patch<Customer>(`/customers/${id}/`, payload).then((r) => r.data),

  remove: (id: string) =>
    api.delete(`/customers/${id}/`).then((r) => r.data),
};