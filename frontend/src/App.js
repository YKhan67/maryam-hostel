// src/App.js
import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

import { AuthProvider } from "./AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import MainLayout from "./components/MainLayout";

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
import ScanReceiptPage from "./pages/ScanReceiptPage";
import VisualAuditPage from "./pages/VisualAuditPage";
import InvestorPortalPage from "./pages/InvestorPortalPage";
import EmployeeProfilePage from "./pages/EmployeeProfilePage";
import AdvanceLedgerPage from "./pages/AdvanceLedgerPage";
import PayrollDashboardPage from "./pages/PayrollDashboardPage";
import PayrollSlipsPage from "./pages/PayrollSlipsPage";
import AssetInventoryPage from "./pages/AssetInventoryPage";
import BalanceSheetPage from "./pages/BalanceSheetPage";
import UserManagementPage from "./pages/UserManagementPage";
import PermissionsManagementPage from "./pages/PermissionsManagementPage";

// Meal Menu Pages
import MealMenuPage from "./pages/MealMenuPage";
import MealManagementPage from "./pages/MealManagementPage";
import MealFeedbackPage from "./pages/MealFeedbackPage";
import GroceryManagementPage from "./pages/GroceryManagementPage";
import RecipeManagementPage from "./pages/RecipeManagementPage";

import FeeDashboardPage from "./pages/FeeDashboardPage";
import FeeKpiPage from "./pages/FeeKpiPage";
import FeeManagementPage from "./pages/FeeManagementPage";
import PaymentVerificationPage from "./pages/PaymentVerificationPage";
import SecurityDepositPage from "./pages/SecurityDepositPage";
import StaffTasksPage from "./pages/StaffTasksPage";

import BIPage from "./pages/BIPage";
import CustomReportBuilderPage from "./pages/CustomReportBuilderPage";
import PropertyManagementPage from "./pages/PropertyManagementPage";
import PropertyFinancePage from "./pages/PropertyFinancePage";

