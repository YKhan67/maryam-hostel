// src/pages/VisualAuditPage.js
import React, { useEffect, useState } from "react";
import api from "../api";

export default function VisualAuditPage() {
  const [logs, setLogs] = useState([]);
  const [filter, setFilter] = useState("ALL"); // ALL, PURCHASES, CONSUMPTIONS
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAuditLogs();
  }, [filter]);

  async function loadAuditLogs() {
    setLoading(true);
    try {
      let data = [];
      if (filter === "ALL" || filter === "PURCHASES") {
        const pRes = await api.get("inventory/list/");
        const purchases = Array.isArray(pRes.data) ? pRes.data : pRes.data.results || [];
        data = [...data, ...purchases.map(p => ({ ...p, auditType: 'PURCHASE' }))];
      }

      if (filter === "ALL" || filter === "CONSUMPTIONS") {
        const cRes = await api.get("consumptions/");
        const consumptions = Array.isArray(cRes.data) ? cRes.data : cRes.data.results || [];
        data = [...data, ...consumptions.map(c => ({ ...c, auditType: 'CONSUMPTION' }))];
      }

      // Sort by date descending
      data.sort((a, b) => new Date(b.date || b.created_at) - new Date(a.date || a.created_at));

      // Filter for items that actually have photos
      const withPhotos = data.filter(item => item.invoice_photo || item.items_photo || item.photo);
      setLogs(withPhotos);
    } catch (err) {
      console.error("Failed to load audit logs", err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <p>Loading Visual Evidence...</p>;

  return (
    <>
      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <h2 style={{ margin: 0 }}>Visual Audit Gallery</h2>
          <div style={{ display: 'flex', gap: '8px' }}>
            {['ALL', 'PURCHASES', 'CONSUMPTIONS'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`btn ${filter === f ? 'btn-primary' : 'btn-soft'}`}
                style={{ padding: '6px 16px', fontSize: '0.8rem' }}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
        {logs.map((log, idx) => (
          <div key={idx} className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--secondary)' }}>{log.item_name || log.item}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {log.auditType} • {new Date(log.date || log.created_at).toLocaleDateString()}
                </div>
              </div>
              <span className={`badge ${log.auditType === 'PURCHASE' ? 'badge-success' : 'badge-warning'}`}>
                {log.hostel || log.hostel_name}
              </span>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap' }}>
              {log.invoice_photo && (
                <div style={{ flex: '1 1 50%', height: '200px', borderRight: '1px solid #eee' }}>
                  <img src={log.invoice_photo} alt="Invoice" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div style={{ position: 'absolute', bottom: 5, left: 5, background: 'rgba(0,0,0,0.5)', color: '#fff', fontSize: '0.6rem', padding: '2px 6px', borderRadius: '4px' }}>INVOICE</div>
                </div>
              )}
              {log.items_photo && (
                <div style={{ flex: '1 1 50%', height: '200px' }}>
                  <img src={log.items_photo} alt="Items" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div style={{ position: 'absolute', bottom: 5, right: 5, background: 'rgba(0,0,0,0.5)', color: '#fff', fontSize: '0.6rem', padding: '2px 6px', borderRadius: '4px' }}>RECEIVED ITEMS</div>
                </div>
              )}
              {log.photo && (
                <div style={{ width: '100%', height: '250px' }}>
                  <img src={log.photo} alt="Consumption" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div style={{ position: 'absolute', bottom: 5, left: 5, background: 'rgba(0,0,0,0.5)', color: '#fff', fontSize: '0.6rem', padding: '2px 6px', borderRadius: '4px' }}>CONSUMPTION PROOF</div>
                </div>
              )}
            </div>

            <div style={{ padding: '16px', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Quantity:</span>
                <span style={{ fontWeight: 700 }}>{log.quantity} {log.unit}</span>
              </div>
              {log.vendor_name && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Vendor:</span>
                  <span style={{ fontWeight: 700 }}>{log.vendor_name}</span>
                </div>
              )}
              {log.remarks && (
                <div style={{ marginTop: '8px', fontStyle: 'italic', color: 'var(--text-muted)' }}>
                  "{log.remarks}"
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {logs.length === 0 && !loading && (
        <div className="card" style={{ textAlign: 'center', padding: '80px 0' }}>
          <div style={{ fontSize: '3rem', marginBottom: '20px' }}>📷</div>
          <h3>No Visual Evidence Found</h3>
          <p style={{ color: 'var(--text-muted)' }}>Photos uploaded during purchases or stock removals will appear here.</p>
        </div>
      )}

      <div style={{ height: '60px' }}></div>
    </>
  );
}
