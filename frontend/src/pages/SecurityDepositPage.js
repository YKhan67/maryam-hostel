// src/pages/SecurityDepositPage.js
import React, { useEffect, useState } from "react";
import api from "../api";
import { formatPKR } from "../utils/formatPKR";

export default function SecurityDepositPage() {
  const [deposits, setDeposits] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingDeposit, setEditingDeposit] = useState(null);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");

  // Form state
  const [formData, setFormData] = useState({
    student_id: "",
    amount: "",
    date_paid: new Date().toISOString().split('T')[0],
    status: "HELD",
    remarks: ""
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [depRes, studentRes] = await Promise.all([
        api.get("fees/security-deposits/"),
        api.get("students/")
      ]);
      setDeposits(depRes.data || []);
      
      // Get students data
      const studentsData = studentRes.data.results || studentRes.data || [];
      
      // Filter ONLY active students
      // Check both user__is_active and is_active fields
      const activeStudents = studentsData.filter(s => {
        // Check if user is active - user object might be nested
        const isUserActive = s.user?.is_active === true;
        // Check if student profile is active
        const isStudentActive = s.is_active === true;
        
        // Log for debugging - remove after testing
        console.log(`Student ${s.id}: user_active=${isUserActive}, student_active=${isStudentActive}`);
        
        return isUserActive && isStudentActive;
      });
      
      setStudents(activeStudents);
    } catch (err) {
      console.error("Failed to load data:", err);
      setError("Failed to load security deposits. Please refresh the page.");
    } finally {
      setLoading(false);
    }
  }

  // Filter deposits
  const filteredDeposits = deposits.filter(d => {
    if (statusFilter !== "ALL" && d.status !== statusFilter) {
      return false;
    }
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const studentName = (d.student_name || "").toLowerCase();
      return studentName.includes(search);
    }
    return true;
  });

  // Calculate totals
  const totalHeld = deposits
    .filter(d => d.status === "HELD")
    .reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);
  
  const totalRefunded = deposits
    .filter(d => d.status === "REFUNDED")
    .reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);
  
  const totalForfeited = deposits
    .filter(d => d.status === "FORFEITED")
    .reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);
  
  const totalAll = deposits.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    
    try {
      if (editingDeposit) {
        await api.patch(`fees/security-deposits/${editingDeposit.id}/`, {
          student: formData.student_id,
          amount: formData.amount,
          date_paid: formData.date_paid,
          status: formData.status,
          remarks: formData.remarks
        });
        setSuccess("✅ Security deposit updated successfully!");
      } else {
        await api.post("fees/security-deposits/", {
          student: formData.student_id,
          amount: formData.amount,
          date_paid: formData.date_paid,
          status: formData.status,
          remarks: formData.remarks
        });
        setSuccess("✅ Security deposit created successfully!");
      }
      resetForm();
      loadData();
    } catch (err) {
      console.error("Error saving deposit:", err);
      let errorMsg = "Failed to save security deposit.";
      if (err.response?.data?.detail) {
        errorMsg = err.response.data.detail;
      } else if (err.response?.status === 400) {
        errorMsg = "❌ Invalid data. Please check all fields.";
      }
      setError(errorMsg);
    }
  };

  const handleEdit = (deposit) => {
    setEditingDeposit(deposit);
    setFormData({
      student_id: deposit.student || "",
      amount: deposit.amount || "",
      date_paid: deposit.date_paid || new Date().toISOString().split('T')[0],
      status: deposit.status || "HELD",
      remarks: deposit.remarks || ""
    });
    setShowForm(true);
  };

  const handleRefund = async (depositId) => {
    if (!window.confirm("Are you sure you want to mark this deposit as REFUNDED?")) {
      return;
    }
    
    setError(null);
    setSuccess(null);
    
    try {
      await api.post(`fees/security-deposits/${depositId}/refund/`);
      setSuccess("✅ Security deposit marked as REFUNDED successfully!");
      loadData();
    } catch (err) {
      console.error("Error refunding deposit:", err);
      let errorMsg = "Failed to refund deposit.";
      if (err.response?.data?.detail) {
        errorMsg = err.response.data.detail;
      }
      setError(errorMsg);
    }
  };

  const handleForfeit = async (depositId) => {
    if (!window.confirm("Are you sure you want to mark this deposit as FORFEITED?")) {
      return;
    }
    
    setError(null);
    setSuccess(null);
    
    try {
      await api.post(`fees/security-deposits/${depositId}/forfeit/`);
      setSuccess("✅ Security deposit marked as FORFEITED successfully!");
      loadData();
    } catch (err) {
      console.error("Error forfeiting deposit:", err);
      let errorMsg = "Failed to forfeit deposit.";
      if (err.response?.data?.detail) {
        errorMsg = err.response.data.detail;
      }
      setError(errorMsg);
    }
  };

  const handleDelete = async (depositId) => {
    if (!window.confirm("Are you sure you want to delete this security deposit record? This action cannot be undone.")) {
      return;
    }
    
    setError(null);
    setSuccess(null);
    
    try {
      await api.delete(`fees/security-deposits/${depositId}/`);
      setSuccess("✅ Security deposit deleted successfully!");
      loadData();
    } catch (err) {
      console.error("Error deleting deposit:", err);
      setError("Failed to delete security deposit.");
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingDeposit(null);
    setFormData({
      student_id: "",
      amount: "",
      date_paid: new Date().toISOString().split('T')[0],
      status: "HELD",
      remarks: ""
    });
  };

  const getStatusBadgeClass = (status) => {
    switch(status) {
      case "HELD": return "badge-warning";
      case "REFUNDED": return "badge-success";
      case "FORFEITED": return "badge-danger";
      default: return "badge-soft";
    }
  };

  if (loading) {
    return (
      <div className="page management-page">
        <div className="card">
          <p>Loading Security Deposits...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page management-page">
      {/* Header and Actions */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          flexWrap: 'wrap', 
          gap: '16px' 
        }}>
          <div>
            <h2 style={{ margin: 0 }}>Security Deposit Status</h2>
            <p className="card-subtext">Track and manage student security deposits.</p>
          </div>
          <button 
            onClick={() => { resetForm(); setShowForm(!showForm); }} 
            className="btn btn-primary"
          >
            {showForm ? "✕ Close Form" : "➕ Add Security Deposit"}
          </button>
        </div>
      </div>

      {/* Error and Success Messages */}
      {error && (
        <div style={{ 
          padding: '12px 16px', 
          background: '#fef2f2', 
          border: '1px solid #fecaca', 
          borderRadius: '8px', 
          color: '#dc2626', 
          marginBottom: '16px',
          fontSize: '0.9rem'
        }}>
          {error}
        </div>
      )}
      
      {success && (
        <div style={{ 
          padding: '12px 16px', 
          background: '#f0fdf4', 
          border: '1px solid #bbf7d0', 
          borderRadius: '8px', 
          color: '#16a34a', 
          marginBottom: '16px',
          fontSize: '0.9rem'
        }}>
          {success}
        </div>
      )}

      {/* Add/Edit Form */}
      {showForm && (
        <div className="card" style={{ marginBottom: '24px', background: '#f8fafc' }}>
          <h4 style={{ marginBottom: '16px' }}>
            {editingDeposit ? "Edit Security Deposit" : "New Security Deposit"}
          </h4>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Student *</label>
                <select 
                  className="form-input" 
                  required
                  value={formData.student_id} 
                  onChange={e => setFormData({...formData, student_id: e.target.value})}
                >
                  <option value="">Select Active Student</option>
                  {students.length === 0 ? (
                    <option value="" disabled>No active students available</option>
                  ) : (
                    students.map(s => {
                      // Get student name from user object or direct fields
                      let displayName = "";
                      if (s.user) {
                        const firstName = s.user.first_name || "";
                        const lastName = s.user.last_name || "";
                        displayName = `${firstName} ${lastName}`.trim();
                        if (!displayName && s.user.username) {
                          displayName = s.user.username;
                        }
                      }
                      if (!displayName) {
                        displayName = s.full_name || s.name || s.username || `Student ${s.id}`;
                      }
                      return (
                        <option key={s.id} value={s.id}>
                          {displayName}
                          {s.hostel ? ` (${s.hostel})` : ''}
                        </option>
                      );
                    })
                  )}
                </select>
                {students.length === 0 && (
                  <small style={{ color: '#dc2626', display: 'block', marginTop: '4px' }}>
                    ⚠️ No active students found. Please add active students first.
                  </small>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Amount (PKR) *</label>
                <input 
                  type="number" 
                  className="form-input" 
                  required
                  min="0"
                  step="0.01"
                  value={formData.amount} 
                  onChange={e => setFormData({...formData, amount: e.target.value})}
                  placeholder="0.00"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Date Paid *</label>
                <input 
                  type="date" 
                  className="form-input" 
                  required
                  value={formData.date_paid} 
                  onChange={e => setFormData({...formData, date_paid: e.target.value})}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Status</label>
                <select 
                  className="form-input" 
                  value={formData.status} 
                  onChange={e => setFormData({...formData, status: e.target.value})}
                >
                  <option value="HELD">Held by Hostel</option>
                  <option value="REFUNDED">Refunded to Student</option>
                  <option value="FORFEITED">Forfeited</option>
                </select>
              </div>

              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Remarks</label>
                <textarea 
                  className="form-input" 
                  value={formData.remarks} 
                  onChange={e => setFormData({...formData, remarks: e.target.value})}
                  placeholder="Additional notes..."
                  rows="2"
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
              <button type="submit" className="btn btn-primary" disabled={students.length === 0}>
                {editingDeposit ? "Update" : "Create"}
              </button>
              <button type="button" onClick={resetForm} className="btn btn-soft">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div className="card" style={{ padding: '16px', background: '#f8fafc' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, opacity: 0.6, textTransform: 'uppercase' }}>Total Deposits</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>{formatPKR(totalAll)}</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{deposits.length} records</div>
        </div>
        <div className="card" style={{ padding: '16px', background: '#fffbeb', borderLeft: '4px solid #f59e0b' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, opacity: 0.6, textTransform: 'uppercase' }}>Held</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#d97706' }}>{formatPKR(totalHeld)}</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{deposits.filter(d => d.status === "HELD").length} records</div>
        </div>
        <div className="card" style={{ padding: '16px', background: '#f0fdf4', borderLeft: '4px solid #10b981' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, opacity: 0.6, textTransform: 'uppercase' }}>Refunded</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#16a34a' }}>{formatPKR(totalRefunded)}</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{deposits.filter(d => d.status === "REFUNDED").length} records</div>
        </div>
        <div className="card" style={{ padding: '16px', background: '#fef2f2', borderLeft: '4px solid #ef4444' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, opacity: 0.6, textTransform: 'uppercase' }}>Forfeited</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#dc2626' }}>{formatPKR(totalForfeited)}</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{deposits.filter(d => d.status === "FORFEITED").length} records</div>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: '24px', padding: '12px 16px', background: '#f8fafc' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, opacity: 0.6 }}>FILTER BY:</span>
          <select 
            className="filter-select" 
            value={statusFilter} 
            onChange={e => setStatusFilter(e.target.value)}
            style={{ height: '32px', fontSize: '0.8rem' }}
          >
            <option value="ALL">All Status</option>
            <option value="HELD">Held</option>
            <option value="REFUNDED">Refunded</option>
            <option value="FORFEITED">Forfeited</option>
          </select>
          <input 
            type="text" 
            className="filter-input" 
            placeholder="Search student..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ height: '32px', fontSize: '0.8rem', width: '200px' }}
          />
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
            Showing {filteredDeposits.length} of {deposits.length} records
          </span>
        </div>
      </div>

      {/* Deposits Table */}
      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Amount</th>
                <th>Paid Date</th>
                <th>Status</th>
                <th>Remarks</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDeposits.map((d, i) => (
                <tr key={d.id || i}>
                  <td style={{ fontWeight: 700 }}>{d.student_name || d.student || "Unknown Student"}</td>
                  <td>{formatPKR(d.amount)}</td>
                  <td>{new Date(d.date_paid).toLocaleDateString()}</td>
                  <td>
                    <span className={`badge ${getStatusBadgeClass(d.status)}`}>
                      {d.status === "HELD" ? "🟡 Held" : 
                       d.status === "REFUNDED" ? "✅ Refunded" : 
                       "❌ Forfeited"}
                    </span>
                  </td>
                  <td>{d.remarks || "—"}</td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                      {/* Refund Button - Only show for HELD deposits */}
                      {d.status === "HELD" && (
                        <button 
                          onClick={() => handleRefund(d.id)} 
                          className="btn btn-success" 
                          style={{ padding: '4px 10px', fontSize: '0.7rem' }}
                        >
                          💰 Refund
                        </button>
                      )}
                      {/* Forfeit Button - Only show for HELD deposits */}
                      {d.status === "HELD" && (
                        <button 
                          onClick={() => handleForfeit(d.id)} 
                          className="btn btn-soft" 
                          style={{ padding: '4px 10px', fontSize: '0.7rem', background: '#fef3c7', color: '#92400e' }}
                        >
                          ⚠️ Forfeit
                        </button>
                      )}
                      {/* Edit Button - Show for all except REFUNDED */}
                      {d.status !== "REFUNDED" && (
                        <button 
                          onClick={() => handleEdit(d)} 
                          className="btn btn-soft" 
                          style={{ padding: '4px 10px', fontSize: '0.7rem' }}
                        >
                          ✏️ Edit
                        </button>
                      )}
                      {/* Delete Button */}
                      <button 
                        onClick={() => handleDelete(d.id)} 
                        className="btn btn-soft" 
                        style={{ padding: '4px 10px', fontSize: '0.7rem', background: '#fee2e2', color: '#dc2626' }}
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredDeposits.length === 0 && (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    {searchTerm || statusFilter !== "ALL" 
                      ? "No matching security deposits found." 
                      : "No security records found."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Investor Tip */}
      <div style={{ 
        marginTop: '32px', 
        padding: '24px', 
        background: '#fffbeb', 
        borderRadius: '16px', 
        border: '1px solid #fde68a' 
      }}>
        <p style={{ margin: 0, fontSize: '0.85rem', color: '#92400e', fontWeight: 600 }}>
          💡 <b>Investor Tip:</b> Security deposits are liabilities. Ensure these are not mixed with monthly operational revenue in your PnL.
        </p>
      </div>
    </div>
  );
}