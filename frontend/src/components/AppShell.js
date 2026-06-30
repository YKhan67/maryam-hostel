// src/components/AppShell.js
import React, { useContext } from "react";
import logoImg from "../assets/maryam_logo.png";
import { AuthContext } from "../AuthContext";
import { NavLink } from "react-router-dom";

// Modern SVG Icons for a Professional & Friendly look
const Icons = {
  Home: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  Stats: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  Box: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>,
  Users: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  Finance: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>,
  Check: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
};

export default function AppShell({ children, subtitle }) {
  const { user, logout } = useContext(AuthContext);

  const navClass = ({ isActive }) =>
    "sidebar-link" + (isActive ? " sidebar-link-active" : "");

  // Create an avatar background based on username
  const avatarColor = user ? `hsl(${(user.username.length * 40) % 360}, 60%, 45%)` : '#ccc';

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header-left">
          <div className="app-logo">
            <img src={logoImg} alt="Maryam Hostel Logo" />
          </div>
          <div>
            <div className="app-title-main" style={{ color: "var(--secondary)", fontSize: '1.2rem' }}>
              Maryam Hostel
            </div>
            <div className="app-title-sub" style={{ color: "var(--text-muted)", fontWeight: 500 }}>
              {subtitle || "Management Portal"}
            </div>
          </div>
        </div>

        <div className="app-header-right">
          {user && (
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontWeight: 700, fontSize: "0.85rem", color: 'var(--secondary)' }}>
                  {user.first_name || user.username}
                </div>
                <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {user.role.replace('_', ' ')}
                </div>
              </div>
              <div
                style={{
                  width: '36px', height: '36px', borderRadius: '10px',
                  backgroundColor: avatarColor, color: '#fff',
                  display: 'flex', alignItems: 'center', justifyCenter: 'center',
                  fontWeight: 700, fontSize: '0.9rem', display: 'flex', justifyContent: 'center'
                }}
              >
                {user.username.charAt(0).toUpperCase()}
              </div>
              <button
                className="app-header-logout-btn"
                onClick={logout}
                style={{ background: 'var(--primary-light)', color: 'var(--primary-dark)', padding: '6px 14px' }}
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="app-body">
        {user && (
          <aside className="app-sidebar">
            {user.role === "STUDENT" && (
              <>
                <div className="sidebar-section-title">My Space</div>
                <NavLink to="/student" className={navClass}><Icons.Home /> Dashboard</NavLink>
              </>
            )}

            {user.role !== "STUDENT" && (
              <>
                <div className="sidebar-section-title">Overview</div>
                <NavLink to="/management" className={navClass}><Icons.Stats /> Management</NavLink>

                <div className="sidebar-section-title">Logistics</div>
                <NavLink to="/inventory" className={navClass}><Icons.Box /> Inventory</NavLink>
                <NavLink to="/inventory-kpis" className={navClass}><Icons.Stats /> Stock Analysis</NavLink>

                <div className="sidebar-section-title">Finance</div>
                <NavLink to="/fees-management" className={navClass}><Icons.Finance /> Student Dues</NavLink>
                <NavLink to="/fees-dashboard" className={navClass}><Icons.Check /> Collection Logs</NavLink>
                <NavLink to="/fees-kpis" className={navClass}><Icons.Stats /> Financial KPIs</NavLink>

                {user.role === "SUPER_ADMIN" && (
                  <>
                    <div className="sidebar-section-title">Administration</div>
                    <NavLink to="/users" className={navClass}><Icons.Users /> Staff Access</NavLink>
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
