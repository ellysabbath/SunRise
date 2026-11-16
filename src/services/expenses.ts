import api from "../lib/axios";

export const expensesApi = {
  requests: () => api.get("/expenses/requests/").then((r) => r.data),
  createRequest: (payload: any) => api.post("/expenses/requests/", payload).then((r) => r.data),
  approve: (id: string, notes?: string) =>
    api.post(`/expenses/requests/${id}/approve/`, { approval_notes: notes }).then((r) => r.data),
  reject: (id: string, notes: string) =>
    api.post(`/expenses/requests/${id}/reject/`, { approval_notes: notes }).then((r) => r.data),
  list: () => api.get("/expenses/").then((r) => r.data),
};