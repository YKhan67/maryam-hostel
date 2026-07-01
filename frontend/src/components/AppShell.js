// src/components/AppShell.js
import React, { useContext } from "react";
import logoImg from "../assets/maryam_logo.png";
import { AuthContext } from "../AuthContext";
import { NavLink } from "react-router-dom";
import "../styles/admin-menu.css";

export default function AppShell({ children, subtitle }) {
  const { user, logout } = useContext(AuthContext);

  const navClass = ({ isActive }) =>
    "sidebar-link" + (isActive ? " sidebar-link-active" : "");

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
              </>
            )}

            {/* Management menu */}
            {user.role !== "STUDENT" && (
              <>
                <div className="sidebar-section-title">Management</div>

                <NavLink to="/management" className={navClass}>
                  📊 Management Dashboard
                </NavLink>

                <NavLink to="/inventory" className={navClass}>
                  📦 Inventory
                </NavLink>

                <NavLink to="/inventory-kpis" className={navClass}>
                  📈 Inventory KPIs
                </NavLink>

                {/* Fees section */}
                <div className="sidebar-section-title" style={{ marginTop: 12 }}>
                  Fees
                </div>

                <NavLink to="/fees-management" className={navClass}>
                  🧾 Fee Management
                </NavLink>

                <NavLink to="/fees-dashboard" className={navClass}>
                  💰 Fee Dashboard
                </NavLink>

                <NavLink to="/fees-kpis" className={navClass}>
                  📊 Fee KPIs
                </NavLink>

                {user.role === "SUPER_ADMIN" && (
                  <NavLink to="/users" className={navClass}>
                    👤 User Management
                  </NavLink>
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
