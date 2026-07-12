// src/pages/EmployeeProfilePage.js
import React, { useEffect, useState, useContext } from "react";
import api from "../api";
import { AuthContext } from "../AuthContext";

export default function EmployeeProfilePage() {
  const { user: currentUser } = useContext(AuthContext);
  const isReadOnly = currentUser?.role === 'PARTNER';

  const [employees, setEmployees] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [empRes, userRes] = await Promise.all([api.get("payroll/employees/"), api.get("users/")]);
      setEmployees(empRes.data.results || empRes.data);
      setUsers((userRes.data.results || userRes.data).filter(u => u.role !== 'STUDENT'));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  if (loading) return <p>Syncing...</p>;

  return (
    <div className="page management-page">
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div><h2 style={{ margin: 0 }}>Active Personnel</h2><p className="card-subtext">Manage staff compensation packages.</p></div>
          {!isReadOnly && <button onClick={() => { setEditingEmployee(null); setShowModal(true); }} className="btn btn-primary">➕ Register Employee</button>}
        </div>

        <div className="table-wrapper">
          <table className="table">
            <thead><tr><th>Name</th><th>Designation</th><th>Pay Type</th><th>Salary</th><th>Branch</th><th style={{ textAlign: 'right' }}>Actions</th></tr></thead>
            <tbody>
              {employees.map(emp => (
                <tr key={emp.id}>
                  <td><b>{emp.full_name}</b><br/><small>{emp.username}</small></td>
                  <td>{emp.designation}</td>
                  <td><span className="badge badge-soft">{emp.pay_type}</span></td>
                  <td style={{ fontWeight: 700 }}>Rs {parseFloat(emp.base_salary).toLocaleString()}</td>
                  <td>{emp.hostel_name || 'Global'}</td>
                  <td style={{ textAlign: 'right' }}>
                    {!isReadOnly && <button onClick={() => { setEditingEmployee(emp); setShowModal(true); }} className="btn btn-soft" style={{ padding: '6px 12px', fontSize: '0.75rem' }}>🛠️ Edit</button>}
                    {isReadOnly && <span className="badge">Read Only</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {!isReadOnly && showModal && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: '95%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', padding: '32px' }}>
             <h2>{editingEmployee ? `Edit: ${editingEmployee.full_name}` : "Register New"}</h2>
             <EmployeeForm users={users} employee={editingEmployee} onSave={() => { setShowModal(false); loadData(); }} onCancel={() => setShowModal(false)} />
          </div>
        </div>
      )}
    </div>
  );
}

function EmployeeForm({ users, employee, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    user: employee?.user || "", designation: employee?.designation || "", pay_type: employee?.pay_type || "MONTHLY",
    base_salary: employee?.base_salary || 0, housing_allowance: employee?.housing_allowance || 0, fuel_allowance: employee?.fuel_allowance || 0,
    rate_per_task: employee?.rate_per_task || 0, bank_name: employee?.bank_name || "", iban: employee?.iban || ""
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (employee) await api.patch(`payroll/employees/${employee.id}/`, formData);
      else await api.post("payroll/employees/", formData);
      onSave();
    } catch (err) { alert("Action failed."); }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div className="form-group"><label className="form-label">Link User</label><select className="form-input" disabled={!!employee} required value={formData.user} onChange={e => setFormData({...formData, user: e.target.value})}><option value="">Select</option>{users.map(u => <option key={u.id} value={u.id}>{u.username}</option>)}</select></div>
        <div className="form-group"><label className="form-label">Job Designation</label><input className="form-input" required value={formData.designation} onChange={e => setFormData({...formData, designation: e.target.value})} /></div>
      </div>
      <div style={{ display: 'flex', gap: '12px' }}><button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Save</button><button type="button" onClick={onCancel} className="btn btn-soft" style={{ flex: 1 }}>Cancel</button></div>
    </form>
  );
}
