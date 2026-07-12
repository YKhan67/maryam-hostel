// src/pages/ManagementDashboard.js

import React, { useEffect, useState, useContext } from "react";
import api from "../api";
import { AuthContext } from "../AuthContext";
import { usePermissions } from "../hooks/usePermissions";
import "../styles/admin-menu.css";

function formatCurrency(v) {
  if (v === null || v === undefined || isNaN(v)) return "Rs 0";
  const num = Number(v);
  return `Rs ${num.toLocaleString("en-PK", { maximumFractionDigits: 0 })}`;
}

export default function ManagementDashboard() {
  const { user } = useContext(AuthContext);
  const { check } = usePermissions();

  const [period, setPeriod] = useState("CURRENT_MONTH");
  const [specificMonth, setSpecificMonth] = useState(new Date().getMonth() + 1);
  const [specificYear, setSpecificYear] = useState(new Date().getFullYear());

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true); setError(null);
      try {
        const params = { period, year: specificYear, month: specificMonth };
        const res = await api.get("inventory/branch_pnl/", { params });

        // CHECK: If summary exists, it's the NEW engine. If not, it's the OLD engine.
        if (res.data && res.data.summary) {
           setData(res.data);
        } else {
           console.warn("OLD ENGINE DETECTED. NO SUMMARY OBJECT.");
           setData({ matrix: Array.isArray(res.data) ? res.data : [], summary: {}, version: "FALLBACK" });
        }
      } catch (err) {
        console.error(err);
        setError("Sync error. Please upload backend/inventory/views.py and RESTART.");
      } finally { setLoading(false); }
    }
    loadDashboard();
  }, [period, specificMonth, specificYear]);

  return (
    <div className="page management-page">
      <div className="card" style={{ marginBottom: '24px', borderLeft: '5px solid var(--brand-gold)' }}>
         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
            <div>
              <h2 style={{ margin: 0 }}>Management Control <small style={{ fontSize: '0.65rem', color: 'var(--brand-gold)' }}>[Engine {data?.version || 'Syncing'}] {data?.server_heartbeat ? `Live: ${data.server_heartbeat}` : ''}</small></h2>
              <p className="card-subtext">Extraction Logic: <b>Integer Lock 7.0</b></p>
            </div>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
               <select className="filter-select" value={period} onChange={e => setPeriod(e.target.value)}>
                  <option value="CURRENT_MONTH">Current Month</option>
                  <option value="YTD">Year To Date (YTD)</option>
                  <option value="SPECIFIC">Historical Month</option>
               </select>
               {period === 'SPECIFIC' && (
                 <div style={{ display: 'flex', gap: '8px' }}>
                    <select className="filter-select" style={{ width: '80px' }} value={specificMonth} onChange={e => setSpecificMonth(parseInt(e.target.value))}>
                      {["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].map((m,i) => <option key={i} value={i+1}>{m}</option>)}
                    </select>
                    <input type="number" className="filter-input" style={{ width: '85px' }} value={specificYear} onChange={e => setSpecificYear(parseInt(e.target.value))} />
                 </div>
               )}
            </div>
         </div>
      </div>

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px' }}><p>Synchronizing global matrix...</p></div>
      ) : error ? (
        <div className="card" style={{ textAlign: 'center', color: 'var(--danger)', padding: '40px' }}><p>⚠️ {error}</p></div>
      ) : (
        <>
          <div className="cards-row">
            <div className="card kpi-card" style={{ background: '#f0f9ff', border: '1px solid #bae6fd' }}>
              <div className="card-title" style={{ color: '#0369a1' }}>Profitability Per Student</div>
              <div className="card-value" style={{ color: '#0c4a6e' }}>{formatCurrency(data?.summary?.net_margin || 0)}</div>
              <div className="card-subtext">{formatCurrency(data?.summary?.avg_revenue || 0)} (Rev) - {formatCurrency(data?.summary?.avg_cost || 0)} (Exp)</div>
            </div>

            {check("PAYROLL") && (
              <div className="card kpi-card">
                <div className="card-title">Payroll Burn</div>
                <div className="card-value" style={{ color: 'var(--brand-gold)' }}>{formatCurrency(data?.summary?.total_payroll || 0)}</div>
                <div className="card-subtext">Cash disbursed in window</div>
              </div>
            )}

            <div className="card kpi-card">
              <div className="card-title">Logistics Spend</div>
              <div className="card-value">{formatCurrency(data?.summary?.total_logistics || 0)}</div>
              <div className="card-subtext">Purchases paid</div>
            </div>

            <div className="card kpi-card" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
              <div className="card-title" style={{ color: '#166534' }}>Total Gross Revenue</div>
              <div className="card-value" style={{ color: '#15803d' }}>{formatCurrency(data?.summary?.total_revenue || 0)}</div>
              <div className="card-subtext">Verified Receipts</div>
            </div>
          </div>

          <div className="card table-card">
            <div className="card-title">Branch Performance Matrix</div>
            <div className="table-wrapper">
              <table className="inventory-table">
                <thead>
                  <tr>
                    <th>Hostel Branch</th>
                    <th>Revenue</th>
                    <th>Groceries</th>
                    <th>Payroll</th>
                    <th>Net Profit</th>
                    <th>Margin %</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.matrix?.map(row => (
                    <tr key={row.hostel_id}>
                      <td><b>{row.hostel_name}</b></td>
                      <td style={{ color: '#10b981', fontWeight: 600 }}>{formatCurrency(row.income)}</td>
                      <td>{formatCurrency(row.groceries)}</td>
                      <td style={{ color: 'var(--brand-gold)' }}>{formatCurrency(row.payroll_burn)}</td>
                      <td style={{ fontWeight: 800 }}>{formatCurrency(row.net_profit)}</td>
                      <td style={{ fontWeight: 700 }}>
                        <span className={`badge ${row.profit_margin > 0 ? 'badge-success' : 'badge-danger'}`}>
                           {row.profit_margin}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
