// src/App.js
import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import { AuthProvider } from "./AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

import LoginPage from "./pages/LoginPage";
import LandingPage from "./pages/LandingPage";

import StudentDashboard from "./pages/StudentDashboard";
import ManagementDashboard from "./pages/ManagementDashboard";
import InventoryPage from "./pages/InventoryPage";
import InventoryKpiPage from "./pages/InventoryKpiPage";
import UserManagementPage from "./pages/UserManagementPage";

import FeeDashboardPage from "./pages/FeeDashboardPage";
import FeeKpiPage from "./pages/FeeKpiPage";
import FeeManagementPage from "./pages/FeeManagementPage";

function AppRoutes() {
  return (
    <Routes>
      {/* Public marketing landing page */}
      <Route path="/" element={<LandingPage />} />

      {/* Public login route */}
      <Route path="/login" element={<LoginPage />} />

      {/* Student dashboard */}
      <Route
        path="/student"
        element={
          <ProtectedRoute allowedRoles={["STUDENT"]}>
            <StudentDashboard />
          </ProtectedRoute>
        }
      />

      {/* Management dashboard */}
      <Route
        path="/management"
        element={
          <ProtectedRoute
            allowedRoles={[
              "SUPER_ADMIN",
              "CITY_MANAGER",
              "HOSTEL_MANAGER",
              "STAFF",
            ]}
          >
            <ManagementDashboard />
          </ProtectedRoute>
        }
      />

      {/* Inventory */}
      <Route
        path="/inventory"
        element={
          <ProtectedRoute
            allowedRoles={[
              "SUPER_ADMIN",
              "CITY_MANAGER",
              "HOSTEL_MANAGER",
              "STAFF",
            ]}
          >
            <InventoryPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/inventory-kpis"
        element={
          <ProtectedRoute
            allowedRoles={[
              "SUPER_ADMIN",
              "CITY_MANAGER",
              "HOSTEL_MANAGER",
              "STAFF",
            ]}
          >
            <InventoryKpiPage />
          </ProtectedRoute>
        }
      />

      {/* Fees */}
      <Route
        path="/fees-dashboard"
        element={
          <ProtectedRoute
            allowedRoles={[
              "SUPER_ADMIN",
              "CITY_MANAGER",
              "HOSTEL_MANAGER",
              "STAFF",
            ]}
          >
            <FeeDashboardPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/fees-kpis"
        element={
          <ProtectedRoute
            allowedRoles={[
              "SUPER_ADMIN",
              "CITY_MANAGER",
              "HOSTEL_MANAGER",
              "STAFF",
            ]}
          >
            <FeeKpiPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/fees-management"
        element={
          <ProtectedRoute
            allowedRoles={[
              "SUPER_ADMIN",
              "CITY_MANAGER",
              "HOSTEL_MANAGER",
              "STAFF",
            ]}
          >
            <FeeManagementPage />
          </ProtectedRoute>
        }
      />

      {/* User management */}
      <Route
        path="/users"
        element={
          <ProtectedRoute allowedRoles={["SUPER_ADMIN", "CITY_MANAGER"]}>
            <UserManagementPage />
          </ProtectedRoute>
        }
      />

      {/* Fallback: unknown routes → landing page */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}
