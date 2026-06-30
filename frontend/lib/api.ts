// lib/api.ts
// ─────────────────────────────────────────────────────────────
//  Axios instance with JWT interceptor.
//  Reads token from localStorage and attaches to every request.
// ─────────────────────────────────────────────────────────────
import axios from "axios";

const api = axios.create({
  baseURL: "/api", // proxied to http://localhost:3001/api via next.config
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

// ── Request Interceptor — attach JWT ─────────────────────────
api.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("freight_token");
      if (token) {
        config.headers["Authorization"] = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response Interceptor — handle 401 ───────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const url = error.config?.url || "";
      const isAuthRequest = 
        url.includes("/auth/login") || 
        url.includes("/auth/register") || 
        url.includes("/auth/verify-password");

      if (!isAuthRequest) {
        // Token expired or invalid — clear and redirect to login
        if (typeof window !== "undefined") {
          localStorage.removeItem("freight_token");
          localStorage.removeItem("freight_user");
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
