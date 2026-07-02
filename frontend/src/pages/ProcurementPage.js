// src/pages/ProcurementPage.js
import React, { useEffect, useState } from "react";
import AppShell from "../components/AppShell";
import api from "../api";

function formatCurrency(v) {
  if (v === null || v === undefined || isNaN(v)) return "Rs 0";
  const num = Number(v);
  return `Rs ${num.toLocaleString("en-PK", { maximumFractionDigits: 0 })}`;
}

export default function ProcurementPage() {
  const [reorderItems, setReorderItems] = useState([]);
  const [abnormalConsumption, setAbnormalConsumption] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("");

  useEffect(() => {
    loadProcurementData();
  }, []);

  async function loadProcurementData() {
    setLoading(true);
    try {
      const [reorderRes, analyticsRes] = await Promise.all([
        api.get("inventory/reorder_sheet/"),
        api.get("inventory/consumption_analytics/")
      ]);
      setReorderItems(reorderRes.data);
      setAbnormalConsumption(analyticsRes.data.abnormal_consumption);
      setPeriod(analyticsRes.data.period);
    } catch (err) {
      console.error("Failed to load procurement data", err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <AppShell subtitle="Procurement">Loading Intelligence Dashboard...</AppShell>;

  return (
    <AppShell subtitle="Procurement & Stock Intelligence">

      {/* 1. Smart Re-order Sheet */}
      <div className="card" style={{ marginBottom: '32px' }}>
        <h2 style={{ marginBottom: '20px' }}>Smart Re-order Sheet</h2>
        <p className="card-subtext" style={{ marginBottom: '24px' }}>
          Items currently below reorder level or requiring replenishment.
        </p>
        <div className="table-container">
          <table className="modern-table">
            <thead>
              <tr>
                <th>Item Name</th>
                <th>Current Stock</th>
                <th>Reorder Level</th>
                <th>Last Price</th>
                <th>Best Vendor</th>
                <th>Best Avg Price</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {reorderItems.map(item => (
                <tr key={item.item_id} style={item.needs_reorder ? { background: '#fff7ed' } : {}}>
                  <td style={{ fontWeight: 700 }}>{item.item_name}</td>
                  <td>{item.current_stock} {item.unit}</td>
                  <td>{item.reorder_level} {item.unit}</td>
                  <td>{formatCurrency(item.last_price)}</td>
                  <td>{item.best_vendor}</td>
                  <td>{formatCurrency(item.best_avg_price)}</td>
                  <td>
                    {item.needs_reorder ? (
                      <span className="badge badge-danger">LOW STOCK</span>
                    ) : (
                      <span className="badge badge-success">HEALTHY</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. Consumption Analytics */}
      <div className="card">
        <h2 style={{ marginBottom: '20px' }}>Abnormal Consumption ({period})</h2>
        <p className="card-subtext" style={{ marginBottom: '24px' }}>
          Items showing significantly higher usage than the 6-month average.
        </p>
        <div className="table-container">
          <table className="modern-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Monthly Avg</th>
                <th>Current Month</th>
                <th>Spike %</th>
                <th>Insight</th>
              </tr>
            </thead>
            <tbody>
              {abnormalConsumption.map((item, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 700 }}>{item.item}</td>
                  <td>{item.avg_monthly.toFixed(2)}</td>
                  <td>{item.current_month.toFixed(2)}</td>
                  <td style={{ color: 'var(--danger)', fontWeight: 800 }}>+{item.spike_percentage}%</td>
                  <td>
                    <span style={{ fontSize: '0.85rem' }}>
                      ⚠️ Unusual usage detected. Verify store exit logs or check for wastage.
                    </span>
                  </td>
                </tr>
              ))}
              {abnormalConsumption.length === 0 && (
                <tr><td colSpan="5" style={{ textAlign: 'center', padding: '40px' }}>No abnormal consumption detected for this period.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ height: '60px' }}></div>
    </AppShell>
  );
}
