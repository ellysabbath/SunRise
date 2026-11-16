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
  created_at: string;
  updated_at?: string;
}

// ==================================================================
// API
// ==================================================================
export const customersApi = {
  list: () =>
    api.get<Customer[]>("/customers/").then((r) => r.data),

  get: (id: string) =>
    api.get<Customer>(`/customers/${id}/`).then((r) => r.data),

  create: (payload: {
    full_name: string;
    phone: string;
    location?: string;
    customer_type?: CustomerType;
    credit_limit?: number;
  }) =>
    api.post<Customer>("/customers/", payload).then((r) => r.data),

  update: (id: string, payload: Partial<Customer>) =>
    api.patch<Customer>(`/customers/${id}/`, payload).then((r) => r.data),

  remove: (id: string) =>
    api.delete(`/customers/${id}/`).then((r) => r.data),
};