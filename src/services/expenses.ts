import api from "../lib/axios";

// ==================================================================
// Types
// ==================================================================
export interface Expense {
  id: string
  store: string
  store_name?: string
  category: string
  description: string
  amount: string          // backend inarudisha string (Decimal)
  date: string
  status?: string
  created_by?: string
  created_at?: string
  updated_at?: string
}

export interface ExpenseRequest {
  id: string
  store: string
  store_name?: string
  category: string
  description: string
  amount: string
  date?: string
  status: 'pending' | 'approved' | 'rejected'
  approval_notes?: string
  requested_by?: string
  requested_by_name?: string
  created_at?: string
  updated_at?: string
}

// ==================================================================
// API
// ==================================================================
export const expensesApi = {
  requests: () => api.get("/expenses/requests/").then((r) => r.data),
  createRequest: (payload: any) =>
    api.post("/expenses/requests/", payload).then((r) => r.data),
  approve: (id: string, notes?: string) =>
    api
      .post(`/expenses/requests/${id}/approve/`, { approval_notes: notes })
      .then((r) => r.data),
  reject: (id: string, notes: string) =>
    api
      .post(`/expenses/requests/${id}/reject/`, { approval_notes: notes })
      .then((r) => r.data),
  list: () => api.get("/expenses/").then((r) => r.data),
};