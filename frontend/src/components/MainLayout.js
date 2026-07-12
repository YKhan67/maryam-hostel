// src/components/MainLayout.js
import React from "react";
import AppShell from "./AppShell";
import { Outlet, useLocation } from "react-router-dom";

/**
 * This layout component wraps the protected routes with AppShell.
 * Because it stays mounted during navigation between sub-routes,
 * the sidebar scroll position and state are preserved.
 */
export default function MainLayout() {
  const location = useLocation();

  // Determine a subtitle based on the path if desired
  let subtitle = "Girls Hostel Management System";
  if (location.pathname.includes("student")) subtitle = "Student Portal";
  if (location.pathname.includes("management")) subtitle = "Management Dashboard";
  if (location.pathname.includes("inventory")) subtitle = "Inventory Control";
  if (location.pathname.includes("fees")) subtitle = "Fee Management";
  if (location.pathname.includes("payroll")) subtitle = "Payroll Master";
  if (location.pathname.includes("asset")) subtitle = "Asset Registry";

  return (
    <AppShell subtitle={subtitle}>
      <Outlet />
    </AppShell>
  );
}
