import axios from "axios";

// 1. Unda "instance" ya axios yenye baseURL
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: { "Content-Type": "application/json" },
});

// 2. REQUEST INTERCEPTOR — inaendesha KABLA ya kila request kutoka
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 3. RESPONSE INTERCEPTOR — inaendesha BAADA ya kila response kurudi
api.interceptors.response.use(
  (r) => r,   // 3a. Kama response ni nzuri (2xx), rudisha kama ilivyo

  // 3b. Kama response ni error
  async (error) => {
    const original = error.config;   // request ya awali

    // Kama ni 401 (hauna ruhusa) na haijarudiwa mara ya pili
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;        // weka alama: tusirudie tena

      const refresh = localStorage.getItem("refresh_token");

      // Kama hakuna refresh token — mpeleke login
      if (!refresh) {
        window.location.href = "/login";
        return Promise.reject(error);
      }

      try {
        // Omba access token mpya kwa refresh token
        const { data } = await axios.post(
          `${import.meta.env.VITE_API_URL}/auth/refresh/`,
          { refresh }
        );

        // Hifadhi access mpya
        localStorage.setItem("access_token", data.access);

        // Rudia request ya awali kwa token mpya
        original.headers.Authorization = `Bearer ${data.access}`;
        return api(original);
      } catch {
        // Refresh yenyewe imeshindikana — safisha na mpeleke login
        localStorage.clear();
        window.location.href = "/login";
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

export default api;