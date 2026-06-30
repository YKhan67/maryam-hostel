// src/pages/ManagementDashboard.js

import React, { useEffect, useMemo, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../components/AppShell";
import api from "../api";
import { AuthContext } from "../AuthContext";

function formatCurrency(v) {
  if (v === null || v === undefined || isNaN(v)) return "Rs 0";
  const num = Number(v);
  return `Rs ${num.toLocaleString("en-PK", {
    maximumFractionDigits: 0,
  })}`;
}

const WelcomeGraphic = () => (
  <div style={{ position: 'absolute', right: '32px', bottom: '0', opacity: 0.1, pointerEvents: 'none' }}>
    <svg width="180" height="120" viewBox="0 0 180 120" fill="none">
       <path d="M10 110C30 90 60 90 80 110" stroke="var(--primary)" strokeWidth="8" strokeLinecap="round"/>
       <circle cx="140" cy="40" r="25" fill="var(--primary)" fillOpacity="0.2"/>
       <rect x="110" y="70" width="60" height="40" rx="10" fill="var(--secondary)" fillOpacity="0.05"/>
    </svg>
  </div>
);

export default function ManagementDashboard() {
  const { user } = useContext(AuthContext);
  const [rows, setRows] = useState([]);
  const [hostels, setHostels] = useState([]);
  const [incomeByHostel, setIncomeByHostel] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setLoading(true);
      try {
        const [invResp, hostelsResp, incomeResp] = await Promise.all([
          api.get("/inventory/list/").catch(() => ({ data: [] })),
          api.get("/hostels/").catch(() => ({ data: [] })),
          api.get("/fees/dashboard/hostel-income/").catch(() => ({ data: [] }))
        ]);

        if (isMounted) {
          setRows(Array.isArray(invResp.data) ? invResp.data : invResp.data?.results || []);
          setHostels(Array.isArray(hostelsResp.data) ? hostelsResp.data : hostelsResp.data?.results || []);
          setIncomeByHostel(Array.isArray(incomeResp.data) ? incomeResp.data : []);
        }
      } catch (err) {
        if (isMounted) setError("Connection lost. Please refresh.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadData();
    return () => { isMounted = false; };
  }, []);

  const metrics = useMemo(() => {
    const today = new Date();
    let currentMonthSpend = 0;
    const spendPerHostel = new Map();
    const vendorSpend = new Map();

    rows.forEach(r => {
      const spend = Number(r.total_cost || 0);
      const hostel = r.hostel || "Unassigned";
      spendPerHostel.set(hostel, (spendPerHostel.get(hostel) || 0) + spend);

      if (r.date) {
        const d = new Date(r.date);
        if (d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth()) {
          currentMonthSpend += spend;
        }
        vendorSpend.set(r.vendor || "Unknown", (vendorSpend.get(r.vendor || "Unknown") || 0) + spend);
      }
    });

    const topVendors = Array.from(vendorSpend.entries())
      .map(([vendor, amount]) => ({ vendor, amount }))
      .sort((a, b) => b.amount - a.amount).slice(0, 5);

    let totalIncomeCurrentMonth = 0;
    incomeByHostel.forEach(item => {
      totalIncomeCurrentMonth += Number(item.current_month_income || 0);
    });

    return { currentMonthSpend, totalIncomeCurrentMonth, spendPerHostel, topVendors };
  }, [rows, incomeByHostel]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  if (loading) return <AppShell subtitle="Loading System..."><div className="card">Refreshing metrics...</div></AppShell>;

  return (
    <AppShell subtitle="Executive Dashboard">
      {/* Friendly Welcome Header */}
      <div className="card" style={{ position: 'relative', overflow: 'hidden', padding: '32px', marginBottom: '32px', border: 'none', background: 'linear-gradient(135deg, #fff 0%, #fdf7ec 100%)', boxShadow: 'var(--shadow-lg)' }}>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h1 style={{ margin: '0 0 8px 0', fontSize: '1.75rem', fontWeight: 800, color: 'var(--secondary)' }}>
            {getGreeting()}, {user?.first_name || user?.username}! 👋
          </h1>
          <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-muted)', fontWeight: 500, maxWidth: '500px' }}>
            Everything looks good today. You have {hostels.length} active hostels under your management.
            Here's the financial snapshot for {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}.
          </p>
          <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
             <button onClick={() => navigate('/fees-management')} className="btn btn-primary" style={{ padding: '8px 20px' }}>Review Student Dues</button>
             <button onClick={() => navigate('/inventory')} className="btn" style={{ padding: '8px 20px', background: '#fff', border: '1px solid var(--border)' }}>Check Stock</button>
          </div>
        </div>
        <WelcomeGraphic />
      </div>

      <div className="kpi-grid">
        <div className="card kpi-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="kpi-label">TOTAL DISBURSEMENTS</span>
            <div style={{ padding: '4px', background: '#fee2e2', borderRadius: '8px', color: '#ef4444' }}>
               <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M7 17l9.2-9.2M17 17V7H7"/></svg>
            </div>
          </div>
          <div className="kpi-value" style={{ color: "var(--danger)", margin: '12px 0' }}>
            {formatCurrency(metrics.currentMonthSpend)}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
             Expenses this month
          </div>
        </div>

        <div className="card kpi-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="kpi-label">TOTAL COLLECTION</span>
            <div style={{ padding: '4px', background: '#dcfce7', borderRadius: '8px', color: '#10b981' }}>
               <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M7 7l9.2 9.2M7 17h10V7"/></svg>
            </div>
          </div>
          <div className="kpi-value" style={{ color: "var(--success)", margin: '12px 0' }}>
            {formatCurrency(metrics.totalIncomeCurrentMonth)}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            Revenue this month
          </div>
        </div>

        <div className="card kpi-card">
          <span className="kpi-label">NET PERFORMANCE</span>
          <div className="kpi-value" style={{ margin: '12px 0' }}>
            {formatCurrency(metrics.totalIncomeCurrentMonth - metrics.currentMonthSpend)}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            Profitability across branches
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '32px' }}>
        <div className="card">
          <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontWeight: 700 }}>Branch Performance</h3>
            <div style={{ fontSize: '0.75rem', padding: '4px 12px', background: 'var(--background)', borderRadius: '999px', fontWeight: 600 }}>REAL-TIME</div>
          </div>
          <div className="table-container">
            <table className="modern-table">
              <thead>
                <tr>
                  <th>Hostel Name</th>
                  <th>Revenue</th>
                  <th>Expenses</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {hostels.map(h => {
                  const income = incomeByHostel.find(i => i.hostel === h.name)?.current_month_income || 0;
                  const expense = metrics.spendPerHostel.get(h.name) || 0;
                  const net = income - expense;
                  return (
                    <tr key={h.id}>
                      <td style={{ fontWeight: 600 }}>{h.name}</td>
                      <td style={{ color: 'var(--success)', fontWeight: 600 }}>{formatCurrency(income)}</td>
                      <td style={{ color: 'var(--danger)' }}>{formatCurrency(expense)}</td>
                      <td>
                        <span style={{
                          padding: '4px 8px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700,
                          background: net >= 0 ? '#dcfce7' : '#fee2e2',
                          color: net >= 0 ? '#166534' : '#991b1b'
                        }}>
                          {net >= 0 ? 'PROFIT' : 'LOSS'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <h3 style={{ margin: '0 0 24px 0', fontWeight: 700 }}>Supply Chain Insight</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {metrics.topVendors.map((v, i) => (
              <div key={v.vendor} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '40px', height: '40px', background: 'var(--primary-light)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-dark)', fontWeight: 700 }}>
                    {v.vendor.charAt(0)}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>{v.vendor}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Supply Tier {i+1}</div>
                  </div>
                </div>
                <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>{formatCurrency(v.amount)}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: '32px', padding: '16px', background: 'var(--background)', borderRadius: '16px' }}>
             <div style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: '4px' }}>Pro Tip 💡</div>
             <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                You can save up to 12% by centralizing purchases from your top 3 vendors across all hostels.
             </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
