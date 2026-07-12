// src/pages/AdvanceLedgerPage.js
import React, { useEffect, useState, useContext } from "react";
import api from "../api";
import { AuthContext } from "../AuthContext";
import { formatPKR } from "../utils/formatPKR";

export default function AdvanceLedgerPage() {
  const { user } = useContext(AuthContext);
  const isReadOnly = user?.role === 'PARTNER';

  const [advances, setAdvances] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [advRes, empRes] = await Promise.all([api.get("payroll/advances/"), api.get("payroll/employees/")]);
      setAdvances(advRes.data.results || advRes.data);
      setEmployees(empRes.data.results || empRes.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  return (
    <div className="page management-page">
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ margin: 0 }}>Advance Disbursement Log</h2>
          {!isReadOnly && <button onClick={() => setShowForm(true)} className="btn btn-primary">💸 Give Advance</button>}
        </div>

        <div className="table-wrapper">
          <table className="table">
            <thead><tr><th>Employee</th><th>Amount</th><th>Date</th><th>Status</th><th>Remarks</th></tr></thead>
            <tbody>
              {advances.map(adv => (
                <tr key={adv.id}>
                  <td><b>{adv.employee_name}</b></td>
                  <td style={{ color: 'var(--danger)', fontWeight: 700 }}>{formatPKR(adv.amount)}</td>
                  <td>{new Date(adv.date_given).toLocaleDateString()}</td>
                  <td><span className={`badge ${adv.is_deducted ? 'badge-success' : 'badge-warning'}`}>{adv.is_deducted ? 'DEDUCTED' : 'PENDING'}</span></td>
                  <td>{adv.remarks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {!isReadOnly && showForm && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: '90%', maxWidth: '400px' }}>
             <h2>Issue Advance</h2>
             <AdvanceForm employees={employees} onSave={() => { setShowForm(false); loadData(); }} onCancel={() => setShowForm(false)} />
          </div>
        </div>
      )}
    </div>
  );
}

function AdvanceForm({ employees, onSave, onCancel }) {
  const [formData, setFormData] = useState({ employee: "", amount: "", remarks: "" });
  const handleSubmit = async (e) => {
    e.preventDefault();
    try { await api.post("payroll/advances/", formData); onSave(); }
    catch (err) { alert("Failed."); }
  };
  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
      <select className="form-input" required onChange={e => setFormData({...formData, employee: e.target.value})}><option value="">Select</option>{employees.map(emp => <option key={emp.id} value={emp.id}>{emp.full_name}</option>)}</select>
      <input type="number" className="form-input" placeholder="Amount" required onChange={e => setFormData({...formData, amount: e.target.value})} />
      <textarea className="form-input" placeholder="Reason" onChange={e => setFormData({...formData, remarks: e.target.value})} />
      <div style={{ display: 'flex', gap: '10px' }}><button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Confirm</button><button type="button" onClick={onCancel} className="btn btn-soft" style={{ flex: 1 }}>Cancel</button></div>
    </form>
  );
}
