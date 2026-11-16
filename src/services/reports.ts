import api from "../lib/axios";

export const reportsApi = {
  list: () => api.get("/reports/").then((r) => r.data),
  create: (payload: any) => api.post("/reports/", payload).then((r) => r.data),
  approve: (id: string) => api.post(`/reports/${id}/approve/`).then((r) => r.data),
};