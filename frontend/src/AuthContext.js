// src/AuthContext.js
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import api, { authApi } from "./api";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Clear everything and reset state
  const logout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    setUser(null);
    setError(null);
  };

  // Load current user using /api/me/
  const loadUserFromStorage = async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const res = await api.get("/me/"); // expects user { username, role, ... }
      setUser(res.data);
    } catch (err) {
      console.error("Failed to load current user", err);
      logout();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUserFromStorage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Called from LoginPage
  async function login(username, password) {
    setError(null);

    try {
      // 1) Get JWT tokens
      const tokenRes = await authApi.login(username, password);
      const { access, refresh } = tokenRes.data || {};

      if (!access) {
        console.error("No access token in response:", tokenRes.data);
        setError("Login failed. Please check your credentials.");
        return null;
      }

      // 2) Save tokens
      localStorage.setItem("accessToken", access);
      if (refresh) {
        localStorage.setItem("refreshToken", refresh);
      }

      // 3) Fetch current user from /api/me/
      const meRes = await api.get("/me/");
      setUser(meRes.data);

      // IMPORTANT: return the user object
      return meRes.data;
    } catch (error) {
      console.error("Login failed:", error?.response || error);
      logout();
      setError("Login failed. Please check your username and password.");
      return null;
    }
  }

  const value = {
    user,
    setUser,
    login,
    logout,
    loading,
    error,
  };

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

// Hook used in components that want auth
export function useAuth() {
  return useContext(AuthContext);
}
