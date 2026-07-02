// src/pages/PaymentVerificationPage.js
import React, { useEffect, useState } from "react";
import AppShell from "../components/AppShell";
import api from "../api";
import { formatPKR } from "../utils/formatPKR";

export default function PaymentVerificationPage() {
  const [proofs, setProofs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("PENDING");

  useEffect(() => {
    fetchProofs();
  }, [filter]);

  async function fetchProofs() {
    setLoading(true);
    try {
      // In a real setup, we might want to filter by status on the backend
      const res = await api.get("payment_proofs/");
      const data = Array.isArray(res.data) ? res.data : res.data.results || [];
      setProofs(data.filter(p => p.status === filter));
    } catch (err) {
      console.error("Error fetching payment proofs:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(id, status, remarks = "") {
    try {
      await api.patch(`payment_proofs/${id}/`, { status, remarks });
      alert(`Payment ${status.toLowerCase()} successfully.`);
      fetchProofs();
    } catch (err) {
      console.error("Action failed:", err);
      alert("Failed to process action.");
    }
  }

  if (loading) return <AppShell subtitle="Finance">Loading submissions...</AppShell>;

  return (
    <AppShell subtitle="Payment Proof Verification">
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
          <h2 style={{ margin: 0 }}>Review Queue</h2>
          <div style={{ display: 'flex', gap: '8px' }}>
            {['PENDING', 'APPROVED', 'REJECTED'].map(s => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`btn ${filter === s ? 'btn-primary' : 'btn-soft'}`}
                style={{ padding: '6px 16px', fontSize: '0.8rem' }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Month</th>
                <th>Amount</th>
                <th>Submitted On</th>
                <th>Proof File</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {proofs.map(p => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 700 }}>{p.student_name}</td>
                  <td>{new Date(p.fee_month).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</td>
                  <td>{formatPKR(p.fee_amount)}</td>
                  <td>{new Date(p.uploaded_on).toLocaleString()}</td>
                  <td>
                    <a href={p.file} target="_blank" rel="noreferrer" className="btn btn-soft" style={{ padding: '4px 10px', fontSize: '0.7rem' }}>
                      👁️ View Image
                    </a>
                  </td>
                  <td>
                    {p.status === 'PENDING' && (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => handleAction(p.id, 'APPROVED')}
                          className="btn btn-primary"
                          style={{ padding: '4px 10px', fontSize: '0.75rem', background: 'var(--success)' }}
                        >
                          Verify
                        </button>
                        <button
                          onClick={() => {
                            const r = prompt("Reason for rejection:");
                            if (r) handleAction(p.id, 'REJECTED', r);
                          }}
                          className="btn"
                          style={{ padding: '4px 10px', fontSize: '0.75rem', background: '#fee2e2', color: '#b91c1c' }}
                        >
                          Reject
                        </button>
                      </div>
                    )}
                    {p.status !== 'PENDING' && (
                       <span className={`badge ${p.status === 'APPROVED' ? 'badge-success' : 'badge-danger'}`}>
                         {p.status}
                       </span>
                    )}
                  </td>
                </tr>
              ))}
              {proofs.length === 0 && (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No {filter.toLowerCase()} submissions found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ marginTop: '32px', padding: '24px', background: '#f0fdf4', borderRadius: '16px', border: '1px solid #bbf7d0' }}>
         <p style={{ margin: 0, fontSize: '0.85rem', color: '#166534', fontWeight: 600 }}>
            💡 <b>Accountant's Guide:</b> Verifying a payment proof will automatically mark the student's fee as "PAID" and lock the late fee snapshot.
         </p>
      </div>
    </AppShell>
  );
}
