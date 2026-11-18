
import axios from "axios";

// 1. Axios instance
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 60000, // Sekunde 60
  headers: {
    "Content-Type": "application/json",
  },
});

// 2. REQUEST INTERCEPTOR
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// 3. RESPONSE INTERCEPTOR
api.interceptors.response.use(
  (response) => response,

  async (error) => {
    const original = error.config;

    if (error.response?.status === 401 && original && !original._retry) {
      original._retry = true;

      const refresh = localStorage.getItem("refresh_token");

      if (!refresh) {
        window.location.href = "/login";
        return Promise.reject(error);
      }

      try {
        // Omba access token mpya
        const { data } = await axios.post(
          `${import.meta.env.VITE_API_URL}/auth/refresh/`,
          { refresh },
          { timeout: 60000 }
        );

        localStorage.setItem("access_token", data.access);

        // Rudia request ya awali
        original.headers.Authorization = `Bearer ${data.access}`;

        return api(original);

      } catch (refreshError) {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");

        window.location.href = "/login";

        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
