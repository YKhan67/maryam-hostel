// frontend/src/context/AuthContext.js
import React, { createContext, useState, useEffect, useContext } from "react";
import { getToken, getUser, setToken, setUser, clearToken, clearUser } from "../services/auth";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setAuthUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load stored session
  useEffect(() => {
    const token = getToken();
    const u = getUser();
    if (token && u) setAuthUser(u);
    setLoading(false);
  }, []);

  function login(userData, token) {
    setUser(userData);
    setToken(token);
    setAuthUser(userData);
  }

  function logout() {
    clearToken();
    clearUser();
    setAuthUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