function AppRoutes() {
  // Access Tiers
  const EXEC_LEVEL = ["SUPER_ADMIN", "CITY_MANAGER", "PARTNER"]; // For Financials/HR
  const BRANCH_MGMT = ["SUPER_ADMIN", "CITY_MANAGER", "HOSTEL_MANAGER", "PARTNER"]; // For Assets/Procurement
  const STAFF_LEVEL = ["SUPER_ADMIN", "CITY_MANAGER", "HOSTEL_MANAGER", "STAFF", "PARTNER"]; // For Day-to-Day Ops
  const ALL_USERS = ["STUDENT", "STAFF", "HOSTEL_MANAGER", "CITY_MANAGER", "SUPER_ADMIN", "PARTNER"];

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/parent-portal/:token" element={<ParentPortalPage />} />

      <Route element={<MainLayout />}>
        {/* Basic Access */}
        <Route path="/student" element={<ProtectedRoute allowedRoles={["STUDENT"]}><StudentDashboard /></ProtectedRoute>} />
        <Route path="/change-password" element={<ProtectedRoute allowedRoles={ALL_USERS}><ChangePasswordPage /></ProtectedRoute>} />
        <Route path="/management" element={<ProtectedRoute allowedRoles={BRANCH_MGMT}><ManagementDashboard /></ProtectedRoute>} />
        <Route path="/property-operations" element={<ProtectedRoute allowedRoles={BRANCH_MGMT}><PropertyManagementPage /></ProtectedRoute>} />
        <Route path="/property-finance" element={<ProtectedRoute allowedRoles={["SUPER_ADMIN", "CITY_MANAGER"]}><PropertyFinancePage /></ProtectedRoute>} />
        <Route path="/staff-tasks" element={<ProtectedRoute allowedRoles={STAFF_LEVEL}><StaffTasksPage /></ProtectedRoute>} />

        {/* Meal Menu Routes */}
        <Route path="/meal-menu" element={
          <ProtectedRoute allowedRoles={ALL_USERS}>
            <MealMenuPage />
          </ProtectedRoute>
        } />
        <Route path="/meal-management" element={
          <ProtectedRoute allowedRoles={["HOSTEL_MANAGER", "CITY_MANAGER", "SUPER_ADMIN"]}>
            <MealManagementPage />
          </ProtectedRoute>
        } />
        <Route path="/meal-feedback" element={
          <ProtectedRoute allowedRoles={["HOSTEL_MANAGER", "CITY_MANAGER", "SUPER_ADMIN"]}>
            <MealFeedbackPage />
          </ProtectedRoute>
        } />
        <Route path="/grocery-management" element={
          <ProtectedRoute allowedRoles={["HOSTEL_MANAGER", "CITY_MANAGER", "SUPER_ADMIN"]}>
            <GroceryManagementPage />
          </ProtectedRoute>
        } />
        <Route path="/recipe-management" element={
          <ProtectedRoute allowedRoles={["HOSTEL_MANAGER", "CITY_MANAGER", "SUPER_ADMIN"]}>
            <RecipeManagementPage />
          </ProtectedRoute>
        } />

        {/* Logistics & Assets (Branch Mgmt + Partner View) */}
        <Route path="/inventory" element={<ProtectedRoute allowedRoles={STAFF_LEVEL}><InventoryPage /></ProtectedRoute>} />
        <Route path="/inventory-items" element={<ProtectedRoute allowedRoles={STAFF_LEVEL}><InventoryItemsPage /></ProtectedRoute>} />
        <Route path="/inventory-kpis" element={<ProtectedRoute allowedRoles={BRANCH_MGMT}><InventoryKpiPage /></ProtectedRoute>} />
        <Route path="/procurement" element={<ProtectedRoute allowedRoles={BRANCH_MGMT}><ProcurementPage /></ProtectedRoute>} />
        <Route path="/visual-audit" element={<ProtectedRoute allowedRoles={BRANCH_MGMT}><VisualAuditPage /></ProtectedRoute>} />
        <Route path="/asset-inventory" element={<ProtectedRoute allowedRoles={BRANCH_MGMT}><AssetInventoryPage /></ProtectedRoute>} />
        <Route path="/purchase-approvals" element={<ProtectedRoute allowedRoles={BRANCH_MGMT}><PurchaseApprovalPage /></ProtectedRoute>} />
        <Route path="/inventory/scan-receipt" element={<ScanReceiptPage />} />

        {/* HR & Payroll (Executive Only + Partner View) */}
        <Route path="/payroll-dashboard" element={<ProtectedRoute allowedRoles={EXEC_LEVEL}><PayrollDashboardPage /></ProtectedRoute>} />
        <Route path="/payroll-slips/:recordId" element={<ProtectedRoute allowedRoles={EXEC_LEVEL}><PayrollSlipsPage /></ProtectedRoute>} />
        <Route path="/employee-profiles" element={<ProtectedRoute allowedRoles={EXEC_LEVEL}><EmployeeProfilePage /></ProtectedRoute>} />
        <Route path="/advance-ledger" element={<ProtectedRoute allowedRoles={BRANCH_MGMT}><AdvanceLedgerPage /></ProtectedRoute>} />

        {/* Fees & Strategic Finance (Executive Only + Partner View) */}
        <Route path="/fees-dashboard" element={<ProtectedRoute allowedRoles={BRANCH_MGMT}><FeeDashboardPage /></ProtectedRoute>} />
        <Route path="/fees-kpis" element={<ProtectedRoute allowedRoles={BRANCH_MGMT}><FeeKpiPage /></ProtectedRoute>} />
        <Route path="/fees-management" element={<ProtectedRoute allowedRoles={BRANCH_MGMT}><FeeManagementPage /></ProtectedRoute>} />
        <Route path="/payment-verification" element={<ProtectedRoute allowedRoles={STAFF_LEVEL}><PaymentVerificationPage /></ProtectedRoute>} />
        <Route path="/security-deposits" element={<ProtectedRoute allowedRoles={BRANCH_MGMT}><SecurityDepositPage /></ProtectedRoute>} />
        <Route path="/investor-portal" element={<ProtectedRoute allowedRoles={["SUPER_ADMIN", "PARTNER"]}><InvestorPortalPage /></ProtectedRoute>} />
        <Route path="/balance-sheet" element={<ProtectedRoute allowedRoles={["SUPER_ADMIN", "PARTNER"]}><BalanceSheetPage /></ProtectedRoute>} />

        {/* System Administration (Absolute Restricted) */}
        <Route path="/users" element={<ProtectedRoute allowedRoles={["SUPER_ADMIN", "CITY_MANAGER"]}><UserManagementPage /></ProtectedRoute>} />
        <Route path="/permissions" element={<ProtectedRoute allowedRoles={["SUPER_ADMIN"]}><PermissionsManagementPage /></ProtectedRoute>} />

        <Route 
          path="/bi" 
          element={
            <ProtectedRoute allowedRoles={["SUPER_ADMIN", "CITY_MANAGER", "PARTNER", "HOSTEL_MANAGER", "STAFF"]}>
            <BIPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/custom-reports" 
          element={
            <ProtectedRoute allowedRoles={["SUPER_ADMIN", "CITY_MANAGER", "HOSTEL_MANAGER"]}>
            <CustomReportBuilderPage />
            </ProtectedRoute>
          } 
        />
      </Route>

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