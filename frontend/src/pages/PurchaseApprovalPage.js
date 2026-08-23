// src/pages/PurchaseApprovalPage.js
import React, { useEffect, useState } from "react";
import api from "../api";
import { usePermissions } from "../hooks/usePermissions";

function formatCurrency(v) {
  if (v === null || v === undefined || isNaN(v)) return "Rs 0";
  const num = Number(v);
  return `Rs ${num.toLocaleString("en-PK", { maximumFractionDigits: 0 })}`;
}

function resolveMediaUrl(url) {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  if (/^\/\//.test(url)) return window.location.protocol + url;
  const base = api.defaults.baseURL && /^https?:\/\//i.test(api.defaults.baseURL)
    ? api.defaults.baseURL
    : window.location.origin;
  return new URL(url, base).toString();
}

export default function PurchaseApprovalPage() {
  const { check } = usePermissions();
  const isReadOnly = !check("PROCUREMENT", "edit"); // Approval is an 'edit' action

  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPending();
  }, []);

  async function loadPending() {
    setLoading(true);
    try {
      const res = await api.get("purchases/", { params: { status: 'PENDING' } });
      const data = Array.isArray(res.data) ? res.data : res.data.results || [];
      // Filter manually just in case API doesn't support the param yet
      setPending(data.filter(p => p.status === 'PENDING'));
    } catch (err) {
      console.error("Failed to load pending purchases", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(id, action, remarks = "") {
    try {
      await api.post(`purchases/${id}/${action}/`, { remarks });
      alert(`Purchase ${action}ed successfully.`);
      loadPending();
    } catch (err) {
      alert(`Failed to ${action} purchase.`);
    }
  }

  if (loading) return <p>Syncing Purchase Queue...</p>;

  return (
    <>
      <div className="card">
        <h2 style={{ marginBottom: '24px' }}>Pending Approvals</h2>
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Hostel</th>
                <th>Vendor</th>
                <th>Item</th>
                <th>Total Cost</th>
                <th>Evidence</th>
                {!isReadOnly && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {pending.map(p => (
                <tr key={p.id}>
                  <td>{p.date}</td>
                  <td>{p.hostel_name}</td>
                  <td>{p.vendor_name}</td>
                  <td>{p.item_name} (x{p.quantity})</td>
                  <td style={{ fontWeight: 800 }}>{formatCurrency(p.total_cost)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {p.invoice_photo && (
                        <a href={resolveMediaUrl(p.invoice_photo)} target="_blank" rel="noreferrer" className="badge badge-warning">Invoice</a>
                      )}
                      {p.items_photo && (
                        <a href={resolveMediaUrl(p.items_photo)} target="_blank" rel="noreferrer" className="badge badge-success">Items</a>
                      )}
                      {!p.invoice_photo && !p.items_photo && <span style={{ color: '#ccc' }}>No Photos</span>}
                    </div>
                  </td>
                  {!isReadOnly && (
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => handleAction(p.id, 'approve')}
                          className="btn btn-primary"
                          style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => {
                            const r = prompt("Reason for rejection:");
                            if (r) handleAction(p.id, 'reject', r);
                          }}
                          className="btn"
                          style={{ padding: '4px 10px', fontSize: '0.75rem', background: '#fee2e2', color: '#b91c1c' }}
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {pending.length === 0 && (
                <tr><td colSpan="7" style={{ textAlign: 'center', padding: '40px' }}>No purchases awaiting approval.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ marginTop: '32px', padding: '20px', background: '#f8fafc', borderRadius: '16px', border: '1px dashed #cbd5e1' }}>
         <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
            💡 <b>Note:</b> Purchases will not reflect in Stock Levels or PnL reports until they are <b>Approved</b> by an Administrator.
         </p>
      </div>
    </>
  );
}
