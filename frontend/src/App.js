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
import ParentPortalPage from "./pages/ParentPortalPage";
import ChangePasswordPage from "./pages/ChangePasswordPage";

import StudentDashboard from "./pages/StudentDashboard";
import ManagementDashboard from "./pages/ManagementDashboard";
import InventoryPage from "./pages/InventoryPage";
import InventoryItemsPage from "./pages/InventoryItemsPage";
import InventoryKpiPage from "./pages/InventoryKpiPage";
import ProcurementPage from "./pages/ProcurementPage";
import PurchaseApprovalPage from "./pages/PurchaseApprovalPage";
import VisualAuditPage from "./pages/VisualAuditPage";
import InvestorPortalPage from "./pages/InvestorPortalPage";
import QuickLogPage from "./pages/QuickLogPage";
import UserManagementPage from "./pages/UserManagementPage";

import FeeDashboardPage from "./pages/FeeDashboardPage";
import FeeKpiPage from "./pages/FeeKpiPage";
import FeeManagementPage from "./pages/FeeManagementPage";
import PaymentVerificationPage from "./pages/PaymentVerificationPage";
import SecurityDepositPage from "./pages/SecurityDepositPage";
import StaffTasksPage from "./pages/StaffTasksPage";

function AppRoutes() {
  return (
    <Routes>
      {/* Public marketing landing page */}
      <Route path="/" element={<LandingPage />} />

      {/* Public login route */}
      <Route path="/login" element={<LoginPage />} />

      {/* Public parent portal route */}
      <Route path="/parent-portal/:token" element={<ParentPortalPage />} />

      {/* Student dashboard */}
      <Route
        path="/student"
        element={
          <ProtectedRoute allowedRoles={["STUDENT"]}>
            <StudentDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/change-password"
        element={
          <ProtectedRoute allowedRoles={["STUDENT", "SUPER_ADMIN", "CITY_MANAGER", "HOSTEL_MANAGER", "STAFF"]}>
            <ChangePasswordPage />
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
        path="/inventory-items"
        element={
          <ProtectedRoute
            allowedRoles={[
              "SUPER_ADMIN",
              "CITY_MANAGER",
              "HOSTEL_MANAGER",
              "STAFF",
            ]}
          >
            <InventoryItemsPage />
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

      <Route
        path="/procurement"
        element={
          <ProtectedRoute
            allowedRoles={[
              "SUPER_ADMIN",
              "CITY_MANAGER",
              "HOSTEL_MANAGER",
              "STAFF",
            ]}
          >
            <ProcurementPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/purchase-approvals"
        element={
          <ProtectedRoute
            allowedRoles={["SUPER_ADMIN", "CITY_MANAGER"]}
          >
            <PurchaseApprovalPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/visual-audit"
        element={
          <ProtectedRoute
            allowedRoles={[
              "SUPER_ADMIN",
              "CITY_MANAGER",
              "HOSTEL_MANAGER",
              "STAFF",
            ]}
          >
            <VisualAuditPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/quick-log/:itemId"
        element={
          <ProtectedRoute
            allowedRoles={[
              "SUPER_ADMIN",
              "CITY_MANAGER",
              "HOSTEL_MANAGER",
              "STAFF",
            ]}
          >
            <QuickLogPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/investor-portal"
        element={
          <ProtectedRoute
            allowedRoles={["SUPER_ADMIN", "PARTNER"]}
          >
            <InvestorPortalPage />
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

      <Route
        path="/payment-verification"
        element={
          <ProtectedRoute
            allowedRoles={[
              "SUPER_ADMIN",
              "CITY_MANAGER",
              "HOSTEL_MANAGER",
              "STAFF",
            ]}
          >
            <PaymentVerificationPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/security-deposits"
        element={
          <ProtectedRoute
            allowedRoles={[
              "SUPER_ADMIN",
              "CITY_MANAGER",
              "HOSTEL_MANAGER",
              "PARTNER",
            ]}
          >
            <SecurityDepositPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/staff-tasks"
        element={
          <ProtectedRoute
            allowedRoles={[
              "SUPER_ADMIN",
              "CITY_MANAGER",
              "HOSTEL_MANAGER",
              "STAFF",
            ]}
          >
            <StaffTasksPage />
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
