// src/pages/PaymentVerificationPage.js
import React, { useEffect, useState, useCallback } from "react";
import api from "../api";
import { formatPKR } from "../utils/formatPKR";

export default function PaymentVerificationPage() {
  const [proofs, setProofs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("PENDING");

  // Modal State
  const [selectedProof, setSelectedProof] = useState(null);
  const [remarks, setRemarks] = useState("");
  const [processing, setProcessing] = useState(false);

  const fetchProofs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("payment_proofs/");
      const data = Array.isArray(res.data) ? res.data : res.data.results || [];
      setProofs(data.filter(p => p.status === filter));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { fetchProofs(); }, [fetchProofs]);

  async function handleAction(status) {
    if (!selectedProof) return;
    setProcessing(true);
    try {
      await api.patch(`payment_proofs/${selectedProof.id}/`, { status, remarks });
      setSelectedProof(null);
      setRemarks("");
      fetchProofs();
    } catch (err) { alert("Action failed."); }
    finally { setProcessing(false); }
  }

  if (loading) return <p>Loading submissions...</p>;

  return (
    <div className="page management-page">
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ margin: 0 }}>Payment Verification Queue</h2>
          <div style={{ display: 'flex', gap: '8px' }}>
            {['PENDING', 'APPROVED', 'REJECTED'].map(s => (
              <button key={s} onClick={() => setFilter(s)} className={`btn ${filter === s ? 'btn-primary' : 'btn-soft'}`}>{s}</button>
            ))}
          </div>
        </div>

        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr><th>Student</th><th>Amount</th><th>Submitted</th><th>Proof</th><th>Status</th></tr>
            </thead>
            <tbody>
              {proofs.map(p => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 700 }}>{p.student_name}</td>
                  <td>{formatPKR(p.fee_amount)}</td>
                  <td>{new Date(p.uploaded_on).toLocaleDateString()}</td>
                  <td>
                    <button onClick={() => setSelectedProof(p)} className="btn btn-soft" style={{ padding: '4px 12px' }}>🔍 Review Proof</button>
                  </td>
                  <td><span className={`badge ${p.status === 'APPROVED' ? 'badge-success' : 'badge-danger'}`}>{p.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* REVIEW MODAL */}
      {selectedProof && (
        <div className="modal-backdrop" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="card" style={{ maxWidth: '600px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3>Verify Payment: {selectedProof.student_name}</h3>
            <div style={{ background: '#f1f5f9', padding: '10px', borderRadius: '8px', marginBottom: '20px', textAlign: 'center' }}>
                <img src={selectedProof.file} alt="Proof" style={{ maxWidth: '100%', borderRadius: '4px', border: '1px solid #ddd' }} />
                <p style={{ marginTop: '10px' }}><a href={selectedProof.file} target="_blank" rel="noreferrer" style={{ color: 'var(--brand-gold)', fontWeight: 600 }}>🔗 Open Original Image</a></p>
            </div>

            <div className="form-group">
                <label className="form-label">Notes / Rejection Reason (Optional)</label>
                <textarea className="form-input" value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="e.g. Reference number verified OR Image is blurry..."></textarea>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                <button onClick={() => handleAction('APPROVED')} className="btn btn-primary" style={{ flex: 1, background: 'var(--success)' }} disabled={processing}>
                    {processing ? "..." : "✅ Accept Payment"}
                </button>
                <button onClick={() => handleAction('REJECTED')} className="btn" style={{ flex: 1, background: '#fee2e2', color: '#b91c1c' }} disabled={processing}>
                    {processing ? "..." : "❌ Reject Proof"}
                </button>
                <button onClick={() => setSelectedProof(null)} className="btn btn-soft">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
