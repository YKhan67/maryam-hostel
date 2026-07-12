// src/components/AppShell.js
import React, { useContext } from "react";
import logoImg from "../assets/maryam_logo.png";
import { AuthContext } from "../AuthContext";
import { NavLink } from "react-router-dom";
import { usePermissions } from "../hooks/usePermissions";
import "../styles/admin-menu.css";

export default function AppShell({ children, subtitle }) {
  const { user, logout } = useContext(AuthContext);
  const { check } = usePermissions();

  // A general indicator if the user is restricted in most core modules
  const isReadOnly = user?.role === 'PARTNER' || (!check("INVENTORY", "add") && !check("PAYROLL", "add"));

  const navClass = ({ isActive }) =>
    "sidebar-link" + (isActive ? " sidebar-link-active" : "");

  const handleLinkClick = (e) => {
    // No-op for now, but this component stays mounted so scroll is preserved
  };

  return (
    <div className="app-shell">
      {/* Top header */}
      <header className="app-header">
        <div className="app-header-left">
          <div className="app-logo">
            <img src={logoImg} alt="Maryam Hostel Logo" />
          </div>
          <div>
            <div className="app-title-main">Maryam Hostel</div>
            <div className="app-title-sub">
              {subtitle || "Girls Hostel Management System"}
            </div>
          </div>
        </div>
        <div className="app-header-right">
          {user && (
            <>
              <div>{user.username}</div>
              <div className="app-header-role-pill">{user.role}</div>
              <button className="app-header-logout-btn" onClick={logout}>
                Logout
              </button>
            </>
          )}
        </div>
      </header>

      {/* Body: sidebar + main content */}
      <div className="app-body">
        {user && (
          <aside className="app-sidebar">
            {/* Student menu */}
            {user.role === "STUDENT" && (
              <>
                <div className="sidebar-section-title">Student</div>
                <NavLink to="/student" className={navClass}>
                  🏠 My Dashboard
                </NavLink>
                <NavLink to="/change-password" className={navClass}>
                  🔒 Change Password
                </NavLink>
              </>
            )}

            {/* Management menu */}
            {user.role !== "STUDENT" && (
              <>
                {isReadOnly && (
                   <div style={{ background: '#fef9c3', border: '1px solid #fde047', padding: '10px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.75rem', color: '#854d0e', textAlign: 'center' }}>
                      🛡️ <b>View-Only Mode</b><br/>Read-only Access
                   </div>
                )}

                <div className="sidebar-section-title">Strategic Management</div>
                {check("DASHBOARD") && (
                  <NavLink to="/management" className={navClass}>
                    📊 Management Dashboard
                  </NavLink>
                )}

                {check("BALANCE_SHEET") && (
                  <>
                    <NavLink to="/investor-portal" className={navClass}>
                      📈 Investor Portal
                    </NavLink>
                    <NavLink to="/balance-sheet" className={navClass}>
                      ⚖️ Balance Sheet
                    </NavLink>
                  </>
                )}

                <NavLink to="/change-password" className={navClass}>
                  🔒 Change Password
                </NavLink>

                <div className="sidebar-section-title" style={{ marginTop: 12 }}>
                  Hostel Operations
                </div>
                {check("TASKS") && (
                  <NavLink to="/staff-tasks" className={navClass}>
                    🛠️ Staff Tasks
                  </NavLink>
                )}

                {/* Restricted HR - Exec Only */}
                {(check("PAYROLL") || check("EMPLOYEES")) && (
                  <>
                    <div className="sidebar-section-title" style={{ marginTop: 12 }}>
                      HR & Payroll
                    </div>
                    {check("PAYROLL") && (
                      <NavLink to="/payroll-dashboard" className={navClass}>
                        💸 Payroll Master
                      </NavLink>
                    )}
                    {check("EMPLOYEES") && (
                      <NavLink to="/employee-profiles" className={navClass}>
                        👥 Employee Profiles
                      </NavLink>
                    )}
                    <NavLink to="/advance-ledger" className={navClass}>
                      💰 Salary Advances
                    </NavLink>
                  </>
                )}

                <div className="sidebar-section-title" style={{ marginTop: 12 }}>
                  Logistics & Assets
                </div>
                {check("ASSETS") && (
                  <NavLink to="/asset-inventory" className={navClass}>
                    🚜 Fixed Assets
                  </NavLink>
                )}
                {check("INVENTORY") && (
                  <>
                    <NavLink to="/inventory" className={navClass}>
                      📦 Inventory Logs
                    </NavLink>
                    <NavLink to="/inventory-items" className={navClass}>
                      🏷️ Item Labels
                    </NavLink>
                  </>
                )}
                {check("PROCUREMENT") && (
                  <>
                    <NavLink to="/procurement" className={navClass}>
                      🛒 Smart Re-order
                    </NavLink>
                    <NavLink to="/purchase-approvals" className={navClass}>
                      ⚖️ Purchase Approvals
                    </NavLink>
                  </>
                )}
                {check("VISUAL_AUDIT") && (
                  <NavLink to="/visual-audit" className={navClass}>
                    📷 Visual Audit
                  </NavLink>
                )}
                {check("INVENTORY_KPI") && (
                  <NavLink to="/inventory-kpis" className={navClass}>
                    📈 Inventory KPIs
                  </NavLink>
                )}

                {/* Fees section */}
                {check("FEES") && (
                  <>
                    <div className="sidebar-section-title" style={{ marginTop: 12 }}>
                      Fee Management
                    </div>
                    <NavLink to="/fees-management" className={navClass}>
                      🧾 Fee Controls
                    </NavLink>
                    <NavLink to="/payment-verification" className={navClass}>
                      ✅ Verify Payments
                    </NavLink>
                    <NavLink to="/security-deposits" className={navClass}>
                      🛡️ Security Deposits
                    </NavLink>
                    <NavLink to="/fees-dashboard" className={navClass}>
                      💰 Fee Dashboard
                    </NavLink>
                    <NavLink to="/fees-kpis" className={navClass}>
                      📊 Fee KPIs
                    </NavLink>
                  </>
                )}

                {user.role === "SUPER_ADMIN" && (
                  <>
                    <div className="sidebar-section-title" style={{ marginTop: 12 }}>System</div>
                    <NavLink to="/users" className={navClass}>
                      👤 User Management
                    </NavLink>
                    <NavLink to="/permissions" className={navClass}>
                      🛡️ Access Control
                    </NavLink>
                  </>
                )}
              </>
            )}
          </aside>
        )}

        <main className="app-main">
          <div className="app-main-inner">{children}</div>
        </main>
      </div>
    </div>
  );
}
