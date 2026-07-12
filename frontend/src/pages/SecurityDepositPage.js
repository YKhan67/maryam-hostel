// src/pages/SecurityDepositPage.js
import React, { useEffect, useState } from "react";
import api from "../api";
import { formatPKR } from "../utils/formatPKR";

export default function SecurityDepositPage() {
  const [deposits, setDeposits] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDeposits();
  }, []);

  async function fetchDeposits() {
    try {
      const res = await api.get("fees/security-deposits/");
      setDeposits(res.data);
    } catch (err) {
      console.error("Failed to load deposits", err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <p>Loading Deposits...</p>;

  return (
    <>
      <div className="card">
        <h2 style={{ marginBottom: '24px' }}>Security Deposit Status</h2>
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Amount</th>
                <th>Paid Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {deposits.map((d, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 700 }}>{d.student}</td>
                  <td>{formatPKR(d.amount)}</td>
                  <td>{new Date(d.date_paid).toLocaleDateString()}</td>
                  <td>
                    <span className={`badge ${d.status === 'HELD' ? 'badge-warning' : 'badge-success'}`}>
                      {d.status}
                    </span>
                  </td>
                </tr>
              ))}
              {deposits.length === 0 && (
                <tr><td colSpan="4" style={{ textAlign: 'center', padding: '40px' }}>No security records found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ marginTop: '32px', padding: '24px', background: '#fffbeb', borderRadius: '16px', border: '1px solid #fde68a' }}>
        <p style={{ margin: 0, fontSize: '0.85rem', color: '#92400e', fontWeight: 600 }}>
          💡 <b>Investor Tip:</b> Security deposits are liabilities. Ensure these are not mixed with monthly operational revenue in your PnL.
        </p>
      </div>
    </>
  );
}
