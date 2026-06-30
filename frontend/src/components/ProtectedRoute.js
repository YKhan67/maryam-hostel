// src/components/ProtectedRoute.js

import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../AuthContext";

/**
 * Wrap any route:
 * <ProtectedRoute allowedRoles={["SUPER_ADMIN", "CITY_MANAGER"]}>
 *   <UserManagementPage />
 * </ProtectedRoute>
 */
export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="page management-page">
        <div className="card">
          <p>Checking access…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    // Not logged in → send to login, remember where they came from
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Logged in but role not allowed
    return (
      <div className="page management-page">
        <div className="card">
          <h2>Access denied</h2>
          <p style={{ marginTop: 8 }}>
            Your role <strong>{user.role}</strong> does not have access to this
            page.
          </p>
        </div>
      </div>
    );
  }

  return children;
}
