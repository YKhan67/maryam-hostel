// src/pages/InvestorPortalPage.js
import React, { useEffect, useState, useContext } from "react";
import api from "../api";
import { AuthContext } from "../AuthContext";

function formatCurrency(v) {
  if (v === null || v === undefined || isNaN(v)) return "Rs 0";
  const num = Number(v);
  return `Rs ${num.toLocaleString("en-PK", { maximumFractionDigits: 0 })}`;
}

export default function InvestorPortalPage() {
  const { user } = useContext(AuthContext);
  const [dashboardData, setDashboardData] = useState(null);
  const [occupancyData, setOccupancyData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInvestorData();
  }, []);

  async function loadInvestorData() {
    setLoading(true);
    try {
      const [pnlRes, kpiRes] = await Promise.all([
        api.get("inventory/branch_pnl/"),
        api.get("management/kpis/")
      ]);
      // The new Unified Engine returns { matrix: [], summary: {} }
      setDashboardData(pnlRes.data);
      setOccupancyData(kpiRes.data.beds);
    } catch (err) {
      console.error("Failed to load investor data", err);
    } finally {
      setLoading(false);
    }
  }

  const handleExport = (format) => {
    const url = `${api.defaults.baseURL}inventory/export_pnl/?format=${format}`;
    window.open(url, "_blank");
  };

  if (loading) return <p>Syncing Financial Records...</p>;

  // Use the pre-calculated summary from the backend (Engine 7.1)
  const summary = dashboardData?.summary || {};
  const matrix = dashboardData?.matrix || [];

  const totalIncome = summary.total_revenue || 0;
  const totalExpenses = (summary.total_logistics || 0) + (summary.total_payroll || 0);
  const totalNet = summary.net_margin || 0;

  return (
    <>
      {/* 1. Global Performance */}
      <div className="cards-row" style={{ marginBottom: '32px' }}>
        <div className="card kpi-card">
          <div className="card-title">Portfolio Revenue</div>
          <div className="card-value" style={{ color: 'var(--success)' }}>{formatCurrency(totalIncome)}</div>
          <div className="card-subtext">Total cash inflow from student fees</div>
        </div>
        <div className="card kpi-card">
          <div className="card-title">Operational Burn</div>
          <div className="card-value" style={{ color: 'var(--danger)' }}>{formatCurrency(totalExpenses)}</div>
          <div className="card-subtext">Groceries + Payroll cost</div>
        </div>
        <div className="card kpi-card">
          <div className="card-title">Net Profitability</div>
          <div className="card-value" style={{ fontWeight: 800 }}>{formatCurrency(totalNet)}</div>
          <div className="card-subtext">Consolidated financial position</div>
        </div>
        {occupancyData && (
          <div className="card kpi-card">
            <div className="card-title">Occupancy Efficiency</div>
            <div className="card-value">{occupancyData.occupancy_rate}%</div>
            <div className="card-subtext">{occupancyData.occupied_beds} of {occupancyData.total_beds} beds filled</div>
          </div>
        )}
      </div>

      {/* 2. Branch Breakdown Matrix */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ margin: 0 }}>Branch Performance Matrix</h2>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => handleExport('pdf')} className="btn btn-primary" style={{ padding: '6px 16px', fontSize: '0.8rem' }}>
              📄 Download PDF
            </button>
            <button onClick={() => handleExport('csv')} className="btn btn-soft" style={{ padding: '6px 16px', fontSize: '0.8rem' }}>
              📊 Export CSV
            </button>
          </div>
        </div>
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Branch Name</th>
                <th>Revenue</th>
                <th>Groceries</th>
                <th>Payroll</th>
                <th>Net Profit</th>
                <th>Margin</th>
              </tr>
            </thead>
            <tbody>
              {matrix.map(branch => (
                <tr key={branch.hostel_id}>
                  <td style={{ fontWeight: 700 }}>{branch.hostel_name}</td>
                  <td style={{ color: 'var(--success)', fontWeight: 600 }}>{formatCurrency(branch.income)}</td>
                  <td>{formatCurrency(branch.groceries)}</td>
                  <td style={{ color: 'var(--brand-gold)' }}>{formatCurrency(branch.payroll_burn)}</td>
                  <td style={{ fontWeight: 800 }}>{formatCurrency(branch.net_profit)}</td>
                  <td style={{ fontWeight: 700 }}>{branch.profit_margin}%</td>
                </tr>
              ))}
              {matrix.length === 0 && (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '40px' }}>No financial data available for this cycle.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Investor Insights */}
      <div className="card" style={{ marginTop: '32px', background: '#f8fafc' }}>
        <h3 style={{ margin: '0 0 12px 0' }}>💡 Strategic Growth Insight</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.6 }}>
          {totalNet > 0
            ? "Your portfolio is maintaining a healthy cash flow. Reinvesting 10% of net profits into facility maintenance is recommended to maintain premium occupancy rates."
            : "Operational costs are currently equal to or higher than revenue. We recommend a review of procurement prices to optimize margins."
          }
        </p>
      </div>

      <div style={{ height: '60px' }}></div>
    </>
  );
}
