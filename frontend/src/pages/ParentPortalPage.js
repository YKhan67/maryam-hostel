// src/pages/ParentPortalPage.js
import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { formatPKR } from "../utils/formatPKR";
import logoImg from "../assets/maryam_logo.png";

export default function ParentPortalPage() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // We use axios directly because this is a public page (no auth header needed)
  // We need to determine the base URL
  const API_BASE_URL =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname.startsWith("192.168.")
      ? `http://${window.location.hostname}:8000/api/`
      : "/api/";
  const mediaBaseUrl = API_BASE_URL.replace(/\/api\/?$/, "");

  const resolveMediaUrl = (path) => {
    if (!path) return null;
    if (path.startsWith("http")) return path;
    return `${mediaBaseUrl}${path}`;
  };

  const fetchParentData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}fees/parent-ledger/${token}/`);
      setData(res.data);
    } catch (err) {
      console.error("Error fetching parent data:", err);
      setError("Invalid or expired access link. Please contact hostel management.");
    } finally {
      setLoading(false);
    }
  }, [API_BASE_URL, token]);

  useEffect(() => {
    fetchParentData();
  }, [fetchParentData]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f5f5f7' }}>
        <p>Loading Secure Parent Portal...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', height: '100vh', background: '#f5f5f7' }}>
        <div style={{ fontSize: '3rem' }}>⚠️</div>
        <h3>Access Denied</h3>
        <p style={{ color: '#d64545' }}>{error}</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f7', padding: '20px' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
           <img src={logoImg} alt="Logo" style={{ height: '50px' }} />
           <div>
             <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>MARYAM GIRLS HOSTEL</h1>
             <p style={{ margin: 0, fontSize: '0.85rem', color: '#6b7280' }}>Official Parent Verification Portal</p>
           </div>
        </div>

        {/* Student Summary */}
        <div className="card" style={{ background: 'linear-gradient(135deg, #5f6065 0%, #3f3f46 100%)', color: '#fff', marginBottom: '24px' }}>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '20px' }}>
            {data.student_picture && (
              <img
                src={resolveMediaUrl(data.student_picture)}
                alt={data.student_name}
                style={{ width: '72px', height: '72px', objectFit: 'cover', borderRadius: '50%', border: '3px solid rgba(255,255,255,0.4)' }}
              />
            )}
            <div>
              <h2 style={{ margin: '0 0 4px 0', fontSize: '1.5rem' }}>{data.student_name}</h2>
              <p style={{ opacity: 0.8, margin: 0, fontSize: '0.9rem' }}>
                {data.hostel_name} • Room {data.room_number}
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '16px' }}>
            <div style={{ background: 'rgba(255,255,255,0.1)', padding: '16px', borderRadius: '12px' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>NIC #</div>
              <div style={{ fontSize: '1rem', fontWeight: 700 }}>{data.nic_number || 'N/A'}</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.1)', padding: '16px', borderRadius: '12px' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>Month</div>
              <div style={{ fontSize: '1rem', fontWeight: 700 }}>{data.month || 'N/A'}</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.1)', padding: '16px', borderRadius: '12px' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>Status</div>
              <div style={{ fontSize: '1rem', fontWeight: 700 }}>{data.status || 'N/A'}</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.1)', padding: '16px', borderRadius: '12px' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>Security Deposit</div>
              <div style={{ fontSize: '1rem', fontWeight: 700 }}>{formatPKR(data.security_deposit || 0)}</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.1)', padding: '16px', borderRadius: '12px' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>Amount Due</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fbbf24' }}>{formatPKR(data.amount_due || 0)}</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.1)', padding: '16px', borderRadius: '12px' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>Amount Paid</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#34d399' }}>{formatPKR(data.amount_paid || 0)}</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.1)', padding: '16px', borderRadius: '12px' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>Utilities Bill</div>
              <div style={{ fontSize: '1rem', fontWeight: 700 }}>{formatPKR(data.utilities_bill || 0)}</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.1)', padding: '16px', borderRadius: '12px' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>Fine</div>
              <div style={{ fontSize: '1rem', fontWeight: 700 }}>{formatPKR(data.fine || 0)}</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.1)', padding: '16px', borderRadius: '12px', gridColumn: '1 / -1' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>Total</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{formatPKR(data.total || 0)}</div>
            </div>
          </div>
        </div>

        {/* Ledger */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Financial History</h3>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Status</th>
                  <th>Amount</th>
                  <th>Fine</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {data.ledger.map((entry, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: 600 }}>{new Date(entry.date).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</td>
                    <td>
                      <span className={`badge ${entry.status === 'PAID' ? 'badge-success' : 'badge-danger'}`}>
                        {entry.status}
                      </span>
                    </td>
                    <td>{formatPKR(entry.total)}</td>
                    <td style={{ color: entry.fine > 0 ? '#d64545' : 'inherit' }}>{formatPKR(entry.fine)}</td>
                    <td style={{ fontWeight: 800 }}>{formatPKR(entry.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: '40px', padding: '20px', color: '#6b7280', fontSize: '0.8rem' }}>
          <p>© {new Date().getFullYear()} Maryam Girls Hostel. All rights reserved.</p>
          <p>Secure link generated for verified guardians only.</p>
        </div>

      </div>
    </div>
  );
}
