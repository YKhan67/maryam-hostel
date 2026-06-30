// src/api.js
import axios from "axios";

// Use a dynamic base URL that works for both local development and production
const API_BASE_URL =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1" ||
  window.location.hostname.startsWith("192.168.")
    ? `http://${window.location.hostname}:8000/api/v1`
    : "/api/v1";

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Attach JWT token from localStorage
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;

// Separate auth API for JWT token calls
export const authApi = {
  login: (username, password) =>
    axios.post(`${API_BASE_URL}/auth/token/`, {
      username,
      password,
    }),
  refresh: (refreshToken) =>
    axios.post(`${API_BASE_URL}/auth/token/refresh/`, {
      refresh: refreshToken,
    }),
};
