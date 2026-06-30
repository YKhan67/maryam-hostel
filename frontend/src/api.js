// src/api.js
import axios from "axios";

// Use your Django server IP here:
const API_BASE_URL = "https://maryamhostel.com/api";

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
    axios.post("https://maryamhostel.com/api/auth/token/", {
      username,
      password,
    }),
  refresh: (refreshToken) =>
    axios.post("https://maryamhostel.com/api/auth/token/refresh/", {
      refresh: refreshToken,
    }),
};
