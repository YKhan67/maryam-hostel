// src/pages/AdvanceLedgerPage.js
import React, { useEffect, useState, useContext } from "react";
import api from "../api";
import { AuthContext } from "../AuthContext";
import { formatPKR } from "../utils/formatPKR";

export default function AdvanceLedgerPage() {
  const { user } = useContext(AuthContext);
  const isReadOnly = user?.role === 'PARTNER';
  const isManager = user?.role === 'HOSTEL_MANAGER' || user?.role === 'SUPER_ADMIN';

  const [advances, setAdvances] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState("ALL");

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [advRes, empRes, userRes] = await Promise.all([
        api.get("payroll/advances/"),
        api.get("payroll/employees/"),
        api.get("users/")
      ]);
      setAdvances(advRes.data.results || advRes.data);
      setEmployees(empRes.data.results || empRes.data);
      setUsers(userRes.data.results || userRes.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  // Filter employees - ONLY ACTIVE ones
  const activeEmployees = employees.filter(emp => {
    const user = users.find(u => u.id === emp.user);
    return user?.is_active === true;
  });

  // Filter advances based on status
  const filteredAdvances = advances.filter(adv => {
    if (statusFilter === "PENDING") {
      return adv.is_deducted === false;
    } else if (statusFilter === "DEDUCTED") {
      return adv.is_deducted === true;
    }
    return true;
  });

  // Calculate totals
  const totalPending = advances.filter(a => !a.is_deducted).reduce((sum, a) => sum + (parseFloat(a.amount) || 0), 0);
  const totalDeducted = advances.filter(a => a.is_deducted).reduce((sum, a) => sum + (parseFloat(a.amount) || 0), 0);
  const totalAll = advances.reduce((sum, a) => sum + (parseFloat(a.amount) || 0), 0);

  // Mark advance as deducted (approved)
  const handleMarkDeducted = async (advanceId) => {
    if (!window.confirm("Mark this advance as deducted from salary?")) return;
    
    try {
      await api.patch(`payroll/advances/${advanceId}/`, { is_deducted: true });
      loadData();
    } catch (err) {
      console.error(err);
      alert("Failed to mark as deducted. " + (err.response?.data?.detail || ""));
    }
  };

  // Revert deduction (if needed)
  const handleRevertDeduction = async (advanceId) => {
    if (!window.confirm("Revert deduction status for this advance?")) return;
    
    try {
      await api.patch(`payroll/advances/${advanceId}/`, { is_deducted: false });
      loadData();
    } catch (err) {
      console.error(err);
      alert("Failed to revert. " + (err.response?.data?.detail || ""));
    }
  };

  // Delete advance (admin only)
  const handleDelete = async (advanceId) => {
    if (!window.confirm("Are you sure you want to delete this advance record? This action cannot be undone.")) return;
    
    try {
      await api.delete(`payroll/advances/${advanceId}/`);
      loadData();
    } catch (err) {
      console.error(err);
      alert("Failed to delete. " + (err.response?.data?.detail || ""));
    }
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div className="page management-page">
      <div className="card">
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h2 style={{ margin: 0 }}>Advance Disbursement Log</h2>
            <p className="card-subtext">Track employee salary advances and deductions.</p>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div className="filter-group" style={{ marginBottom: 0 }}>
              <label className="filter-label" style={{ fontSize: '0.7rem', marginBottom: '2px' }}>Status</label>
              <select 
                className="filter-select" 
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ minWidth: '130px' }}
              >
                <option value="ALL">All Advances</option>
                <option value="PENDING">Pending</option>
                <option value="DEDUCTED">Deducted</option>
              </select>
            </div>
            {!isReadOnly && (
              <button onClick={() => setShowForm(true)} className="btn btn-primary" style={{ marginTop: '16px' }}>
                💸 Give Advance
              </button>
            )}
          </div>
        </div>

        {/* Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, opacity: 0.7, textTransform: 'uppercase' }}>Total Advances</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>{formatPKR(totalAll)}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{advances.length} records</div>
          </div>
          <div style={{ padding: '16px', background: '#fffbeb', borderRadius: '12px', border: '1px solid #fde68a' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, opacity: 0.7, textTransform: 'uppercase' }}>Pending</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#d97706' }}>{formatPKR(totalPending)}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{advances.filter(a => !a.is_deducted).length} records</div>
          </div>
          <div style={{ padding: '16px', background: '#f0fdf4', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, opacity: 0.7, textTransform: 'uppercase' }}>Deducted</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#16a34a' }}>{formatPKR(totalDeducted)}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{advances.filter(a => a.is_deducted).length} records</div>
          </div>
          <div style={{ padding: '16px', background: '#fef2f2', borderRadius: '12px', border: '1px solid #fecaca' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, opacity: 0.7, textTransform: 'uppercase' }}>Active Employees</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#16a34a' }}>{activeEmployees.length}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Can receive advances</div>
          </div>
        </div>

        <div style={{ marginBottom: '16px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Showing {filteredAdvances.length} of {advances.length} advances
          {statusFilter === "PENDING" && " (Pending only)"}
          {statusFilter === "DEDUCTED" && " (Deducted only)"}
        </div>

        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Amount</th>
                <th>Date</th>
                <th>Status</th>
                <th>Remarks</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAdvances.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    {statusFilter === "ALL" && "No advance records found."}
                    {statusFilter === "PENDING" && "All advances have been deducted."}
                    {statusFilter === "DEDUCTED" && "No advances have been deducted yet."}
                  </td>
                </tr>
              ) : (
                filteredAdvances.map(adv => {
                  const employee = employees.find(e => e.id === adv.employee);
                  const user = users.find(u => u.id === employee?.user);
                  const isEmployeeActive = user?.is_active === true;
                  const isPending = !adv.is_deducted;
                  
                  return (
                    <tr key={adv.id} style={{ opacity: isEmployeeActive ? 1 : 0.5 }}>
                      <td>
                        <b>{adv.employee_name}</b>
                        {employee && (
                          <>
                            <br/>
                            <small>{employee.designation}</small>
                          </>
                        )}
                        {!isEmployeeActive && (
                          <>
                            <br/>
                            <span className="badge badge-danger" style={{ fontSize: '0.6rem' }}>INACTIVE</span>
                          </>
                        )}
                      </td>
                      <td style={{ color: 'var(--danger)', fontWeight: 700 }}>{formatPKR(adv.amount)}</td>
                      <td>{new Date(adv.date_given).toLocaleDateString()}</td>
                      <td>
                        <span className={`badge ${adv.is_deducted ? 'badge-success' : 'badge-warning'}`}>
                          {adv.is_deducted ? '✅ DEDUCTED' : '⏳ PENDING'}
                        </span>
                      </td>
                      <td>{adv.remarks || '—'}</td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                          {isPending && isManager && isEmployeeActive && (
                            <button 
                              onClick={() => handleMarkDeducted(adv.id)}
                              className="btn btn-success" 
                              style={{ padding: '4px 10px', fontSize: '0.7rem' }}
                            >
                              ✅ Approve
                            </button>
                          )}
                          {isPending && isManager && !isEmployeeActive && (
                            <span className="badge" style={{ fontSize: '0.6rem', background: '#fee2e2', color: '#dc2626' }}>
                              Cannot approve (Inactive)
                            </span>
                          )}
                          {!isPending && isManager && (
                            <button 
                              onClick={() => handleRevertDeduction(adv.id)}
                              className="btn btn-soft" 
                              style={{ padding: '4px 10px', fontSize: '0.7rem', background: '#fef3c7', color: '#92400e' }}
                            >
                              ↩️ Revert
                            </button>
                          )}
                          {isManager && (
                            <button 
                              onClick={() => handleDelete(adv.id)}
                              className="btn btn-soft" 
                              style={{ padding: '4px 10px', fontSize: '0.7rem', background: '#fee2e2', color: '#dc2626' }}
                            >
                              🗑️ Delete
                            </button>
                          )}
                          {isReadOnly && (
                            <span className="badge">Read Only</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {!isReadOnly && showForm && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: '90%', maxWidth: '450px', padding: '32px' }}>
            <h2 style={{ marginBottom: '20px' }}>Issue Advance</h2>
            <AdvanceForm 
              employees={activeEmployees}
              onSave={() => { setShowForm(false); loadData(); }} 
              onCancel={() => setShowForm(false)} 
            />
          </div>
        </div>
      )}
    </div>
  );
}

function AdvanceForm({ employees, onSave, onCancel }) {
  const [formData, setFormData] = useState({ 
    employee: "", 
    amount: "", 
    remarks: "",
    date_given: new Date().toISOString().split('T')[0]
  });
  
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try { 
      await api.post("payroll/advances/", formData); 
      onSave(); 
    } catch (err) { 
      console.error(err);
      alert("Failed to create advance. " + (err.response?.data?.detail || ""));
    } finally {
      setSubmitting(false);
    }
  };

  // Calculate employee's pending advances total
  const selectedEmployee = employees.find(e => e.id === parseInt(formData.employee));
  const pendingAdvances = selectedEmployee ? 
    selectedEmployee.pending_advances || 0 : 0;

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
      <div className="form-group">
        <label className="form-label">Employee <span style={{ color: 'var(--danger)' }}>*</span></label>
        <select 
          className="form-input" 
          required 
          value={formData.employee} 
          onChange={e => setFormData({...formData, employee: e.target.value})}
        >
          <option value="">Select Active Employee</option>
          {employees.length === 0 ? (
            <option value="" disabled>No active employees available</option>
          ) : (
            employees.map(emp => {
              const pending = emp.pending_advances || 0;
              return (
                <option key={emp.id} value={emp.id}>
                  {emp.full_name} ({emp.designation}) {pending > 0 ? `- Pending: ${formatPKR(pending)}` : ''}
                </option>
              );
            })
          )}
        </select>
        {employees.length === 0 && (
          <small style={{ color: 'var(--danger)' }}>⚠️ No active employees found. Please add active employees first.</small>
        )}
      </div>

      <div className="form-group">
        <label className="form-label">Amount (PKR) <span style={{ color: 'var(--danger)' }}>*</span></label>
        <input 
          type="number" 
          className="form-input" 
          placeholder="Enter amount" 
          required 
          min="0"
          step="0.01"
          value={formData.amount} 
          onChange={e => setFormData({...formData, amount: e.target.value})} 
        />
      </div>

      <div className="form-group">
        <label className="form-label">Date Given <span style={{ color: 'var(--danger)' }}>*</span></label>
        <input 
          type="date" 
          className="form-input" 
          required 
          value={formData.date_given} 
          onChange={e => setFormData({...formData, date_given: e.target.value})} 
        />
      </div>

      <div className="form-group">
        <label className="form-label">Remarks / Reason</label>
        <textarea 
          className="form-input" 
          placeholder="Reason for advance (optional)" 
          rows="2"
          value={formData.remarks} 
          onChange={e => setFormData({...formData, remarks: e.target.value})} 
        />
      </div>

      {selectedEmployee && pendingAdvances > 0 && (
        <div style={{ 
          padding: '10px 12px', 
          background: '#fffbeb', 
          borderRadius: '8px', 
          border: '1px solid #fde68a',
          fontSize: '0.85rem'
        }}>
          ⚠️ This employee has <strong>{formatPKR(pendingAdvances)}</strong> in pending advances.
        </div>
      )}

      <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
        <button 
          type="submit" 
          className="btn btn-primary" 
          style={{ flex: 1 }} 
          disabled={submitting || employees.length === 0}
        >
          {submitting ? "Processing..." : "Confirm Advance"}
        </button>
        <button type="button" onClick={onCancel} className="btn btn-soft" style={{ flex: 1 }}>Cancel</button>
      </div>
    </form>
  );
}