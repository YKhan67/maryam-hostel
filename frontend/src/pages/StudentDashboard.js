// src/pages/StudentDashboard.js
import { formatPKR } from "../utils/formatPKR";
import React, { useContext, useEffect, useState } from "react";
import api from "../api";
import { AuthContext } from "../AuthContext";
import AppShell from "../components/AppShell";

export default function StudentDashboard() {
  const { user } = useContext(AuthContext);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorInfo, setErrorInfo] = useState("");
  const [uploadingFeeId, setUploadingFeeId] = useState(null);
  const [message, setMessage] = useState("");
  const [showTicketForm, setShowTicketForm] = useState(false);
  const [newTicket, setNewTicket] = useState({ category: 'MAINTENANCE', subject: '', description: '' });
  const [ticketSubmitting, setTicketSubmitting] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwords, setPasswords] = useState({ old_password: '', new_password: '', confirm_password: '' });
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);

  useEffect(() => {
    fetchLedger();
  }, []);

  async function fetchLedger() {
    setLoading(true);
    setErrorInfo("");
    try {
      const res = await api.get("fees/student-ledger/");
      setData(res.data);
    } catch (err) {
      console.error("Error fetching ledger:", err);
      const fullUrl = `${api.defaults.baseURL}fees/student-ledger/`;
      setErrorInfo(`${err.response?.statusText || "Not Found"} (URL: ${fullUrl})`);
    } finally {
      setLoading(false);
    }
  }

  async function handleFileChange(e, feeId) {
    const file = e.target.files[0];
    if (!file) return;

    setMessage("");
    setUploadingFeeId(feeId);

    try {
      const formData = new FormData();
      formData.append("fee", feeId);
      formData.append("file", file);

      await api.post("payment_proofs/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setMessage("Payment proof uploaded successfully. Management will verify it.");
      fetchLedger(); // Refresh to show pending status
    } catch (err) {
      console.error("Error uploading payment proof:", err);
      setMessage("Failed to upload payment proof.");
    } finally {
      setUploadingFeeId(null);
      e.target.value = "";
    }
  }

  async function submitTicket(e) {
    e.preventDefault();
    setTicketSubmitting(true);
    try {
      await api.post("communication/tickets/", {
        ...newTicket,
        student: data.summary.student_id, // We'll need to add this to the API response
        hostel: data.summary.hostel_id   // We'll need to add this to the API response
      });
      setMessage("Support ticket raised successfully. Staff will be notified.");
      setShowTicketForm(false);
      setNewTicket({ category: 'MAINTENANCE', subject: '', description: '' });
      fetchLedger();
    } catch (err) {
      console.error("Error raising ticket:", err);
      alert("Failed to raise ticket.");
    } finally {
      setTicketSubmitting(false);
    }
  }

  async function handlePasswordChange(e) {
    e.preventDefault();
    if (passwords.new_password !== passwords.confirm_password) {
      return alert("New passwords do not match.");
    }

    setPasswordSubmitting(true);
    try {
      await api.post("change-password/", {
        old_password: passwords.old_password,
        new_password: passwords.new_password
      });
      setMessage("Password updated successfully.");
      setShowPasswordForm(false);
      setPasswords({ old_password: '', new_password: '', confirm_password: '' });
    } catch (err) {
      console.error("Error changing password:", err);
      alert(err.response?.data?.old_password || "Failed to update password.");
    } finally {
      setPasswordSubmitting(false);
    }
  }

  if (loading) return <AppShell subtitle="My Portal">Loading your records...</AppShell>;

  if (errorInfo) return (
    <AppShell subtitle="Portal Alert">
      <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
        <div style={{ fontSize: '3rem', marginBottom: '20px' }}>⚠️</div>
        <h3>System Notification</h3>
        <p style={{ color: 'var(--danger)', fontWeight: 600 }}>{errorInfo}</p>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Please contact hostel management to verify your account registration.</p>
        <button onClick={fetchLedger} className="btn btn-primary" style={{ marginTop: '20px' }}>Try Refreshing</button>
      </div>
    </AppShell>
  );

  if (!data) return <AppShell subtitle="My Portal">Initializing data sync...</AppShell>;

  const { summary, ledger, tickets } = data;

  return (
    <AppShell subtitle="Student Dashboard">

      {/* 1. FINANCIAL SUMMARY BANNER */}
      <div className="card" style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', color: '#fff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ margin: '0 0 8px 0', fontSize: '1.5rem' }}>Welcome back, {user?.first_name || user?.username}! 👋</h2>
            <p style={{ opacity: 0.8, marginBottom: '24px', fontSize: '0.9rem' }}>
              Hostel: <b>{summary.hostel_name}</b> • Room: <b>{summary.room_number}</b> • Bed: <b>{summary.bed_number}</b>
            </p>
          </div>
          {summary.total_outstanding === 0 && (
            <div style={{ background: 'rgba(52, 211, 153, 0.2)', padding: '8px 16px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 800, color: '#34d399', border: '1px solid #34d399' }}>
              ✓ ALL CLEAR
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div style={{ background: 'rgba(255,255,255,0.1)', padding: '20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, opacity: 0.7, textTransform: 'uppercase', marginBottom: '8px' }}>Total Outstanding</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fbbf24' }}>{formatPKR(summary.total_outstanding)}</div>
            <div style={{ fontSize: '0.7rem', marginTop: '4px', opacity: 0.6 }}>Includes unpaid fees and fines</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.1)', padding: '20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, opacity: 0.7, textTransform: 'uppercase', marginBottom: '8px' }}>Total Paid All-Time</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#34d399' }}>{formatPKR(summary.total_paid)}</div>
            <div style={{ fontSize: '0.7rem', marginTop: '4px', opacity: 0.6 }}>Successfully verified payments</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr', gap: '24px', marginTop: '24px' }}>

        {/* 2. ACCOUNT LEDGER (FEE HISTORY) */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Account Ledger</h3>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)' }}>DATE-WISE HISTORY</span>
          </div>

          {message && (
            <div style={{ margin: '16px', padding: '12px', background: '#ecfdf5', color: '#065f46', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600 }}>
              {message}
            </div>
          )}

          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Status</th>
                  <th>Amount</th>
                  <th>Fine</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {ledger.map(entry => (
                  <tr key={entry.id}>
                    <td>
                      <div style={{ fontWeight: 700 }}>{entry.label}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{entry.remarks}</div>
                      {entry.receipts && entry.receipts.length > 0 && (
                        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                          {entry.receipts.map(r => (
                            <button
                              key={r.id}
                              onClick={() => window.open(`${api.defaults.baseURL}fees/receipt/${r.id}/`, "_blank")}
                              className="badge badge-success"
                              style={{ border: 'none', cursor: 'pointer', fontSize: '0.6rem' }}
                            >
                              📄 Receipt {r.no}
                            </button>
                          ))}
                        </div>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${entry.status === 'PAID' ? 'badge-success' : entry.status === 'PENDING_VERIFICATION' ? 'badge-warning' : 'badge-danger'}`}>
                        {entry.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td>{formatPKR(entry.amount)}</td>
                    <td style={{ color: entry.fine > 0 ? 'var(--danger)' : 'inherit' }}>{formatPKR(entry.fine)}</td>
                    <td>
                      {(entry.status === 'OUTSTANDING' || entry.status === 'REJECTED') && (
                        <label className="btn btn-soft" style={{ padding: '4px 10px', fontSize: '0.7rem' }}>
                          {uploadingFeeId === entry.id ? "..." : "Upload Proof"}
                          <input type="file" hidden onChange={(e) => handleFileChange(e, entry.id)} />
                        </label>
                      )}
                      {entry.status === 'PAID' && <span style={{ fontSize: '1.2rem' }}>✅</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 3. SUPPORT HUB (TICKETS) */}
        <div>
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Support Hub</h3>
              <button
                onClick={() => setShowTicketForm(!showTicketForm)}
                className="btn btn-primary"
                style={{ padding: '4px 12px', fontSize: '0.75rem' }}
              >
                {showTicketForm ? "Close" : "Raise Issue"}
              </button>
            </div>

            {showTicketForm && (
              <form onSubmit={submitTicket} style={{ marginBottom: '24px', padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Category</label>
                  <select
                    className="form-input"
                    style={{ fontSize: '0.85rem' }}
                    value={newTicket.category}
                    onChange={e => setNewTicket({...newTicket, category: e.target.value})}
                  >
                    <option value="MAINTENANCE">Maintenance / Repair</option>
                    <option value="FEES">Fee / Payment Query</option>
                    <option value="MANAGEMENT">General Management</option>
                    <option value="EMERGENCY">Emergency</option>
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Subject</label>
                  <input
                    type="text"
                    className="form-input"
                    style={{ fontSize: '0.85rem' }}
                    placeholder="Brief summary..."
                    value={newTicket.subject}
                    onChange={e => setNewTicket({...newTicket, subject: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Description</label>
                  <textarea
                    className="form-input"
                    style={{ fontSize: '0.85rem' }}
                    placeholder="Tell us more details..."
                    value={newTicket.description}
                    onChange={e => setNewTicket({...newTicket, description: e.target.value})}
                    rows="2"
                    required
                  />
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={ticketSubmitting}>
                  {ticketSubmitting ? "Submitting..." : "Submit Ticket"}
                </button>
              </form>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {tickets.map(t => {
                const statusColor = t.status === 'RESOLVED' ? 'var(--success)' : t.status === 'IN_PROGRESS' ? 'var(--brand-gold)' : 'var(--text-muted)';
                const progressWidth = t.status === 'RESOLVED' ? '100%' : t.status === 'IN_PROGRESS' ? '50%' : '10%';

                return (
                  <div key={t.id} style={{ padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--brand-gold)' }}>{t.category}</span>
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, color: statusColor }}>
                        {t.status}
                      </span>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{t.subject}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Ticket #{t.id} • {new Date(t.created_at).toLocaleDateString()}
                    </div>

                    {/* Visual Progress Bar */}
                    <div style={{ marginTop: '12px', height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: progressWidth, height: '100%', background: statusColor, transition: 'width 0.5s ease-in-out' }}></div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                      <span>RECEIVED</span>
                      <span>IN PROGRESS</span>
                      <span>RESOLVED</span>
                    </div>
                  </div>
                );
              })}
              {tickets.length === 0 && !showTicketForm && (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                  <p style={{ fontSize: '0.85rem' }}>Need a repair or have a question? Click "Raise Issue" above.</p>
                </div>
              )}
            </div>
          </div>

          {/* 4. SECURITY SECTION */}
          <div className="card" style={{ marginTop: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Account Security</h3>
              <button
                onClick={() => setShowPasswordForm(!showPasswordForm)}
                className="btn btn-soft"
                style={{ padding: '4px 12px', fontSize: '0.75rem' }}
              >
                {showPasswordForm ? "Cancel" : "Change Password"}
              </button>
            </div>

            {showPasswordForm && (
              <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Current Password</label>
                  <input
                    type="password"
                    className="form-input"
                    style={{ fontSize: '0.85rem' }}
                    value={passwords.old_password}
                    onChange={e => setPasswords({...passwords, old_password: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>New Password</label>
                  <input
                    type="password"
                    className="form-input"
                    style={{ fontSize: '0.85rem' }}
                    value={passwords.new_password}
                    onChange={e => setPasswords({...passwords, new_password: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Confirm New Password</label>
                  <input
                    type="password"
                    className="form-input"
                    style={{ fontSize: '0.85rem' }}
                    value={passwords.confirm_password}
                    onChange={e => setPasswords({...passwords, confirm_password: e.target.value})}
                    required
                  />
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '10px' }} disabled={passwordSubmitting}>
                  {passwordSubmitting ? "Updating..." : "Update Password"}
                </button>
              </form>
            )}

            {!showPasswordForm && (
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Keep your account secure by using a strong password.
              </p>
            )}
          </div>

          {/* Gamification Badge */}
          {summary.outstanding_fees === 0 && summary.total_paid > 0 && (
            <div className="card" style={{ background: '#fffbeb', border: '1px solid #fde68a', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', marginBottom: '8px' }}>⭐</div>
              <div style={{ fontWeight: 800, color: '#92400e' }}>STUDENT IN GOOD STANDING</div>
              <p style={{ fontSize: '0.75rem', color: '#b45309', margin: '4px 0 0 0' }}>All dues cleared. Keep it up!</p>
            </div>
          )}
        </div>

      </div>

      <div style={{ height: '60px' }}></div>
    </AppShell>
  );
}
