import api from "../lib/axios";

export const suppliersApi = {
  list: () => api.get("/suppliers/").then((r) => r.data),
  create: (payload: any) => api.post("/suppliers/", payload).then((r) => r.data),
};