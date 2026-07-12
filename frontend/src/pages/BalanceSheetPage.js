// src/pages/BalanceSheetPage.js
import React, { useEffect, useState } from "react";
import api from "../api";
import { formatPKR } from "../utils/formatPKR";

export default function BalanceSheetPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorInfo, setErrorInfo] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setErrorInfo("");
    try {
      const res = await api.get("finance/balance-sheet/");
      setData(res.data);
    } catch (err) {
      console.error(err);
      setErrorInfo(err.response?.data?.detail || err.message || "Unknown error during financial calculation.");
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <p>Calculating Book Value...</p>;

  if (errorInfo) return (
    <div className="card" style={{ textAlign: 'center', padding: '60px 40px' }}>
      <div style={{ fontSize: '4rem', marginBottom: '24px' }}>📉</div>
      <h3 style={{ color: 'var(--brand-grey)' }}>Financial Sync Error</h3>
      <p style={{ color: 'var(--danger)', fontWeight: 600, margin: '12px 0' }}>{errorInfo}</p>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>This usually happens if database migrations for the new Finance module are not applied.</p>
      <button onClick={loadData} className="btn btn-primary" style={{ marginTop: '32px' }}>Retry Calculation</button>
    </div>
  );

  if (!data) return <p>Initializing Balance Sheet...</p>;

  return (
    <>
      <div className="card" style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', color: '#fff', marginBottom: '32px', border: 'none' }}>
         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ margin: 0, opacity: 0.8, fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Business Net Equity</h2>
              <div style={{ fontSize: '3rem', fontWeight: 800, color: 'var(--brand-gold)', margin: '4px 0' }}>{formatPKR(data.equity)}</div>
              <p style={{ opacity: 0.6, fontSize: '0.85rem' }}>Consolidated Position as of {new Date(data.date).toLocaleDateString()}</p>
            </div>
            <div style={{ fontSize: '4rem', opacity: 0.2 }}>⚖️</div>
         </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '32px' }}>

        {/* ASSETS COLUMN */}
        <div>
           <h3 className="sidebar-section-title" style={{ marginBottom: '16px', color: 'var(--success)', fontWeight: 800 }}>1. Total Assets (What you own)</h3>
           <div className="card" style={{ borderTop: '4px solid var(--success)' }}>
              <StatRow label="Fixed Assets (Valuation)" value={data.assets.fixed_assets} />
              <StatRow label="Student Receivables (Dues)" value={data.assets.student_receivables} />
              <StatRow label="Current Inventory (Stock)" value={data.assets.inventory_valuation} />
              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '2px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.1rem' }}>
                 <span>TOTAL ASSETS</span>
                 <span style={{ color: 'var(--success)' }}>{formatPKR(data.assets.total)}</span>
              </div>
           </div>
        </div>

        {/* LIABILITIES COLUMN */}
        <div>
           <h3 className="sidebar-section-title" style={{ marginBottom: '16px', color: 'var(--danger)', fontWeight: 800 }}>2. Total Liabilities (What you owe)</h3>
           <div className="card" style={{ borderTop: '4px solid var(--danger)' }}>
              <StatRow label="Refundable Security Deposits" value={data.liabilities.security_deposits} />
              <StatRow label="Accrued Expenses (Liabilities)" value={data.liabilities.accrued_expenses} />
              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '2px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.1rem' }}>
                 <span>TOTAL LIABILITIES</span>
                 <span style={{ color: 'var(--danger)' }}>{formatPKR(data.liabilities.total)}</span>
              </div>
           </div>

           <div className="card" style={{ marginTop: '24px', background: '#f8fafc', border: '1px dashed #cbd5e1' }}>
              <h4 style={{ margin: '0 0 8px 0', color: 'var(--brand-grey)' }}>💡 Auditor Insight</h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                 Equity represents the internal value created by the business or invested by owners.
                 A positive equity indicates a solvent and healthy financial state.
              </p>
           </div>
        </div>

      </div>
    </>
  );
}

function StatRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 0', borderBottom: '1px solid #f1f5f9' }}>
       <span style={{ fontSize: '0.95rem', color: '#64748b' }}>{label}</span>
       <span style={{ fontWeight: 700, color: '#1e293b' }}>{formatPKR(value)}</span>
    </div>
  );
}
