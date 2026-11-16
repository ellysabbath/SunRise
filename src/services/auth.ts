import api from "../lib/axios";

export const authApi = {
  login: (phone: string, password: string) =>
    api.post("/auth/login/", { phone, password }).then((r) => r.data),

  register: (payload: { phone: string; full_name: string; password: string; role?: string }) =>
    api.post("/auth/register/", payload).then((r) => r.data),

  me: () => api.get("/auth/me/").then((r) => r.data),

  requestOtp: (phone: string, purpose = "reset", channel = "sms", email?: string) =>
    api.post("/auth/request-otp/", { phone, purpose, channel, email }).then((r) => r.data),

  verifyOtp: (phone: string, code: string) =>
    api.post("/auth/verify-otp/", { phone, code }).then((r) => r.data),
};